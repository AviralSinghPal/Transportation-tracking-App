import { Router } from 'express';
import LocationHistory from '../models/LocationHistory.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Get location history for a driver (coordinator only)
router.get('/:driverId/history', authorize('coordinator'), async (req, res) => {
  try {
    const { from, to, limit: maxResults } = req.query;
    const filter = { driver: req.params.driverId };
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    const locations = await LocationHistory.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(maxResults) || 500);
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get trail for a specific ride
router.get('/:driverId/trail', authorize('coordinator'), async (req, res) => {
  try {
    const { rideRequestId, tripId } = req.query;
    const filter = { driver: req.params.driverId };
    if (rideRequestId) filter.rideRequest = rideRequestId;
    if (tripId) filter.trip = tripId;

    const trail = await LocationHistory.find(filter)
      .sort({ timestamp: 1 })
      .limit(2000);
    res.json(trail);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all currently active drivers with recent trail (last 5 min)
router.get('/active/all', authorize('coordinator'), async (req, res) => {
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const drivers = await User.find({
      role: 'driver',
      'lastLocation.updatedAt': { $gte: fiveMinAgo }
    }).select('name phone lastLocation isAvailable permanentAllocation');

    // Get last 5 min trail for each active driver
    const driverIds = drivers.map(d => d._id);
    const trails = await LocationHistory.find({
      driver: { $in: driverIds },
      timestamp: { $gte: fiveMinAgo }
    }).sort({ timestamp: 1 });

    // Group trails by driver
    const trailMap = {};
    for (const point of trails) {
      const did = point.driver.toString();
      if (!trailMap[did]) trailMap[did] = [];
      trailMap[did].push({ lat: point.lat, lng: point.lng, timestamp: point.timestamp });
    }

    const result = drivers.map(d => ({
      ...d.toObject(),
      trail: trailMap[d._id.toString()] || []
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get ETA for a ride request
router.get('/eta/:rideRequestId', async (req, res) => {
  try {
    const { calculateETA } = await import('../services/googleMaps.js');
    const RideRequest = (await import('../models/RideRequest.js')).default;

    const ride = await RideRequest.findById(req.params.rideRequestId)
      .populate('assignedDriver', 'lastLocation');

    if (!ride || !ride.assignedDriver?.lastLocation) {
      return res.json({ eta: null, distance: null });
    }

    const driverLoc = ride.assignedDriver.lastLocation;
    // For now, use a geocoded estimate — in production, you'd geocode pickupLocation
    // Using LA coords as fallback
    const eta = await calculateETA(
      driverLoc.lat, driverLoc.lng,
      34.0522, -118.2437 // fallback — would need geocoding for real addresses
    );

    res.json(eta);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
