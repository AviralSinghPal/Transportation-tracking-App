import { Router } from 'express';
import TalentProfile from '../models/TalentProfile.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(authorize('coordinator'));

// Get all talent profiles
router.get('/', async (req, res) => {
  try {
    const profiles = await TalentProfile.find()
      .populate('user', 'name email phone role')
      .populate('preferredDriver', 'name phone')
      .populate('production', 'name code')
      .sort({ createdAt: -1 });

    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single talent profile
router.get('/:id', async (req, res) => {
  try {
    const profile = await TalentProfile.findById(req.params.id)
      .populate('user', 'name email phone role')
      .populate('preferredDriver', 'name phone')
      .populate('production', 'name code');

    if (!profile) return res.status(404).json({ message: 'Talent profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create talent profile
router.post('/', async (req, res) => {
  try {
    const { userId, preferredDriver, preferences, confidential, homeAddress, hotelAddress, agentName, agentPhone, production } = req.body;

    if (!userId) return res.status(400).json({ message: 'User (talent) is required' });

    // Check if profile already exists for this user
    const existing = await TalentProfile.findOne({ user: userId });
    if (existing) return res.status(400).json({ message: 'Talent profile already exists for this user' });

    const profile = await TalentProfile.create({
      user: userId,
      preferredDriver: preferredDriver || undefined,
      preferences: preferences || {},
      confidential: confidential !== false,
      homeAddress: homeAddress || '',
      hotelAddress: hotelAddress || '',
      agentName: agentName || '',
      agentPhone: agentPhone || '',
      production: production || undefined
    });

    const populated = await TalentProfile.findById(profile._id)
      .populate('user', 'name email phone role')
      .populate('preferredDriver', 'name phone');

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update talent profile
router.put('/:id', async (req, res) => {
  try {
    const profile = await TalentProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: 'Talent profile not found' });

    const { preferredDriver, preferences, confidential, homeAddress, hotelAddress, agentName, agentPhone, currentStatus } = req.body;

    if (preferredDriver !== undefined) profile.preferredDriver = preferredDriver || undefined;
    if (preferences) profile.preferences = { ...profile.preferences, ...preferences };
    if (confidential !== undefined) profile.confidential = confidential;
    if (homeAddress !== undefined) profile.homeAddress = homeAddress;
    if (hotelAddress !== undefined) profile.hotelAddress = hotelAddress;
    if (agentName !== undefined) profile.agentName = agentName;
    if (agentPhone !== undefined) profile.agentPhone = agentPhone;
    if (currentStatus) profile.currentStatus = currentStatus;

    await profile.save();

    const populated = await TalentProfile.findById(profile._id)
      .populate('user', 'name email phone role')
      .populate('preferredDriver', 'name phone');

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Broadcast "Talent is traveling"
router.post('/:id/traveling', async (req, res) => {
  try {
    const profile = await TalentProfile.findById(req.params.id)
      .populate('user', 'name role');
    if (!profile) return res.status(404).json({ message: 'Talent profile not found' });

    const { destination } = req.body; // e.g., "Set", "Hair/Makeup"
    const talentName = profile.user.name;

    profile.currentStatus = 'traveling';
    await profile.save();

    const io = req.app.get('io');
    const message = `${talentName} is now traveling${destination ? ` to ${destination}` : ''}`;

    // Broadcast to all coordinators
    io.to('coordinators').emit('talent:traveling', {
      talentId: profile.user._id,
      talentName,
      destination,
      timestamp: new Date()
    });

    // Create notifications for all coordinators
    const coordinators = await User.find({ role: 'coordinator', _id: { $ne: req.user._id } });
    for (const coord of coordinators) {
      const notification = await Notification.create({
        user: coord._id,
        type: 'talent-traveling',
        title: 'Talent Traveling',
        message
      });
      io.to(`user:${coord._id}`).emit('notification:new', notification);
    }

    res.json({ message: 'Traveling broadcast sent', talentName, destination });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Broadcast "Talent has arrived"
router.post('/:id/arrived', async (req, res) => {
  try {
    const profile = await TalentProfile.findById(req.params.id)
      .populate('user', 'name role');
    if (!profile) return res.status(404).json({ message: 'Talent profile not found' });

    const { location } = req.body; // e.g., "Set", "Base Camp"
    const talentName = profile.user.name;

    profile.currentStatus = location === 'set' ? 'on-set' : 'at-hotel';
    await profile.save();

    const io = req.app.get('io');
    const message = `${talentName} has arrived${location ? ` at ${location}` : ''}`;

    // Broadcast to coordinators
    io.to('coordinators').emit('talent:arrived', {
      talentId: profile.user._id,
      talentName,
      location,
      timestamp: new Date()
    });

    // Create notifications for all coordinators
    const coordinators = await User.find({ role: 'coordinator', _id: { $ne: req.user._id } });
    for (const coord of coordinators) {
      const notification = await Notification.create({
        user: coord._id,
        type: 'talent-arrived',
        title: 'Talent Arrived',
        message
      });
      io.to(`user:${coord._id}`).emit('notification:new', notification);
    }

    res.json({ message: 'Arrival broadcast sent', talentName, location });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete talent profile
router.delete('/:id', async (req, res) => {
  try {
    const profile = await TalentProfile.findByIdAndDelete(req.params.id);
    if (!profile) return res.status(404).json({ message: 'Talent profile not found' });
    res.json({ message: 'Talent profile deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
