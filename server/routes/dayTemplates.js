import { Router } from 'express';
import DayTemplate from '../models/DayTemplate.js';
import Trip from '../models/Trip.js';
import RideRequest from '../models/RideRequest.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(authorize('coordinator'));

// List all day templates
router.get('/', async (req, res) => {
  try {
    const templates = await DayTemplate.find()
      .populate('entries.preferredDriver', 'name')
      .populate('entries.preferredVehicle', 'name licensePlate')
      .populate('entries.requester', 'name')
      .sort({ usageCount: -1, createdAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Capture a day's schedule as a template
router.post('/capture', async (req, res) => {
  try {
    const { date, name, description } = req.body;
    if (!date || !name?.trim()) {
      return res.status(400).json({ message: 'Date and name are required' });
    }

    const targetDate = new Date(date);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    // Get all trips for that date
    const trips = await Trip.find({
      date: { $gte: targetDate, $lt: nextDate },
      status: { $ne: 'cancelled' }
    }).populate('driver', 'name').populate('vehicle', 'name licensePlate');

    // Get all ride requests for that date
    const rides = await RideRequest.find({
      createdAt: { $gte: targetDate, $lt: nextDate },
      status: { $nin: ['cancelled', 'rejected'] }
    }).populate('assignedDriver', 'name').populate('assignedVehicle', 'name licensePlate').populate('requester', 'name');

    if (trips.length === 0 && rides.length === 0) {
      return res.status(400).json({ message: 'No trips or rides found for that date' });
    }

    const entries = [];

    // Convert trips to template entries
    for (const trip of trips) {
      const firstPassenger = trip.passengers?.[0];
      entries.push({
        type: 'trip',
        title: trip.title,
        pickupLocation: firstPassenger?.pickupAddress || 'TBD',
        pickupCoordinates: firstPassenger?.pickupLat ? { lat: firstPassenger.pickupLat, lng: firstPassenger.pickupLng } : undefined,
        dropoffLocation: firstPassenger?.dropoffAddress || 'TBD',
        dropoffCoordinates: firstPassenger?.dropoffLat ? { lat: firstPassenger.dropoffLat, lng: firstPassenger.dropoffLng } : undefined,
        pickupTime: firstPassenger?.pickupTime ? new Date(firstPassenger.pickupTime).toTimeString().slice(0, 5) : '08:00',
        passengerCount: trip.passengers?.length || 1,
        notes: trip.notes || '',
        passengers: trip.passengers?.map(p => ({
          name: p.name,
          phone: p.phone,
          pickupAddress: p.pickupAddress,
          pickupLat: p.pickupLat,
          pickupLng: p.pickupLng,
          pickupTime: p.pickupTime ? new Date(p.pickupTime).toTimeString().slice(0, 5) : '',
          dropoffAddress: p.dropoffAddress,
          dropoffLat: p.dropoffLat,
          dropoffLng: p.dropoffLng
        })) || [],
        preferredDriver: trip.driver?._id,
        preferredVehicle: trip.vehicle?._id
      });
    }

    // Convert rides to template entries
    for (const ride of rides) {
      entries.push({
        type: 'ride',
        title: `${ride.requester?.name || 'Ride'} — ${ride.pickupLocation} → ${ride.dropoffLocation}`,
        pickupLocation: ride.pickupLocation,
        pickupCoordinates: ride.pickupCoordinates || undefined,
        dropoffLocation: ride.dropoffLocation,
        dropoffCoordinates: ride.dropoffCoordinates || undefined,
        pickupTime: new Date(ride.pickupTime).toTimeString().slice(0, 5),
        passengerCount: ride.passengerCount || 1,
        priority: ride.priority,
        department: ride.department,
        notes: ride.notes || '',
        stops: ride.stops?.map(s => ({
          location: s.location,
          coordinates: s.coordinates,
          action: s.action,
          passengers: s.passengers?.map(p => ({ name: p.name })),
          order: s.order
        })) || [],
        preferredDriver: ride.assignedDriver?._id,
        preferredVehicle: ride.assignedVehicle?._id,
        requester: ride.requester?._id
      });
    }

    // Sort by pickup time
    entries.sort((a, b) => a.pickupTime.localeCompare(b.pickupTime));

    const template = await DayTemplate.create({
      name: name.trim(),
      description: description?.trim() || `Captured from ${new Date(date).toLocaleDateString()} — ${entries.length} entries`,
      sourceDate: targetDate,
      entries,
      createdBy: req.user._id
    });

    const populated = await DayTemplate.findById(template._id)
      .populate('entries.preferredDriver', 'name')
      .populate('entries.preferredVehicle', 'name licensePlate')
      .populate('entries.requester', 'name');

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Apply a day template to a specific date (create all trips + rides in one click)
router.post('/:id/apply', async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ message: 'Target date is required' });

    const template = await DayTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const targetDate = new Date(date);
    const created = { trips: 0, rides: 0 };

    for (const entry of template.entries) {
      const [hours, minutes] = entry.pickupTime.split(':').map(Number);
      const pickupDateTime = new Date(targetDate);
      pickupDateTime.setHours(hours, minutes, 0, 0);

      if (entry.type === 'trip') {
        const passengers = entry.passengers.map(p => {
          const [ph, pm] = (p.pickupTime || entry.pickupTime).split(':').map(Number);
          const pTime = new Date(targetDate);
          pTime.setHours(ph, pm, 0, 0);
          return {
            name: p.name,
            phone: p.phone,
            pickupAddress: p.pickupAddress || entry.pickupLocation,
            pickupLat: p.pickupLat,
            pickupLng: p.pickupLng,
            pickupTime: pTime,
            dropoffAddress: p.dropoffAddress || entry.dropoffLocation,
            dropoffLat: p.dropoffLat,
            dropoffLng: p.dropoffLng
          };
        });

        await Trip.create({
          title: entry.title || 'Trip from template',
          date: targetDate,
          type: 'one-time',
          passengers: passengers.length > 0 ? passengers : [{
            name: 'Passenger',
            pickupAddress: entry.pickupLocation,
            pickupTime: pickupDateTime,
            dropoffAddress: entry.dropoffLocation
          }],
          driver: entry.preferredDriver || undefined,
          vehicle: entry.preferredVehicle || undefined,
          notes: entry.notes,
          status: entry.preferredDriver ? 'assigned' : 'unassigned'
        });
        created.trips++;

      } else {
        await RideRequest.create({
          requester: entry.requester || req.user._id,
          pickupLocation: entry.pickupLocation,
          pickupCoordinates: entry.pickupCoordinates || undefined,
          dropoffLocation: entry.dropoffLocation,
          dropoffCoordinates: entry.dropoffCoordinates || undefined,
          pickupTime: pickupDateTime,
          passengerCount: entry.passengerCount || 1,
          priority: entry.priority || 'normal',
          department: entry.department || 'other',
          notes: entry.notes || '',
          stops: entry.stops || [],
          assignedDriver: entry.preferredDriver || undefined,
          assignedVehicle: entry.preferredVehicle || undefined,
          status: entry.preferredDriver ? 'assigned' : 'pending',
          approvedBy: entry.preferredDriver ? req.user._id : undefined,
          approvedAt: entry.preferredDriver ? new Date() : undefined
        });
        created.rides++;
      }
    }

    template.usageCount += 1;
    template.lastUsedAt = new Date();
    await template.save();

    // Notify coordinators
    const io = req.app.get('io');
    io.to('coordinators').emit('dayTemplate:applied', {
      templateName: template.name,
      date,
      ...created
    });

    res.json({
      message: `Day template applied: ${created.trips} trips + ${created.rides} rides created for ${new Date(date).toLocaleDateString()}`,
      ...created
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a day template
router.delete('/:id', async (req, res) => {
  try {
    await DayTemplate.findByIdAndDelete(req.params.id);
    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
