import { Router } from 'express';
import RideRequest from '../models/RideRequest.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import Notification from '../models/Notification.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Get ride requests (coordinators see all, others see own)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== 'coordinator') {
      filter.$or = [
        { requester: req.user._id },
        { assignedDriver: req.user._id }
      ];
    }
    if (req.query.status) filter.status = req.query.status;

    const requests = await RideRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('requester', 'name role phone department')
      .populate('assignedDriver', 'name phone')
      .populate('assignedVehicle', 'name type licensePlate capacity')
      .populate('approvedBy', 'name');

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pending count (for badge display)
router.get('/pending', authorize('coordinator'), async (req, res) => {
  try {
    const count = await RideRequest.countDocuments({ status: 'pending' });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Call permanently allocated driver (actor self-call)
router.post('/call', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('myDriver');
    if (!user.myDriver) {
      return res.status(400).json({ message: 'No permanently allocated driver' });
    }

    const driver = await User.findById(user.myDriver._id);
    const { pickupLocation, dropoffLocation, notes } = req.body;

    if (driver.permanentAllocation?.isTemporaryRelease) {
      const request = await RideRequest.create({
        requester: req.user._id,
        pickupLocation,
        dropoffLocation,
        pickupTime: new Date(),
        notes: notes || '',
        status: 'pending',
        isPACall: true,
        callType: 'self'
      });

      const populated = await RideRequest.findById(request._id)
        .populate('requester', 'name role phone')
        .populate('assignedDriver', 'name phone')
        .populate('assignedVehicle', 'name type licensePlate capacity');

      const io = req.app.get('io');
      io.to('coordinators').emit('rideRequest:new', {
        ...populated.toObject(),
        paDriverUnavailable: true,
        message: 'PA driver unavailable, needs manual assignment'
      });

      return res.status(201).json(populated);
    }

    const request = await RideRequest.create({
      requester: req.user._id,
      pickupLocation,
      dropoffLocation,
      pickupTime: new Date(),
      notes: notes || '',
      status: 'assigned',
      isPACall: true,
      callType: 'self',
      assignedDriver: driver._id,
      assignedVehicle: driver.permanentAllocation?.vehicle
    });

    const populated = await RideRequest.findById(request._id)
      .populate('requester', 'name role phone')
      .populate('assignedDriver', 'name phone')
      .populate('assignedVehicle', 'name type licensePlate capacity');

    const io = req.app.get('io');
    io.to(`user:${driver._id}`).emit('rideRequest:assigned', populated);
    io.to('coordinators').emit('rideRequest:new', populated);

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Call PA driver on behalf of actor (coordinator only)
router.post('/call/:actorId', authorize('coordinator'), async (req, res) => {
  try {
    const actor = await User.findById(req.params.actorId).populate('myDriver');
    if (!actor || !actor.myDriver) {
      return res.status(400).json({ message: 'No permanently allocated driver for this actor' });
    }

    const driver = await User.findById(actor.myDriver._id);
    const { pickupLocation, dropoffLocation, notes } = req.body;

    if (driver.permanentAllocation?.isTemporaryRelease) {
      const request = await RideRequest.create({
        requester: actor._id,
        pickupLocation,
        dropoffLocation,
        pickupTime: new Date(),
        notes: notes || '',
        status: 'pending',
        isPACall: true,
        callType: 'coordinator'
      });

      const populated = await RideRequest.findById(request._id)
        .populate('requester', 'name role phone')
        .populate('assignedDriver', 'name phone')
        .populate('assignedVehicle', 'name type licensePlate capacity');

      const io = req.app.get('io');
      io.to('coordinators').emit('rideRequest:new', {
        ...populated.toObject(),
        paDriverUnavailable: true,
        message: 'PA driver unavailable, needs manual assignment'
      });

      return res.status(201).json(populated);
    }

    const request = await RideRequest.create({
      requester: actor._id,
      pickupLocation,
      dropoffLocation,
      pickupTime: new Date(),
      notes: notes || '',
      status: 'assigned',
      isPACall: true,
      callType: 'coordinator',
      assignedDriver: driver._id,
      assignedVehicle: driver.permanentAllocation?.vehicle
    });

    const populated = await RideRequest.findById(request._id)
      .populate('requester', 'name role phone')
      .populate('assignedDriver', 'name phone')
      .populate('assignedVehicle', 'name type licensePlate capacity');

    const io = req.app.get('io');
    io.to(`user:${driver._id}`).emit('rideRequest:assigned', populated);
    io.to('coordinators').emit('rideRequest:new', populated);

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get ride request history by date
router.get('/history', async (req, res) => {
  try {
    const { date, userId } = req.query;
    if (!date) return res.status(400).json({ message: 'Date query parameter is required' });

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const filter = { createdAt: { $gte: startOfDay, $lte: endOfDay } };

    if (req.user.role === 'coordinator') {
      if (userId) filter.requester = userId;
    } else {
      filter.requester = req.user._id;
    }

    const requests = await RideRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('requester', 'name role phone department')
      .populate('assignedDriver', 'name phone')
      .populate('assignedVehicle', 'name type licensePlate capacity')
      .populate('approvedBy', 'name');

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk create ride requests (coordinator only)
router.post('/bulk', authorize('coordinator'), async (req, res) => {
  try {
    const { requests } = req.body;
    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ message: 'Requests array is required' });
    }

    const io = req.app.get('io');
    const created = [];

    for (const r of requests) {
      const request = await RideRequest.create({
        requester: r.requester || req.user._id,
        department: r.department || 'other',
        pickupLocation: r.pickupLocation,
        dropoffLocation: r.dropoffLocation,
        pickupTime: r.pickupTime || new Date(),
        passengerCount: r.passengerCount || 1,
        priority: r.priority || 'normal',
        notes: r.notes || '',
        isPACall: r.isPACall || false,
        callType: r.callType || null,
        assignedDriver: r.assignedDriver,
        assignedVehicle: r.assignedVehicle,
        status: r.status || 'pending'
      });

      const populated = await RideRequest.findById(request._id)
        .populate('requester', 'name role phone')
        .populate('assignedDriver', 'name phone')
        .populate('assignedVehicle', 'name type licensePlate capacity');

      io.to('coordinators').emit('rideRequest:new', populated);

      if (populated.assignedDriver) {
        io.to(`user:${populated.assignedDriver._id}`).emit('rideRequest:assigned', populated);
      }

      created.push(populated);
    }

    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get active cars on routes (for "nearby car" suggestions)
router.get('/active-cars', authorize('coordinator'), async (req, res) => {
  try {
    const activeCars = await RideRequest.find({
      status: { $in: ['assigned', 'in-progress'] },
      assignedDriver: { $ne: null },
      assignedVehicle: { $ne: null }
    })
      .populate('requester', 'name')
      .populate('assignedDriver', 'name phone lastLocation')
      .populate('assignedVehicle', 'name type licensePlate capacity')
      .populate('stops.passengers.user', 'name')
      .populate('sharedPassengers.user', 'name');

    // Calculate available seats for each car
    const carsWithCapacity = activeCars.map(car => {
      const vehicleCapacity = car.assignedVehicle?.capacity || 4;
      const currentPassengers = (car.sharedPassengers?.filter(p => p.status !== 'dropped-off')?.length || 0) + 1; // +1 for original requester
      return {
        ...car.toObject(),
        availableSeats: Math.max(0, vehicleCapacity - currentPassengers),
        currentPassengers,
        vehicleCapacity
      };
    });

    res.json(carsWithCapacity);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a stop to an active ride (coordinator only)
router.put('/:id/add-stop', authorize('coordinator'), async (req, res) => {
  try {
    const { location, passengers, action, order } = req.body;
    const ride = await RideRequest.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (!['assigned', 'in-progress'].includes(ride.status)) {
      return res.status(400).json({ message: 'Can only add stops to active rides' });
    }
    if (!location?.trim()) return res.status(400).json({ message: 'Location is required' });

    // Calculate order: if not provided, add at the end
    const maxOrder = ride.stops.length > 0 ? Math.max(...ride.stops.map(s => s.order)) : 0;
    const newStop = {
      location: location.trim(),
      action: action || 'both',
      passengers: passengers || [],
      order: order != null ? order : maxOrder + 1,
      status: 'pending'
    };

    ride.stops.push(newStop);
    ride.stops.sort((a, b) => a.order - b.order);
    ride.isSharedRide = true;

    // Add passengers to sharedPassengers if not already there
    if (passengers) {
      for (const p of passengers) {
        const exists = ride.sharedPassengers.some(sp =>
          (sp.user?.toString() === p.user?.toString()) || (sp.name === p.name)
        );
        if (!exists) {
          ride.sharedPassengers.push({
            user: p.user,
            name: p.name,
            pickupLocation: action === 'dropoff' ? '' : location,
            dropoffLocation: action === 'pickup' ? '' : location,
            status: 'waiting'
          });
        }
      }
    }

    await ride.save();

    const populated = await RideRequest.findById(ride._id)
      .populate('requester', 'name role phone')
      .populate('assignedDriver', 'name phone lastLocation')
      .populate('assignedVehicle', 'name type licensePlate capacity')
      .populate('stops.passengers.user', 'name')
      .populate('sharedPassengers.user', 'name');

    // Notify driver about new stop
    const io = req.app.get('io');
    if (ride.assignedDriver) {
      io.to(`user:${ride.assignedDriver}`).emit('rideRequest:updated', populated);
      io.to(`user:${ride.assignedDriver}`).emit('notification:new', {
        type: 'ride-request', title: 'New Stop Added',
        message: `New ${action || 'stop'} added: ${location}`
      });
    }
    io.to('coordinators').emit('rideRequest:updated', populated);

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Complete a stop on an active ride
router.put('/:id/complete-stop/:stopIndex', async (req, res) => {
  try {
    const ride = await RideRequest.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const stopIdx = parseInt(req.params.stopIndex);
    if (stopIdx < 0 || stopIdx >= ride.stops.length) {
      return res.status(400).json({ message: 'Invalid stop index' });
    }

    ride.stops[stopIdx].status = 'completed';
    ride.stops[stopIdx].completedAt = new Date();

    // Update shared passenger status based on stop action
    const stop = ride.stops[stopIdx];
    if (stop.passengers) {
      for (const sp of stop.passengers) {
        const shared = ride.sharedPassengers.find(p =>
          p.user?.toString() === sp.user?.toString() || p.name === sp.name
        );
        if (shared) {
          if (stop.action === 'pickup' || stop.action === 'both') shared.status = 'picked-up';
          if (stop.action === 'dropoff') shared.status = 'dropped-off';
        }
      }
    }

    await ride.save();

    const populated = await RideRequest.findById(ride._id)
      .populate('requester', 'name role phone')
      .populate('assignedDriver', 'name phone')
      .populate('assignedVehicle', 'name type licensePlate capacity');

    const io = req.app.get('io');
    io.to('coordinators').emit('rideRequest:updated', populated);

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add passenger to shared ride
router.put('/:id/add-passenger', authorize('coordinator'), async (req, res) => {
  try {
    const { userId, name, pickupLocation, dropoffLocation } = req.body;
    const ride = await RideRequest.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    ride.isSharedRide = true;
    ride.sharedPassengers.push({
      user: userId || undefined,
      name: name || 'Passenger',
      pickupLocation: pickupLocation || ride.pickupLocation,
      dropoffLocation: dropoffLocation || ride.dropoffLocation,
      status: 'waiting'
    });

    await ride.save();

    const populated = await RideRequest.findById(ride._id)
      .populate('requester', 'name role phone')
      .populate('assignedDriver', 'name phone')
      .populate('assignedVehicle', 'name type licensePlate capacity')
      .populate('sharedPassengers.user', 'name');

    const io = req.app.get('io');
    io.to('coordinators').emit('rideRequest:updated', populated);

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get single ride request by ID
router.get('/:id', async (req, res) => {
  try {
    const request = await RideRequest.findById(req.params.id)
      .populate('requester', 'name role phone')
      .populate('assignedDriver', 'name phone lastLocation')
      .populate('assignedVehicle', 'name type licensePlate capacity')
      .populate('approvedBy', 'name');

    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Only allow requester, assigned driver, or coordinator to view
    const isOwner = request.requester._id.toString() === req.user._id.toString();
    const isDriver = request.assignedDriver?._id?.toString() === req.user._id.toString();
    const isCoordinator = req.user.role === 'coordinator';
    if (!isOwner && !isDriver && !isCoordinator) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create ride request (any authenticated user)
router.post('/', async (req, res) => {
  try {
    const { pickupLocation, dropoffLocation, pickupTime, passengerCount, priority, department, notes, pickupCoordinates, dropoffCoordinates, stops } = req.body;

    if (!pickupLocation?.trim() || !dropoffLocation?.trim()) {
      return res.status(400).json({ message: 'Pickup and dropoff locations are required' });
    }

    const request = await RideRequest.create({
      requester: req.user._id,
      department: department || 'other',
      pickupLocation: pickupLocation.trim(),
      pickupCoordinates: pickupCoordinates || undefined,
      dropoffLocation: dropoffLocation.trim(),
      dropoffCoordinates: dropoffCoordinates || undefined,
      pickupTime: pickupTime || new Date(),
      passengerCount: passengerCount || 1,
      priority: priority || 'normal',
      notes: notes?.trim() || '',
      stops: stops || []
    });

    const populated = await RideRequest.findById(request._id)
      .populate('requester', 'name role phone');

    // Notify all coordinators
    const io = req.app.get('io');
    io.to('coordinators').emit('rideRequest:new', populated);

    // Create notification for coordinators
    const Notification_ = Notification;
    // We'll broadcast to coordinators room — they'll see it in real-time

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Approve ride request (coordinator only)
router.put('/:id/approve', authorize('coordinator'), async (req, res) => {
  try {
    const request = await RideRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'Can only approve pending requests' });

    request.status = 'approved';
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();
    await request.save();

    const populated = await RideRequest.findById(request._id)
      .populate('requester', 'name role phone')
      .populate('approvedBy', 'name');

    const io = req.app.get('io');
    io.to(`user:${request.requester}`).emit('rideRequest:updated', populated);
    io.to('coordinators').emit('rideRequest:updated', populated);

    // Notify requester
    await Notification.create({
      user: request.requester,
      type: 'ride-request',
      title: 'Ride Request Approved',
      message: 'Your ride request has been approved. A driver will be assigned shortly.'
    });
    io.to(`user:${request.requester}`).emit('notification:new', {
      type: 'ride-request', title: 'Ride Request Approved',
      message: 'Your ride request has been approved.'
    });

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Assign driver + vehicle to ride request (coordinator only)
router.put('/:id/assign', authorize('coordinator'), async (req, res) => {
  try {
    const { driverId, vehicleId, eta } = req.body;
    const request = await RideRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (!['pending', 'approved'].includes(request.status)) {
      return res.status(400).json({ message: 'Can only assign to pending or approved requests' });
    }

    request.status = 'assigned';
    request.assignedDriver = driverId;
    request.assignedVehicle = vehicleId || undefined;
    request.eta = eta || null;
    if (!request.approvedBy) {
      request.approvedBy = req.user._id;
      request.approvedAt = new Date();
    }
    await request.save();

    // Mark vehicle as in-use if provided
    if (vehicleId) {
      await Vehicle.findByIdAndUpdate(vehicleId, { status: 'in-use' });
    }

    const populated = await RideRequest.findById(request._id)
      .populate('requester', 'name role phone')
      .populate('assignedDriver', 'name phone')
      .populate('assignedVehicle', 'name type licensePlate capacity')
      .populate('approvedBy', 'name');

    const io = req.app.get('io');
    io.to(`user:${request.requester}`).emit('rideRequest:updated', populated);
    io.to(`user:${driverId}`).emit('rideRequest:assigned', populated);
    io.to('coordinators').emit('rideRequest:updated', populated);

    // Notify driver
    await Notification.create({
      user: driverId,
      type: 'ride-assigned',
      title: 'Ride Pickup Assigned',
      message: `Pick up ${populated.requester?.name || 'rider'} at ${request.pickupLocation}`
    });
    io.to(`user:${driverId}`).emit('notification:new', {
      type: 'ride-assigned', title: 'Ride Pickup Assigned',
      message: `Pick up at ${request.pickupLocation}`
    });

    // Notify requester with ETA
    const etaMsg = eta ? `Your driver will arrive in ~${eta} minutes.` : 'A driver has been assigned to your ride.';
    await Notification.create({
      user: request.requester,
      type: 'ride-eta',
      title: 'Driver Assigned',
      message: etaMsg
    });
    io.to(`user:${request.requester}`).emit('notification:new', {
      type: 'ride-eta', title: 'Driver Assigned', message: etaMsg
    });

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Reject ride request (coordinator only)
router.put('/:id/reject', authorize('coordinator'), async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await RideRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = 'rejected';
    request.rejectionReason = reason || 'Request declined';
    await request.save();

    const populated = await RideRequest.findById(request._id)
      .populate('requester', 'name role phone');

    const io = req.app.get('io');
    io.to(`user:${request.requester}`).emit('rideRequest:updated', populated);
    io.to('coordinators').emit('rideRequest:updated', populated);

    // Notify requester
    await Notification.create({
      user: request.requester,
      type: 'ride-request',
      title: 'Ride Request Declined',
      message: reason || 'Your ride request was declined.'
    });
    io.to(`user:${request.requester}`).emit('notification:new', {
      type: 'ride-request', title: 'Ride Request Declined',
      message: reason || 'Your ride request was declined.'
    });

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update ride request status (driver: in-progress, completed)
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const request = await RideRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Drivers can only update their assigned requests
    if (req.user.role === 'driver' && request.assignedDriver?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your assigned ride' });
    }

    const validTransitions = {
      'assigned': ['in-progress', 'cancelled'],
      'in-progress': ['completed', 'cancelled']
    };

    if (!validTransitions[request.status]?.includes(status)) {
      return res.status(400).json({ message: `Cannot transition from ${request.status} to ${status}` });
    }

    request.status = status;
    if (status === 'completed') {
      request.completedAt = new Date();
      // Release vehicle
      if (request.assignedVehicle) {
        await Vehicle.findByIdAndUpdate(request.assignedVehicle, { status: 'available' });
      }
    }
    await request.save();

    const populated = await RideRequest.findById(request._id)
      .populate('requester', 'name role phone')
      .populate('assignedDriver', 'name phone')
      .populate('assignedVehicle', 'name type licensePlate capacity');

    const io = req.app.get('io');
    io.to(`user:${request.requester}`).emit('rideRequest:updated', populated);
    io.to('coordinators').emit('rideRequest:updated', populated);

    // Notify requester of status changes
    const statusMessages = {
      'in-progress': 'Your driver is on the way!',
      'completed': 'Ride completed. Have a great day!'
    };
    if (statusMessages[status]) {
      await Notification.create({
        user: request.requester,
        type: 'ride-eta',
        title: status === 'in-progress' ? 'Driver On The Way' : 'Ride Complete',
        message: statusMessages[status]
      });
      io.to(`user:${request.requester}`).emit('notification:new', {
        type: 'ride-eta',
        title: status === 'in-progress' ? 'Driver On The Way' : 'Ride Complete',
        message: statusMessages[status]
      });
    }

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Cancel own ride request
router.delete('/:id', async (req, res) => {
  try {
    const request = await RideRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Only requester or coordinator can cancel
    if (req.user.role !== 'coordinator' && request.requester.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (['completed', 'cancelled'].includes(request.status)) {
      return res.status(400).json({ message: 'Cannot cancel a completed or already cancelled request' });
    }

    // Release vehicle if assigned
    if (request.assignedVehicle) {
      await Vehicle.findByIdAndUpdate(request.assignedVehicle, { status: 'available' });
    }

    request.status = 'cancelled';
    await request.save();

    const io = req.app.get('io');
    io.to('coordinators').emit('rideRequest:updated', request);
    if (request.assignedDriver) {
      io.to(`user:${request.assignedDriver}`).emit('rideRequest:updated', request);
    }

    res.json({ message: 'Request cancelled' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
