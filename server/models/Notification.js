const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: [
      'registration',    // Someone registered for your event
      'checkin',         // Check-in confirmation
      'approval',        // Event approved / rejected
      'certificate',     // Certificate is available
      'event_reminder',  // Event is coming up soon
      'system',          // System-wide announcement
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  icon: { type: String, default: '🔔' },          // emoji or icon key
  link: { type: String, default: '' },             // in-app route
  meta: { type: mongoose.Schema.Types.Mixed },     // extra data (eventId, regId, etc.)
  read: { type: Boolean, default: false, index: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });

// Auto-expire after 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', NotificationSchema);
