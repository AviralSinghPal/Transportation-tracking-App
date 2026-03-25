import { Router } from 'express';
import Rating from '../models/Rating.js';
import Trip from '../models/Trip.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Submit a rating
router.post('/', async (req, res) => {
  try {
    const { tripId, ratedUserId, rating, comment } = req.body;

    if (!tripId || !ratedUserId || !rating) {
      return res.status(400).json({ message: 'tripId, ratedUserId, and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    if (trip.status !== 'completed') {
      return res.status(400).json({ message: 'Can only rate completed trips' });
    }

    const type = req.user.role === 'passenger' ? 'passenger-to-driver' : 'coordinator-to-driver';

    const existing = await Rating.findOne({ trip: tripId, ratedBy: req.user._id });
    if (existing) {
      return res.status(400).json({ message: 'You have already rated this trip' });
    }

    const ratingDoc = await Rating.create({
      trip: tripId,
      ratedBy: req.user._id,
      ratedUser: ratedUserId,
      rating,
      comment,
      type
    });

    // Update trip rating
    await Trip.findByIdAndUpdate(tripId, { rating });

    res.status(201).json(ratingDoc);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get ratings for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const ratings = await Rating.find({ ratedUser: req.params.userId })
      .populate('ratedBy', 'name role')
      .populate('trip', 'title date')
      .sort({ createdAt: -1 });

    const avg = ratings.length
      ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
      : null;

    res.json({ ratings, average: avg ? parseFloat(avg) : null, total: ratings.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check if user has rated a trip
router.get('/trip/:tripId/check', async (req, res) => {
  try {
    const existing = await Rating.findOne({ trip: req.params.tripId, ratedBy: req.user._id });
    res.json({ hasRated: !!existing, rating: existing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
