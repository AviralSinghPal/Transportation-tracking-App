import { Router } from 'express';
import TripTemplate from '../models/TripTemplate.js';
import Trip from '../models/Trip.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(authorize('coordinator'));

// List templates
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'coordinator' ? {} : { createdBy: req.user._id };
    const templates = await TripTemplate.find(filter)
      .populate('preferredDriver', 'name')
      .populate('preferredVehicle', 'name type')
      .sort({ usageCount: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create template
router.post('/', async (req, res) => {
  try {
    const template = await TripTemplate.create({
      ...req.body,
      createdBy: req.user._id
    });
    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create template from existing trip
router.post('/from-trip/:tripId', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const template = await TripTemplate.create({
      name: req.body.name || `Template from ${trip.title}`,
      title: trip.title,
      type: trip.type,
      passengers: trip.passengers.map(p => ({
        user: p.user,
        name: p.name,
        phone: p.phone,
        pickupAddress: p.pickupAddress,
        pickupLat: p.pickupLat,
        pickupLng: p.pickupLng,
        pickupTime: p.pickupTime ? new Date(p.pickupTime).toTimeString().slice(0, 5) : undefined,
        dropoffAddress: p.dropoffAddress,
        dropoffLat: p.dropoffLat,
        dropoffLng: p.dropoffLng
      })),
      preferredDriver: trip.driver,
      preferredVehicle: trip.vehicle,
      notes: trip.notes,
      estimatedDuration: trip.estimatedDuration,
      createdBy: req.user._id
    });

    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create trip from template
router.post('/:id/create-trip', async (req, res) => {
  try {
    const template = await TripTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const { date } = req.body;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const passengers = template.passengers.map(p => ({
      user: p.user,
      name: p.name,
      phone: p.phone,
      pickupAddress: p.pickupAddress,
      pickupLat: p.pickupLat,
      pickupLng: p.pickupLng,
      pickupTime: p.pickupTime ? new Date(`${date}T${p.pickupTime}`) : new Date(date),
      dropoffAddress: p.dropoffAddress,
      dropoffLat: p.dropoffLat,
      dropoffLng: p.dropoffLng
    }));

    const trip = await Trip.create({
      title: template.title,
      date: new Date(date),
      type: template.type,
      passengers,
      notes: template.notes,
      estimatedDuration: template.estimatedDuration,
      template: template._id
    });

    // Update usage count
    template.usageCount += 1;
    await template.save();

    const populated = await Trip.findById(trip._id)
      .populate('driver', 'name phone')
      .populate('vehicle', 'name type licensePlate')
      .populate('passengers.user', 'name phone');

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update template
router.put('/:id', async (req, res) => {
  try {
    const template = await TripTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete template
router.delete('/:id', async (req, res) => {
  try {
    const template = await TripTemplate.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
