const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');

// GET /api/messages/users — list all users except self (for DM sidebar)
router.get('/users', protect, async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id }, isActive: true })
      .select('name email role department avatar')
      .sort({ name: 1 });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/group?limit=50&before=<timestamp>
// Paginated group chat history
router.get('/group', protect, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before ? new Date(req.query.before) : new Date();

    const messages = await Message.find({
      type: 'group',
      createdAt: { $lt: before },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'name email role avatar');

    res.json({ success: true, data: messages.reverse() });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/dm/:userId?limit=50&before=<timestamp>
// Paginated DM thread between current user and :userId
router.get('/dm/:userId', protect, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before ? new Date(req.query.before) : new Date();
    const other = req.params.userId;
    const me = req.user._id;

    const messages = await Message.find({
      type: 'direct',
      createdAt: { $lt: before },
      $or: [
        { sender: me, recipient: other },
        { sender: other, recipient: me },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'name email role avatar');

    // Mark received messages as read
    await Message.updateMany(
      { type: 'direct', sender: other, recipient: me, readBy: { $ne: me } },
      { $addToSet: { readBy: me } }
    );

    res.json({ success: true, data: messages.reverse() });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/unread — count of unread DMs per sender
router.get('/unread', protect, async (req, res, next) => {
  try {
    const me = req.user._id;
    const unread = await Message.aggregate([
      { $match: { type: 'direct', recipient: me, readBy: { $ne: me } } },
      { $group: { _id: '$sender', count: { $sum: 1 } } },
    ]);
    // Convert to { senderId: count } map
    const map = {};
    unread.forEach(u => { map[u._id.toString()] = u.count; });
    res.json({ success: true, data: map });
  } catch (err) {
    next(err);
  }
});

// POST /api/messages/group — persist a group message (socket already broadcasts)
router.post('/group', protect, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Content required' });

    const message = await Message.create({
      type: 'group',
      sender: req.user._id,
      content: content.trim(),
      readBy: [req.user._id],
    });
    await message.populate('sender', 'name email role avatar');

    // Broadcast via socket
    req.io.to('chat:group').emit('chat:group:message', message);

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
});

// POST /api/messages/dm/:userId — persist a DM (socket already broadcasts)
router.post('/dm/:userId', protect, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Content required' });

    const message = await Message.create({
      type: 'direct',
      sender: req.user._id,
      recipient: req.params.userId,
      content: content.trim(),
      readBy: [req.user._id],
    });
    await message.populate('sender', 'name email role avatar');

    // Deliver to recipient's personal room and sender's own room
    req.io.to(`user:${req.params.userId}`).emit('chat:dm:message', message);
    req.io.to(`user:${req.user._id}`).emit('chat:dm:message', message);

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
