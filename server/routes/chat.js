import { Router } from 'express';
import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Get conversations list
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user._id;

    // Get latest message per conversation partner
    const messages = await ChatMessage.aggregate([
      {
        $match: {
          channel: 'direct',
          $or: [{ sender: userId }, { receiver: userId }]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ['$sender', userId] }, '$receiver', '$sender']
          },
          lastMessage: { $first: '$message' },
          lastMessageAt: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$sender', userId] }, { $not: { $in: [userId, '$readBy'] } }] },
                1, 0
              ]
            }
          }
        }
      },
      { $sort: { lastMessageAt: -1 } }
    ]);

    const userIds = messages.map(m => m._id);
    const users = await User.find({ _id: { $in: userIds } }).select('name role phone');

    const conversations = messages.map(m => {
      const user = users.find(u => u._id.toString() === m._id.toString());
      return {
        user: user || { _id: m._id, name: 'Unknown' },
        lastMessage: m.lastMessage,
        lastMessageAt: m.lastMessageAt,
        unreadCount: m.unreadCount
      };
    });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get messages with a specific user
router.get('/messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await ChatMessage.find({
      channel: 'direct',
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ]
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('sender', 'name role');

    // Mark as read
    await ChatMessage.updateMany(
      { sender: userId, receiver: req.user._id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send message
router.post('/messages', async (req, res) => {
  try {
    const { receiverId, message, tripId } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });

    const chatMessage = await ChatMessage.create({
      sender: req.user._id,
      receiver: receiverId,
      trip: tripId || undefined,
      channel: tripId ? 'trip' : 'direct',
      message: message.trim(),
      readBy: [req.user._id]
    });

    const populated = await ChatMessage.findById(chatMessage._id).populate('sender', 'name role');

    // Emit via socket
    const io = req.app.get('io');
    io.to(`user:${receiverId}`).emit('chat:message', populated);
    io.to(`user:${req.user._id}`).emit('chat:message', populated);

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all contactable users
router.get('/contacts', async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id }, isActive: { $ne: false } })
      .select('name role phone')
      .sort({ role: 1, name: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
