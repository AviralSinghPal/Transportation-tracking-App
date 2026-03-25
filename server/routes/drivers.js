import { Router } from 'express';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// List all drivers
router.get('/', authorize('coordinator'), async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver' })
      .select('-password')
      .sort({ name: 1 });
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get available drivers
router.get('/available', authorize('coordinator'), async (req, res) => {
  try {
    const drivers = await User.find({
      role: 'driver',
      isActive: true,
      isAvailable: true
    }).select('-password').sort({ name: 1 });
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create temporary driver
router.post('/temporary', authorize('coordinator'), async (req, res) => {
  try {
    const { name, phone, licenseNumber } = req.body;
    const driver = await User.create({
      name,
      phone,
      email: `temp_${Date.now()}@transport.local`,
      password: `temp_${Date.now()}`,
      role: 'driver',
      isTemporary: true,
      licenseNumber
    });
    res.status(201).json(driver);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Toggle driver availability
router.put('/:id/availability', authorize('coordinator'), async (req, res) => {
  try {
    const driver = await User.findById(req.params.id);
    if (!driver || driver.role !== 'driver') {
      return res.status(404).json({ message: 'Driver not found' });
    }

    driver.isAvailable = !driver.isAvailable;
    await driver.save();
    res.json(driver);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update driver details
router.put('/:id', authorize('coordinator'), async (req, res) => {
  try {
    const { name, phone, licenseNumber, licenseExpiry, isActive } = req.body;
    const driver = await User.findByIdAndUpdate(
      req.params.id,
      { name, phone, licenseNumber, licenseExpiry, isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json(driver);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
