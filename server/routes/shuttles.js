import { Router } from 'express';
import ShuttleRoute from '../models/ShuttleRoute.js';
import ShuttleRun from '../models/ShuttleRun.js';
import Notification from '../models/Notification.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ===== SHUTTLE ROUTES =====

// Get all shuttle routes
router.get('/routes', async (req, res) => {
  try {
    const routes = await ShuttleRoute.find()
      .populate('assignedVehicle', 'name type licensePlate capacity')
      .populate('assignedDriver', 'name phone')
      .sort({ isActive: -1, name: 1 });

    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create shuttle route (coordinator only)
router.post('/routes', authorize('coordinator'), async (req, res) => {
  try {
    const { name, type, stops, frequency, startTime, endTime, capacity, assignedVehicle, assignedDriver, daysActive, notes } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: 'Route name is required' });
    if (!stops || stops.length < 2) return res.status(400).json({ message: 'At least 2 stops are required' });
    if (!startTime || !endTime) return res.status(400).json({ message: 'Start and end times are required' });

    const route = await ShuttleRoute.create({
      name: name.trim(),
      type: type || 'crew',
      stops: stops.map((s, i) => ({ ...s, order: s.order || i })),
      frequency: frequency || 30,
      startTime,
      endTime,
      capacity: capacity || 15,
      assignedVehicle: assignedVehicle || undefined,
      assignedDriver: assignedDriver || undefined,
      daysActive: daysActive || [1, 2, 3, 4, 5],
      notes: notes || ''
    });

    const populated = await ShuttleRoute.findById(route._id)
      .populate('assignedVehicle', 'name type licensePlate capacity')
      .populate('assignedDriver', 'name phone');

    const io = req.app.get('io');
    io.to('coordinators').emit('shuttle:updated', populated);

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update shuttle route (coordinator only)
router.put('/routes/:id', authorize('coordinator'), async (req, res) => {
  try {
    const route = await ShuttleRoute.findById(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });

    const allowed = ['name', 'type', 'stops', 'frequency', 'startTime', 'endTime', 'capacity', 'assignedVehicle', 'assignedDriver', 'isActive', 'daysActive', 'notes'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) route[key] = req.body[key];
    }
    await route.save();

    const populated = await ShuttleRoute.findById(route._id)
      .populate('assignedVehicle', 'name type licensePlate capacity')
      .populate('assignedDriver', 'name phone');

    const io = req.app.get('io');
    io.to('coordinators').emit('shuttle:updated', populated);

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete shuttle route (coordinator only)
router.delete('/routes/:id', authorize('coordinator'), async (req, res) => {
  try {
    const route = await ShuttleRoute.findByIdAndDelete(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    // Also delete associated runs
    await ShuttleRun.deleteMany({ route: route._id });
    res.json({ message: 'Shuttle route deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ===== SHUTTLE RUNS =====

// Get today's schedule (all runs for today)
router.get('/schedule', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const runs = await ShuttleRun.find({
      scheduledDeparture: { $gte: today, $lt: tomorrow }
    })
      .populate({
        path: 'route',
        populate: [
          { path: 'assignedVehicle', select: 'name type licensePlate' },
          { path: 'assignedDriver', select: 'name phone' }
        ]
      })
      .populate('driver', 'name phone')
      .populate('vehicle', 'name type licensePlate')
      .sort({ scheduledDeparture: 1 });

    res.json(runs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get active shuttles (currently running or upcoming within 30 min)
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 60000); // 30 minutes from now

    const runs = await ShuttleRun.find({
      $or: [
        { status: { $in: ['boarding', 'in-transit'] } },
        { status: 'scheduled', scheduledDeparture: { $lte: soon, $gte: now } }
      ]
    })
      .populate({
        path: 'route',
        select: 'name type stops capacity'
      })
      .populate('driver', 'name phone')
      .populate('vehicle', 'name type licensePlate')
      .sort({ scheduledDeparture: 1 });

    res.json(runs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get runs for a specific route (today)
router.get('/routes/:id/runs', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const runs = await ShuttleRun.find({
      route: req.params.id,
      scheduledDeparture: { $gte: today, $lt: tomorrow }
    })
      .populate('driver', 'name phone')
      .populate('vehicle', 'name type licensePlate')
      .sort({ scheduledDeparture: 1 });

    res.json(runs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create / log a shuttle run
router.post('/runs', async (req, res) => {
  try {
    const { routeId, scheduledDeparture, occupancy, notes } = req.body;

    const route = await ShuttleRoute.findById(routeId);
    if (!route) return res.status(404).json({ message: 'Shuttle route not found' });

    const run = await ShuttleRun.create({
      route: routeId,
      driver: route.assignedDriver || req.user._id,
      vehicle: route.assignedVehicle || undefined,
      scheduledDeparture: scheduledDeparture || new Date(),
      capacity: route.capacity,
      occupancy: occupancy || 0,
      notes: notes || ''
    });

    const populated = await ShuttleRun.findById(run._id)
      .populate({ path: 'route', select: 'name type stops' })
      .populate('driver', 'name phone')
      .populate('vehicle', 'name type licensePlate');

    const io = req.app.get('io');
    io.to('coordinators').emit('shuttle:updated', populated);

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update shuttle run (status, occupancy)
router.put('/runs/:id', async (req, res) => {
  try {
    const run = await ShuttleRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Shuttle run not found' });

    const { status, occupancy, notes } = req.body;
    if (status) {
      run.status = status;
      if (status === 'in-transit') run.actualDeparture = new Date();
      if (status === 'completed') run.arrivalTime = new Date();
    }
    if (occupancy !== undefined) run.occupancy = occupancy;
    if (notes !== undefined) run.notes = notes;

    await run.save();

    const populated = await ShuttleRun.findById(run._id)
      .populate({ path: 'route', select: 'name type stops' })
      .populate('driver', 'name phone')
      .populate('vehicle', 'name type licensePlate');

    const io = req.app.get('io');
    io.to('coordinators').emit('shuttle:updated', populated);

    // Broadcast departing notification
    if (status === 'boarding') {
      const route = await ShuttleRoute.findById(run.route);
      io.emit('shuttle:departing', {
        routeName: route?.name || 'Shuttle',
        departureTime: run.scheduledDeparture,
        message: `${route?.name || 'Shuttle'} is now boarding!`
      });
    }

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Generate shuttle runs for a route for today (coordinator utility)
router.post('/routes/:id/generate', authorize('coordinator'), async (req, res) => {
  try {
    const route = await ShuttleRoute.findById(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    if (!route.isActive) return res.status(400).json({ message: 'Route is not active' });

    const today = new Date();
    const dayOfWeek = today.getDay();
    if (route.daysActive.length > 0 && !route.daysActive.includes(dayOfWeek)) {
      return res.status(400).json({ message: 'Route is not active today' });
    }

    // Parse start/end times
    const [startH, startM] = route.startTime.split(':').map(Number);
    const [endH, endM] = route.endTime.split(':').map(Number);

    const startDate = new Date(today);
    startDate.setHours(startH, startM, 0, 0);
    const endDate = new Date(today);
    endDate.setHours(endH, endM, 0, 0);

    // Generate runs at frequency intervals
    const runs = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      // Check if run already exists at this time
      const existing = await ShuttleRun.findOne({
        route: route._id,
        scheduledDeparture: current
      });

      if (!existing) {
        const run = await ShuttleRun.create({
          route: route._id,
          driver: route.assignedDriver || undefined,
          vehicle: route.assignedVehicle || undefined,
          scheduledDeparture: new Date(current),
          capacity: route.capacity,
          occupancy: 0
        });
        runs.push(run);
      }

      current = new Date(current.getTime() + route.frequency * 60000);
    }

    res.json({ message: `Generated ${runs.length} shuttle runs`, runs });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
