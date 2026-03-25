import { Router } from 'express';
import Production from '../models/Production.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(authorize('coordinator'));

// List productions
router.get('/', async (req, res) => {
  try {
    const productions = await Production.find()
      .populate('coordinator', 'name')
      .sort({ createdAt: -1 });
    res.json(productions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create production
router.post('/', async (req, res) => {
  try {
    const production = await Production.create({
      ...req.body,
      coordinator: req.user._id
    });
    res.status(201).json(production);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update production
router.put('/:id', async (req, res) => {
  try {
    const production = await Production.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!production) return res.status(404).json({ message: 'Production not found' });
    res.json(production);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete production
router.delete('/:id', async (req, res) => {
  try {
    const production = await Production.findByIdAndDelete(req.params.id);
    if (!production) return res.status(404).json({ message: 'Production not found' });
    res.json({ message: 'Production deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
