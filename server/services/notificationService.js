const Notification = require('../models/Notification');

/**
 * Create a notification and push it via Socket.io in real-time.
 *
 * @param {Object}  opts
 * @param {string}  opts.recipientId  — User._id
 * @param {string}  opts.type         — notification type enum
 * @param {string}  opts.title
 * @param {string}  opts.message
 * @param {string}  [opts.icon]       — emoji
 * @param {string}  [opts.link]       — in-app route
 * @param {Object}  [opts.meta]       — extra data
 * @param {Object}  [opts.io]         — socket.io instance
 */
exports.createNotification = async ({
  recipientId, type, title, message,
  icon = '🔔', link = '', meta = {},
  io = null,
}) => {
  const notif = await Notification.create({
    recipient: recipientId,
    type,
    title,
    message,
    icon,
    link,
    meta,
  });

  // Push via socket to the specific user's personal channel
  if (io) {
    io.to(`user:${recipientId}`).emit('notification:new', {
      _id: notif._id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      icon: notif.icon,
      link: notif.link,
      meta: notif.meta,
      read: false,
      createdAt: notif.createdAt,
    });
  }

  return notif;
};

/**
 * Get paginated notifications for a user.
 */
exports.getUserNotifications = async (userId, { page = 1, limit = 20 } = {}) => {
  const total = await Notification.countDocuments({ recipient: userId });
  const unread = await Notification.countDocuments({ recipient: userId, read: false });
  const notifications = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return { notifications, total, unread, page, limit };
};

/**
 * Mark one notification as read.
 */
exports.markRead = async (notifId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notifId, recipient: userId },
    { read: true, readAt: new Date() },
    { new: true },
  );
};

/**
 * Mark all notifications as read for a user.
 */
exports.markAllRead = async (userId) => {
  return Notification.updateMany(
    { recipient: userId, read: false },
    { read: true, readAt: new Date() },
  );
};
