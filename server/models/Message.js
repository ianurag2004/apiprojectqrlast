const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    // 'direct' = 1-to-1 DM, 'group' = global group chat
    type: { type: String, enum: ['direct', 'group'], required: true },

    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Only for direct messages
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    content: { type: String, required: true, trim: true, maxlength: 2000 },

    // Tracks who has read the message (for DMs unread badge)
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Index to quickly fetch DM thread between two users
MessageSchema.index({ type: 1, sender: 1, recipient: 1, createdAt: -1 });
// Index for group messages
MessageSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);
