import { Router } from 'express';
import Trip from '../models/Trip.js';
import TripEvent from '../models/TripEvent.js';
import Vehicle from '../models/Vehicle.js';
import Notification from '../models/Notification.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// List trips with filters
router.get('/', async (req, res) => {
  try {
    const { date, status, driver } = req.query;
    const filter = {};

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }
    if (status) filter.status = status;
    if (driver) filter.driver = driver;

    // Drivers only see their own trips
    if (req.user.role === 'driver') {
      filter.driver = req.user._id;
    }

    // Passengers only see trips they're in
    if (req.user.role === 'passenger') {
      filter['passengers.user'] = req.user._id;
    }

    const trips = await Trip.find(filter)
      .populate('driver', 'name phone lastLocation')
      .populate('vehicle', 'name type licensePlate')
      .populate('passengers.user', 'name phone')
      .sort({ date: 1, 'passengers.pickupTime': 1 });

    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single trip with events
router.get('/:id', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('driver', 'name phone lastLocation')
      .populate('vehicle', 'name type licensePlate capacity')
      .populate('passengers.user', 'name phone');

    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const events = await TripEvent.find({ trip: trip._id })
      .populate('actor', 'name role')
      .sort({ timestamp: 1 });

    res.json({ trip, events });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create trip
router.post('/', authorize('coordinator'), async (req, res) => {
  try {
    const trip = await Trip.create(req.body);

    await TripEvent.create({
      trip: trip._id,
      type: 'created',
      actor: req.user._id,
      details: `Trip "${trip.title}" created`
    });

    const populated = await Trip.findById(trip._id)
      .populate('driver', 'name phone')
      .populate('vehicle', 'name type licensePlate')
      .populate('passengers.user', 'name phone');

    // Emit real-time update
    const io = req.app.get('io');
    io.to('coordinators').emit('trip:created', populated);

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update trip
router.put('/:id', authorize('coordinator'), async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('driver', 'name phone')
      .populate('vehicle', 'name type licensePlate')
      .populate('passengers.user', 'name phone');

    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const io = req.app.get('io');
    io.to(`trip:${trip._id}`).emit('trip:updated', trip);
    io.to('coordinators').emit('trip:updated', trip);

    res.json(trip);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete (cancel) trip
router.delete('/:id', authorize('coordinator'), async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    // Free up the vehicle
    if (trip.vehicle) {
      await Vehicle.findByIdAndUpdate(trip.vehicle, { status: 'available' });
    }

    await TripEvent.create({
      trip: trip._id,
      type: 'cancelled',
      actor: req.user._id,
      details: 'Trip cancelled'
    });

    // Notify driver
    if (trip.driver) {
      const notification = await Notification.create({
        user: trip.driver,
        type: 'trip-updated',
        title: 'Trip Cancelled',
        message: `Trip "${trip.title}" has been cancelled`,
        trip: trip._id
      });
      const io = req.app.get('io');
      io.to(`user:${trip.driver}`).emit('notification:new', notification);
    }

    res.json({ message: 'Trip cancelled' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Assign driver + vehicle to trip
router.put('/:id/assign', authorize('coordinator'), async (req, res) => {
  try {
    const { driverId, vehicleId } = req.body;
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    // If previously assigned vehicle, free it
    if (trip.vehicle) {
      await Vehicle.findByIdAndUpdate(trip.vehicle, { status: 'available' });
    }

    // Mark new vehicle as in-use
    if (vehicleId) {
      await Vehicle.findByIdAndUpdate(vehicleId, { status: 'in-use' });
    }

    const previousDriver = trip.driver;
    trip.driver = driverId;
    trip.vehicle = vehicleId;
    trip.status = 'assigned';
    await trip.save();

    const eventType = previousDriver ? 'reassigned' : 'assigned';
    await TripEvent.create({
      trip: trip._id,
      type: eventType,
      actor: req.user._id,
      details: `Trip ${eventType} to driver`
    });

    // Notify the driver
    const notification = await Notification.create({
      user: driverId,
      type: 'trip-assigned',
      title: 'New Trip Assigned',
      message: `You've been assigned to "${trip.title}"`,
      trip: trip._id
    });

    const io = req.app.get('io');
    io.to(`user:${driverId}`).emit('notification:new', notification);
    io.to(`user:${driverId}`).emit('trip:assigned', trip);

    // Notify passengers
    for (const passenger of trip.passengers) {
      if (passenger.user) {
        const pNotif = await Notification.create({
          user: passenger.user,
          type: 'trip-assigned',
          title: 'Driver Assigned',
          message: `A driver has been assigned for your trip "${trip.title}"`,
          trip: trip._id
        });
        io.to(`user:${passenger.user}`).emit('notification:new', pNotif);
      }
    }

    const populated = await Trip.findById(trip._id)
      .populate('driver', 'name phone')
      .populate('vehicle', 'name type licensePlate')
      .populate('passengers.user', 'name phone');

    io.to('coordinators').emit('trip:updated', populated);

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update trip status (driver swipe)
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status, location, passengerId } = req.body;
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    // Map swipe status to trip event type
    const statusEventMap = {
      'driver-departed': 'driver-departed',
      'arrived-pickup': 'arrived-pickup',
      'passenger-picked-up': 'passenger-picked-up',
      'arrived-destination': 'arrived-destination',
      'in-progress': 'passenger-picked-up',
      'completed': 'completed'
    };

    trip.status = status;

    // Update individual passenger status if provided
    if (passengerId && (status === 'passenger-picked-up' || status === 'in-progress')) {
      const passenger = trip.passengers.id(passengerId);
      if (passenger) passenger.status = 'picked-up';
    }
    if (passengerId && status === 'arrived-destination') {
      const passenger = trip.passengers.id(passengerId);
      if (passenger) passenger.status = 'dropped-off';
    }

    // On completion, free up the vehicle
    if (status === 'completed' && trip.vehicle) {
      await Vehicle.findByIdAndUpdate(trip.vehicle, { status: 'available' });
    }

    await trip.save();

    await TripEvent.create({
      trip: trip._id,
      type: statusEventMap[status] || status,
      actor: req.user._id,
      location,
      details: `Status updated to ${status}`
    });

    // Notify passengers about driver status
    const passengerNotifTypes = {
      'driver-departed': { type: 'driver-on-way', title: 'Driver On The Way', msg: 'Your driver is on the way!' },
      'arrived-pickup': { type: 'driver-arrived', title: 'Driver Arrived', msg: 'Your driver has arrived at the pickup point!' }
    };

    const notifInfo = passengerNotifTypes[status];
    if (notifInfo) {
      const io = req.app.get('io');
      for (const passenger of trip.passengers) {
        if (passenger.user) {
          const pNotif = await Notification.create({
            user: passenger.user,
            type: notifInfo.type,
            title: notifInfo.title,
            message: notifInfo.msg,
            trip: trip._id
          });
          io.to(`user:${passenger.user}`).emit('notification:new', pNotif);
        }
      }
    }

    const populated = await Trip.findById(trip._id)
      .populate('driver', 'name phone')
      .populate('vehicle', 'name type licensePlate')
      .populate('passengers.user', 'name phone');

    const io = req.app.get('io');
    io.to(`trip:${trip._id}`).emit('trip:updated', populated);
    io.to('coordinators').emit('trip:updated', populated);

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get trip events (timeline)
router.get('/:id/events', async (req, res) => {
  try {
    const events = await TripEvent.find({ trip: req.params.id })
      .populate('actor', 'name role')
      .sort({ timestamp: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk status update
router.put('/bulk/status', authorize('coordinator'), async (req, res) => {
  try {
    const { tripIds, status } = req.body;
    if (!tripIds?.length) return res.status(400).json({ message: 'tripIds required' });
    await Trip.updateMany({ _id: { $in: tripIds } }, { status });
    if (status === 'cancelled') {
      const trips = await Trip.find({ _id: { $in: tripIds } });
      for (const trip of trips) {
        if (trip.vehicle) await Vehicle.findByIdAndUpdate(trip.vehicle, { status: 'available' });
      }
    }
    res.json({ message: `${tripIds.length} trips updated to ${status}` });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Search trips
router.get('/search/query', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const trips = await Trip.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { notes: { $regex: q, $options: 'i' } },
        { 'passengers.name': { $regex: q, $options: 'i' } },
        { 'passengers.pickupAddress': { $regex: q, $options: 'i' } }
      ]
    }).populate('driver', 'name phone').populate('vehicle', 'name type').sort({ date: -1 }).limit(20);
    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update trip costs
router.put('/:id/costs', authorize('coordinator'), async (req, res) => {
  try {
    const { mileage, fuelCost, driverHours, driverRate, tolls, extras } = req.body;
    const total = (fuelCost || 0) + ((driverHours || 0) * (driverRate || 0)) + (tolls || 0) + (extras || 0);
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { cost: { mileage, fuelCost, driverHours, driverRate, tolls, extras, total } },
      { new: true }
    );
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    res.json(trip);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
