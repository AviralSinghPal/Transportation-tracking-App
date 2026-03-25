import { Router } from 'express';
import PermanentTrip from '../models/PermanentTrip.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(authorize('coordinator'));

// Helper: release driver flags
async function releaseDriver(driverId) {
  if (!driverId) return;
  await User.findByIdAndUpdate(driverId, {
    permanentTrip: null,
    isTripAssigned: false
  });
}

// Helper: release vehicle flags
async function releaseVehicle(vehicleId) {
  if (!vehicleId) return;
  await Vehicle.findByIdAndUpdate(vehicleId, {
    allocationType: 'available',
    permanentTrip: null
  });
}

// Helper: assign driver flags
async function assignDriver(driverId, tripId) {
  if (!driverId) return;
  await User.findByIdAndUpdate(driverId, {
    permanentTrip: tripId,
    isTripAssigned: true
  });
}

// Helper: assign vehicle flags
async function assignVehicle(vehicleId, tripId) {
  if (!vehicleId) return;
  await Vehicle.findByIdAndUpdate(vehicleId, {
    allocationType: 'permanent',
    permanentTrip: tripId
  });
}

// FR-1: List all permanent trips (exclude soft-deleted)
router.get('/', async (req, res) => {
  try {
    const filter = { deletedAt: null };
    if (req.query.status) filter.status = req.query.status;

    const trips = await PermanentTrip.find(filter)
      .populate('driver', 'name phone isAvailable')
      .populate('vehicle', 'name type licensePlate capacity')
      .populate('passengers.user', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// FR-1: Get single permanent trip
router.get('/:id', async (req, res) => {
  try {
    const trip = await PermanentTrip.findById(req.params.id)
      .populate('driver', 'name phone isAvailable lastLocation')
      .populate('vehicle', 'name type licensePlate capacity status')
      .populate('passengers.user', 'name phone')
      .populate('createdBy', 'name')
      .populate('swapHistory.swappedBy', 'name');

    if (!trip || trip.deletedAt) return res.status(404).json({ message: 'Trip not found' });
    res.json(trip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// FR-1, FR-3: Create a permanent trip (can be draft without driver/vehicle)
router.post('/', async (req, res) => {
  try {
    const {
      title, pickupLocation, pickupCoordinates, dropoffLocation, dropoffCoordinates,
      scheduledTime, driverId, vehicleId, passengers, startDate, endDate,
      activeDays, isFullDayTrip, isSelfManaged, notes, status
    } = req.body;

    if (!pickupLocation?.trim() || !dropoffLocation?.trim()) {
      return res.status(400).json({ message: 'Pickup and dropoff locations are required' });
    }
    if (!scheduledTime) {
      return res.status(400).json({ message: 'Scheduled time is required' });
    }
    if (!startDate) {
      return res.status(400).json({ message: 'Start date is required' });
    }

    // FR-2: Check driver exclusivity
    if (driverId) {
      const existingTrip = await PermanentTrip.findOne({
        driver: driverId,
        status: { $in: ['active', 'draft'] },
        deletedAt: null
      });
      if (existingTrip) {
        return res.status(400).json({
          message: `This driver is already assigned to permanent trip "${existingTrip.title || 'Untitled'}". Release them first.`
        });
      }
    }

    const tripStatus = status || (driverId ? 'active' : 'draft');

    const trip = await PermanentTrip.create({
      title: title?.trim() || `PA: ${pickupLocation} → ${dropoffLocation}`,
      pickupLocation: pickupLocation.trim(),
      pickupCoordinates,
      dropoffLocation: dropoffLocation.trim(),
      dropoffCoordinates,
      scheduledTime,
      driver: driverId || null,
      vehicle: vehicleId || null,
      passengers: passengers || [],
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      activeDays: activeDays || [1, 2, 3, 4, 5],
      isFullDayTrip: isFullDayTrip || false,
      isSelfManaged: isSelfManaged || false,
      isDriverAssigned: !!driverId,
      isVehicleAssigned: !!vehicleId,
      status: tripStatus,
      createdBy: req.user._id,
      notes: notes?.trim() || ''
    });

    // Update driver/vehicle flags
    if (driverId) await assignDriver(driverId, trip._id);
    if (vehicleId) await assignVehicle(vehicleId, trip._id);

    const populated = await PermanentTrip.findById(trip._id)
      .populate('driver', 'name phone')
      .populate('vehicle', 'name type licensePlate capacity')
      .populate('passengers.user', 'name')
      .populate('createdBy', 'name');

    // Notify
    const io = req.app.get('io');
    io.to('coordinators').emit('permanentTrip:created', populated);
    if (driverId) {
      io.to(`user:${driverId}`).emit('notification:new', {
        type: 'trip-assigned',
        title: 'Permanent Trip Assigned',
        message: `You've been assigned to: ${trip.title}`
      });
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// FR-4: Update a permanent trip (general fields)
router.put('/:id', async (req, res) => {
  try {
    const trip = await PermanentTrip.findById(req.params.id);
    if (!trip || trip.deletedAt) return res.status(404).json({ message: 'Trip not found' });

    const {
      title, pickupLocation, pickupCoordinates, dropoffLocation, dropoffCoordinates,
      scheduledTime, startDate, endDate, activeDays, isFullDayTrip, isSelfManaged,
      notes, status
    } = req.body;

    if (title !== undefined) trip.title = title.trim();
    if (pickupLocation !== undefined) trip.pickupLocation = pickupLocation.trim();
    if (pickupCoordinates !== undefined) trip.pickupCoordinates = pickupCoordinates;
    if (dropoffLocation !== undefined) trip.dropoffLocation = dropoffLocation.trim();
    if (dropoffCoordinates !== undefined) trip.dropoffCoordinates = dropoffCoordinates;
    if (scheduledTime !== undefined) trip.scheduledTime = scheduledTime;
    if (startDate !== undefined) trip.startDate = new Date(startDate);
    if (endDate !== undefined) trip.endDate = endDate ? new Date(endDate) : null;
    if (activeDays !== undefined) trip.activeDays = activeDays;
    if (isFullDayTrip !== undefined) trip.isFullDayTrip = isFullDayTrip;
    if (isSelfManaged !== undefined) trip.isSelfManaged = isSelfManaged;
    if (notes !== undefined) trip.notes = notes.trim();
    if (status !== undefined) trip.status = status;

    await trip.save();

    const populated = await PermanentTrip.findById(trip._id)
      .populate('driver', 'name phone')
      .populate('vehicle', 'name type licensePlate capacity')
      .populate('passengers.user', 'name')
      .populate('createdBy', 'name');

    const io = req.app.get('io');
    io.to('coordinators').emit('permanentTrip:updated', populated);

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// FR-4, FR-5, FR-6: Swap driver on a permanent trip
router.put('/:id/swap-driver', async (req, res) => {
  try {
    const { newDriverId, reason } = req.body;
    const trip = await PermanentTrip.findById(req.params.id);
    if (!trip || trip.deletedAt) return res.status(404).json({ message: 'Trip not found' });

    // FR-2: Check new driver exclusivity
    if (newDriverId) {
      const existingTrip = await PermanentTrip.findOne({
        driver: newDriverId,
        status: { $in: ['active', 'draft'] },
        deletedAt: null,
        _id: { $ne: trip._id }
      });
      if (existingTrip) {
        return res.status(400).json({
          message: `This driver is already assigned to "${existingTrip.title}". Release them first.`
        });
      }
    }

    const previousDriverId = trip.driver;

    // FR-5: Release old driver flags
    await releaseDriver(previousDriverId);

    // Record swap
    trip.swapHistory.push({
      type: 'driver',
      previousId: previousDriverId,
      newId: newDriverId || null,
      reason: reason?.trim() || '',
      swappedBy: req.user._id
    });

    trip.driver = newDriverId || null;
    trip.isDriverAssigned = !!newDriverId;
    if (!newDriverId && trip.status === 'active') trip.status = 'draft';

    await trip.save();

    // Assign new driver
    if (newDriverId) await assignDriver(newDriverId, trip._id);

    const populated = await PermanentTrip.findById(trip._id)
      .populate('driver', 'name phone')
      .populate('vehicle', 'name type licensePlate capacity')
      .populate('createdBy', 'name');

    const io = req.app.get('io');
    io.to('coordinators').emit('permanentTrip:updated', populated);

    // Notify drivers
    if (previousDriverId) {
      io.to(`user:${previousDriverId}`).emit('notification:new', {
        type: 'trip-assigned', title: 'Trip Reassigned',
        message: `You've been removed from permanent trip: ${trip.title}`
      });
    }
    if (newDriverId) {
      io.to(`user:${newDriverId}`).emit('notification:new', {
        type: 'trip-assigned', title: 'Permanent Trip Assigned',
        message: `You've been assigned to: ${trip.title}`
      });
    }

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// FR-4, FR-6: Swap vehicle on a permanent trip
router.put('/:id/swap-vehicle', async (req, res) => {
  try {
    const { newVehicleId, reason } = req.body;
    const trip = await PermanentTrip.findById(req.params.id);
    if (!trip || trip.deletedAt) return res.status(404).json({ message: 'Trip not found' });

    const previousVehicleId = trip.vehicle;

    // FR-6: Release old vehicle — revert to available
    await releaseVehicle(previousVehicleId);

    trip.swapHistory.push({
      type: 'vehicle',
      previousId: previousVehicleId,
      newId: newVehicleId || null,
      reason: reason?.trim() || '',
      swappedBy: req.user._id
    });

    trip.vehicle = newVehicleId || null;
    trip.isVehicleAssigned = !!newVehicleId;

    await trip.save();

    if (newVehicleId) await assignVehicle(newVehicleId, trip._id);

    const populated = await PermanentTrip.findById(trip._id)
      .populate('driver', 'name phone')
      .populate('vehicle', 'name type licensePlate capacity')
      .populate('createdBy', 'name');

    const io = req.app.get('io');
    io.to('coordinators').emit('permanentTrip:updated', populated);

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// FR-9: Update passengers on a permanent trip
router.put('/:id/passengers', async (req, res) => {
  try {
    const { passengers } = req.body;
    const trip = await PermanentTrip.findById(req.params.id);
    if (!trip || trip.deletedAt) return res.status(404).json({ message: 'Trip not found' });

    trip.passengers = passengers || [];
    await trip.save();

    const populated = await PermanentTrip.findById(trip._id)
      .populate('driver', 'name phone')
      .populate('vehicle', 'name type licensePlate capacity')
      .populate('passengers.user', 'name');

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// FR-10: Soft-delete a permanent trip
router.delete('/:id', async (req, res) => {
  try {
    const trip = await PermanentTrip.findById(req.params.id);
    if (!trip || trip.deletedAt) return res.status(404).json({ message: 'Trip not found' });

    // Release driver and vehicle
    await releaseDriver(trip.driver);
    await releaseVehicle(trip.vehicle);

    trip.deletedAt = new Date();
    trip.deletedBy = req.user._id;
    trip.status = 'deleted';
    trip.isDriverAssigned = false;
    trip.isVehicleAssigned = false;

    await trip.save();

    const io = req.app.get('io');
    io.to('coordinators').emit('permanentTrip:deleted', { _id: trip._id });

    if (trip.driver) {
      io.to(`user:${trip.driver}`).emit('notification:new', {
        type: 'trip-assigned', title: 'Permanent Trip Ended',
        message: `Your permanent trip "${trip.title}" has been removed.`
      });
    }

    res.json({ message: 'Trip soft-deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Activate a draft trip (must have driver assigned)
router.put('/:id/activate', async (req, res) => {
  try {
    const trip = await PermanentTrip.findById(req.params.id);
    if (!trip || trip.deletedAt) return res.status(404).json({ message: 'Trip not found' });
    if (trip.status !== 'draft' && trip.status !== 'paused') {
      return res.status(400).json({ message: 'Can only activate draft or paused trips' });
    }
    if (!trip.driver) {
      return res.status(400).json({ message: 'Assign a driver before activating' });
    }

    trip.status = 'active';
    await trip.save();

    const populated = await PermanentTrip.findById(trip._id)
      .populate('driver', 'name phone')
      .populate('vehicle', 'name type licensePlate capacity');

    const io = req.app.get('io');
    io.to('coordinators').emit('permanentTrip:updated', populated);
    io.to(`user:${trip.driver}`).emit('notification:new', {
      type: 'trip-assigned', title: 'Trip Activated',
      message: `Your permanent trip "${trip.title}" is now active.`
    });

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Pause an active trip
router.put('/:id/pause', async (req, res) => {
  try {
    const trip = await PermanentTrip.findById(req.params.id);
    if (!trip || trip.deletedAt) return res.status(404).json({ message: 'Trip not found' });
    if (trip.status !== 'active') return res.status(400).json({ message: 'Can only pause active trips' });

    trip.status = 'paused';
    await trip.save();

    const populated = await PermanentTrip.findById(trip._id)
      .populate('driver', 'name phone')
      .populate('vehicle', 'name type licensePlate capacity');

    const io = req.app.get('io');
    io.to('coordinators').emit('permanentTrip:updated', populated);

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
