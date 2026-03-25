import { Router } from 'express';
import Geofence from '../models/Geofence.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// List all geofences
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.active === 'true') filter.isActive = true;
    const geofences = await Geofence.find(filter).sort({ createdAt: -1 });
    res.json(geofences);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create geofence (coordinator only)
router.post('/', authorize('coordinator'), async (req, res) => {
  try {
    const { name, type, center, radius, polygon, color, triggers } = req.body;
    if (!name || !center?.lat || !center?.lng) {
      return res.status(400).json({ message: 'Name and center coordinates are required' });
    }
    const geofence = await Geofence.create({
      name, type: type || 'circle', center, radius: radius || 200,
      polygon: polygon || [], color: color || '#4f46e5',
      triggers: triggers || { onEnter: true, onExit: true, notifyCoordinator: true, notifyPassenger: false },
      isActive: true, createdBy: req.user._id
    });
    const io = req.app.get('io');
    io.to('coordinators').emit('geofence:created', geofence);
    res.status(201).json(geofence);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update geofence
router.put('/:id', authorize('coordinator'), async (req, res) => {
  try {
    const geofence = await Geofence.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!geofence) return res.status(404).json({ message: 'Geofence not found' });
    const io = req.app.get('io');
    io.to('coordinators').emit('geofence:updated', geofence);
    res.json(geofence);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete geofence
router.delete('/:id', authorize('coordinator'), async (req, res) => {
  try {
    await Geofence.findByIdAndDelete(req.params.id);
    const io = req.app.get('io');
    io.to('coordinators').emit('geofence:deleted', { id: req.params.id });
    res.json({ message: 'Geofence deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
