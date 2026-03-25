import { Router } from 'express';
import Document from '../models/Document.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// List documents
router.get('/', async (req, res) => {
  try {
    const { userId, type, status } = req.query;
    const filter = {};
    if (userId) filter.user = userId;
    if (type) filter.type = type;
    if (status) filter.status = status;

    // Non-coordinators only see their own
    if (req.user.role !== 'coordinator') {
      filter.user = req.user._id;
    }

    const docs = await Document.find(filter)
      .populate('user', 'name role')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload/create document record
router.post('/', async (req, res) => {
  try {
    const doc = await Document.create({
      ...req.body,
      user: req.body.userId || req.user._id
    });

    const populated = await Document.findById(doc._id)
      .populate('user', 'name role');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Verify document (coordinator only)
router.put('/:id/verify', authorize('coordinator'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      { status, notes, verifiedBy: req.user._id, verifiedAt: new Date() },
      { new: true }
    ).populate('user', 'name role');

    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.json(doc);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Save photo confirmation for trip
router.post('/photo-confirmation', async (req, res) => {
  try {
    const { tripId, type, photoData } = req.body;
    const doc = await Document.create({
      user: req.user._id,
      type: 'photo-confirmation',
      title: `${type} photo - Trip`,
      fileUrl: photoData,
      trip: tripId,
      status: 'verified'
    });
    res.status(201).json(doc);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Save digital signature
router.post('/signature', async (req, res) => {
  try {
    const { tripId, signatureData } = req.body;
    const doc = await Document.create({
      user: req.user._id,
      type: 'signature',
      title: 'Trip confirmation signature',
      signatureData,
      trip: tripId,
      status: 'verified'
    });
    res.status(201).json(doc);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete document
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (req.user.role !== 'coordinator' && doc.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
