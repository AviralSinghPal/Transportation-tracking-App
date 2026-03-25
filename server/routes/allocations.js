import { Router } from 'express';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Get all permanent allocations (coordinator only)
router.get('/', authorize('coordinator'), async (req, res) => {
  try {
    const drivers = await User.find({
      role: 'driver',
      'permanentAllocation.allocatedTo': { $exists: true, $ne: null }
    })
      .populate('permanentAllocation.allocatedTo', 'name phone email')
      .populate('permanentAllocation.vehicle', 'name type licensePlate');

    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get my allocated driver (any authenticated user)
router.get('/my-driver', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.myDriver) {
      return res.json({ driver: null });
    }

    const populatedDriver = await User.findById(user.myDriver)
      .select('name phone isAvailable lastLocation permanentAllocation')
      .populate('permanentAllocation.vehicle', 'name type licensePlate');

    const populatedVehicle = populatedDriver?.permanentAllocation?.vehicle || null;

    res.json({ driver: populatedDriver, vehicle: populatedVehicle });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Allocate driver to actor (coordinator only)
router.put('/:driverId/allocate', authorize('coordinator'), async (req, res) => {
  try {
    const { actorId, vehicleId, callConfig } = req.body;
    const { driverId } = req.params;

    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'driver') {
      return res.status(400).json({ message: 'Invalid driver' });
    }

    const actor = await User.findById(actorId);
    if (!actor || actor.role !== 'passenger') {
      return res.status(400).json({ message: 'Invalid actor/passenger' });
    }

    driver.permanentAllocation = {
      allocatedTo: actorId,
      vehicle: vehicleId,
      callConfig: callConfig || 'coordinator',
      isTemporaryRelease: false
    };
    await driver.save();

    actor.myDriver = driverId;
    await actor.save();

    if (vehicleId) {
      await Vehicle.findByIdAndUpdate(vehicleId, { permanentDriver: driverId });
    }

    const io = req.app.get('io');
    io.to('coordinators').emit('allocation:updated', { type: 'created', driverId, actorId });

    const populated = await User.findById(driverId)
      .populate('permanentAllocation.allocatedTo', 'name phone email')
      .populate('permanentAllocation.vehicle', 'name type licensePlate');

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Temporary release driver (coordinator only)
router.put('/:driverId/release-temp', authorize('coordinator'), async (req, res) => {
  try {
    const { note } = req.body;
    const driver = await User.findById(req.params.driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    driver.permanentAllocation.isTemporaryRelease = true;
    driver.permanentAllocation.temporaryReleaseNote = note || '';
    await driver.save();

    const io = req.app.get('io');
    io.to('coordinators').emit('allocation:updated', { type: 'temp-released', driverId: req.params.driverId });

    res.json(driver);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Recall temporarily released driver (coordinator only)
router.put('/:driverId/recall', authorize('coordinator'), async (req, res) => {
  try {
    const driver = await User.findById(req.params.driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    driver.permanentAllocation.isTemporaryRelease = false;
    driver.permanentAllocation.temporaryReleaseNote = '';
    await driver.save();

    const io = req.app.get('io');
    io.to('coordinators').emit('allocation:updated', { type: 'recalled', driverId: req.params.driverId });

    res.json(driver);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Remove allocation (coordinator only)
router.delete('/:driverId', authorize('coordinator'), async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await User.findById(driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const vehicleId = driver.permanentAllocation?.vehicle;

    driver.permanentAllocation.allocatedTo = undefined;
    driver.permanentAllocation.vehicle = undefined;
    driver.permanentAllocation.callConfig = undefined;
    driver.permanentAllocation.isTemporaryRelease = undefined;
    driver.permanentAllocation.temporaryReleaseNote = undefined;
    await driver.save();

    // Clear myDriver on the actor
    await User.findOneAndUpdate(
      { myDriver: driverId },
      { $unset: { myDriver: 1 } }
    );

    // Clear permanentDriver on the vehicle
    if (vehicleId) {
      await Vehicle.findByIdAndUpdate(vehicleId, { $unset: { permanentDriver: 1 } });
    }

    const io = req.app.get('io');
    io.to('coordinators').emit('allocation:updated', { type: 'removed', driverId });

    res.json({ message: 'Allocation removed' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
