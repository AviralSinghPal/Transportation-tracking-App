import { Router } from 'express';
import Maintenance from '../models/Maintenance.js';
import Vehicle from '../models/Vehicle.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(authorize('coordinator'));

// List maintenance records
router.get('/', async (req, res) => {
  try {
    const { vehicleId, status } = req.query;
    const filter = {};
    if (vehicleId) filter.vehicle = vehicleId;
    if (status) filter.status = status;

    const records = await Maintenance.find(filter)
      .populate('vehicle', 'name type licensePlate')
      .sort({ scheduledDate: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create maintenance record
router.post('/', async (req, res) => {
  try {
    const record = await Maintenance.create(req.body);
    const populated = await Maintenance.findById(record._id).populate('vehicle', 'name type licensePlate');

    // If scheduled for today or overdue, mark vehicle as maintenance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(record.scheduledDate) <= today) {
      await Vehicle.findByIdAndUpdate(record.vehicle, { status: 'maintenance' });
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update maintenance record
router.put('/:id', async (req, res) => {
  try {
    const record = await Maintenance.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('vehicle', 'name type licensePlate');
    if (!record) return res.status(404).json({ message: 'Record not found' });

    // If completed, update vehicle
    if (req.body.status === 'completed') {
      await Vehicle.findByIdAndUpdate(record.vehicle, {
        status: 'available',
        lastServiceDate: new Date(),
        nextServiceDate: record.nextServiceDate
      });
    }

    res.json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete maintenance record
router.delete('/:id', async (req, res) => {
  try {
    const record = await Maintenance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get upcoming maintenance alerts
router.get('/alerts', async (req, res) => {
  try {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcoming = await Maintenance.find({
      status: { $in: ['scheduled', 'overdue'] },
      scheduledDate: { $lte: nextWeek }
    }).populate('vehicle', 'name type licensePlate').sort({ scheduledDate: 1 });

    // Check for overdue and mark them
    const today = new Date();
    for (const record of upcoming) {
      if (new Date(record.scheduledDate) < today && record.status === 'scheduled') {
        record.status = 'overdue';
        await record.save();
      }
    }

    res.json(upcoming);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
