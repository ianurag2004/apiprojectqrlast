const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getUserNotifications,
  markRead,
  markAllRead,
} = require('../services/notificationService');

/**
 * GET /api/notifications
 * Fetch notifications for the logged-in user (paginated).
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await getUserNotifications(req.user._id, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
router.patch('/:id/read', protect, async (req, res, next) => {
  try {
    const notif = await markRead(req.params.id, req.user._id);
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: { notification: notif } });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the logged-in user.
 */
router.patch('/read-all', protect, async (req, res, next) => {
  try {
    await markAllRead(req.user._id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
});

module.exports = router;
