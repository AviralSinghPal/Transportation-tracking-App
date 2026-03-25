import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import RideRequest from '../models/RideRequest.js';
import LocationHistory from '../models/LocationHistory.js';
import Geofence from '../models/Geofence.js';
import Notification from '../models/Notification.js';
import { isInsideCircle, isInsidePolygon, calculateETA } from '../services/googleMaps.js';

// Batch location writes for performance
const locationBatch = [];
const BATCH_SIZE = 5;
const BATCH_FLUSH_INTERVAL = 10000; // 10 seconds

async function flushLocationBatch() {
  if (locationBatch.length === 0) return;
  const toInsert = locationBatch.splice(0, locationBatch.length);
  try {
    await LocationHistory.insertMany(toInsert, { ordered: false });
  } catch (err) {
    console.error('Batch location insert error:', err.message);
  }
}

// Flush batch periodically
setInterval(flushLocationBatch, BATCH_FLUSH_INTERVAL);

// Track driver geofence states (driverId → Set of geofenceIds they're inside)
const driverGeofenceState = {};

// Track last ETA calculation time per ride
const lastETACalc = {};
const ETA_CALC_INTERVAL = 30000; // 30 seconds

// Track last location timestamp per driver (for offline detection)
const driverLastSeen = {};
const OFFLINE_CHECK_INTERVAL = 30000;
const SIGNAL_LOST_THRESHOLD = 60000; // 60 seconds
const OFFLINE_THRESHOLD = 300000; // 5 minutes

export function setupSocket(io) {
  // Authenticate socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // Offline detection interval
  setInterval(() => {
    const now = Date.now();
    for (const [driverId, lastSeen] of Object.entries(driverLastSeen)) {
      const elapsed = now - lastSeen;
      if (elapsed > OFFLINE_THRESHOLD) {
        io.to('coordinators').emit('driver:offline', { driverId, type: 'offline', lastSeen: new Date(lastSeen) });
        delete driverLastSeen[driverId];
      } else if (elapsed > SIGNAL_LOST_THRESHOLD) {
        io.to('coordinators').emit('driver:offline', { driverId, type: 'signal-lost', lastSeen: new Date(lastSeen) });
      }
    }
  }, OFFLINE_CHECK_INTERVAL);

  io.on('connection', (socket) => {
    console.log(`Connected: ${socket.user.name} (${socket.user.role})`);

    // Join user's personal room for notifications
    socket.join(`user:${socket.user._id}`);

    // Coordinators join the coordinator room
    if (socket.user.role === 'coordinator') {
      socket.join('coordinators');
    }

    // Driver location updates
    socket.on('driver:location', async (data) => {
      if (socket.user.role !== 'driver') return;

      const { lat, lng, speed, heading, accuracy, batteryLevel } = data;
      const driverId = socket.user._id;

      // Update last seen for offline detection
      driverLastSeen[driverId.toString()] = Date.now();

      // Update driver's last known location in DB
      await User.findByIdAndUpdate(driverId, {
        lastLocation: { lat, lng, updatedAt: new Date() }
      });

      const locationPayload = {
        driverId,
        name: socket.user.name,
        lat, lng,
        speed: speed || 0,
        heading: heading || 0,
        accuracy: accuracy || 0,
        batteryLevel: batteryLevel || null,
        timestamp: new Date()
      };

      // Broadcast to all coordinators
      io.to('coordinators').emit('driver:location-update', locationPayload);

      // Find active ride for this driver (for location history linking)
      let activeRideId = null;
      let activeTripId = null;
      try {
        const activeRide = await RideRequest.findOne({
          assignedDriver: driverId,
          status: { $in: ['assigned', 'in-progress'] }
        }).select('_id requester trip');

        if (activeRide) {
          activeRideId = activeRide._id;
          activeTripId = activeRide.trip;

          // Broadcast to passenger tracking this driver
          io.to(`user:${activeRide.requester}`).emit('driver:location-update', locationPayload);

          // Auto-recalculate ETA (throttled)
          const now = Date.now();
          const rideKey = activeRide._id.toString();
          if (!lastETACalc[rideKey] || now - lastETACalc[rideKey] > ETA_CALC_INTERVAL) {
            lastETACalc[rideKey] = now;
            try {
              const eta = await calculateETA(lat, lng, 34.0522, -118.2437); // fallback coords
              if (eta) {
                await RideRequest.findByIdAndUpdate(activeRide._id, { eta: Math.ceil(eta.duration) });
                io.to(`user:${activeRide.requester}`).emit('ride:eta-update', {
                  rideId: activeRide._id,
                  eta: Math.ceil(eta.duration),
                  distance: eta.distance,
                  durationText: eta.durationText,
                  distanceText: eta.distanceText
                });
              }
            } catch (e) { /* ETA calc failed, non-critical */ }
          }
        }

        // Broadcast to driver tracking room
        io.to(`tracking:driver:${driverId}`).emit('driver:location-update', locationPayload);
      } catch (err) {
        console.error('Error broadcasting to passengers:', err.message);
      }

      // Save to location history (batched)
      locationBatch.push({
        driver: driverId,
        lat, lng, speed: speed || 0, heading: heading || 0,
        accuracy: accuracy || 0, batteryLevel,
        rideRequest: activeRideId,
        trip: activeTripId,
        timestamp: new Date()
      });
      if (locationBatch.length >= BATCH_SIZE) flushLocationBatch();

      // Geofence checking
      try {
        const geofences = await Geofence.find({ isActive: true });
        const driverKey = driverId.toString();
        if (!driverGeofenceState[driverKey]) driverGeofenceState[driverKey] = new Set();

        for (const gf of geofences) {
          const gfId = gf._id.toString();
          const wasInside = driverGeofenceState[driverKey].has(gfId);
          let isInside = false;

          if (gf.type === 'circle') {
            isInside = isInsideCircle(lat, lng, gf.center.lat, gf.center.lng, gf.radius);
          } else if (gf.type === 'polygon' && gf.polygon.length >= 3) {
            isInside = isInsidePolygon(lat, lng, gf.polygon);
          }

          if (isInside && !wasInside && gf.triggers.onEnter) {
            driverGeofenceState[driverKey].add(gfId);
            const event = { driverId, driverName: socket.user.name, geofenceId: gfId, geofenceName: gf.name, type: 'enter', timestamp: new Date() };
            if (gf.triggers.notifyCoordinator) {
              io.to('coordinators').emit('geofence:trigger', event);
              await Notification.create({
                user: null, // broadcast
                type: 'geofence',
                title: `${socket.user.name} entered ${gf.name}`,
                message: `Driver ${socket.user.name} has entered the ${gf.name} zone.`
              });
            }
          } else if (!isInside && wasInside && gf.triggers.onExit) {
            driverGeofenceState[driverKey].delete(gfId);
            const event = { driverId, driverName: socket.user.name, geofenceId: gfId, geofenceName: gf.name, type: 'exit', timestamp: new Date() };
            if (gf.triggers.notifyCoordinator) {
              io.to('coordinators').emit('geofence:trigger', event);
            }
          }
        }
      } catch (err) {
        // Geofence check failed, non-critical
      }
    });

    // Join a specific trip room
    socket.on('trip:join', (tripId) => {
      socket.join(`trip:${tripId}`);
    });

    socket.on('trip:leave', (tripId) => {
      socket.leave(`trip:${tripId}`);
    });

    // Track a specific driver (for passengers viewing the tracking page)
    socket.on('track:driver', (driverId) => {
      socket.join(`tracking:driver:${driverId}`);
    });

    socket.on('track:driver:stop', (driverId) => {
      socket.leave(`tracking:driver:${driverId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Disconnected: ${socket.user.name}`);
      // Don't immediately remove from driverLastSeen — let the timeout handle offline detection
    });
  });
}

// Helper to emit notifications
export function emitNotification(io, userId, notification) {
  io.to(`user:${userId}`).emit('notification:new', notification);
}

export function emitTripUpdate(io, tripId, data) {
  io.to(`trip:${tripId}`).emit('trip:updated', data);
  io.to('coordinators').emit('trip:updated', data);
}
