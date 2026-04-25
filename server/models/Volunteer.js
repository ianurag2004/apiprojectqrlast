const mongoose = require('mongoose');

const VolunteerSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: {
    type: String,
    enum: ['coordinator', 'logistics', 'registration', 'security', 'tech', 'marketing', 'hospitality'],
    default: 'logistics',
  },
  tasksAssigned: [{ type: String }],
  hoursWorked: { type: Number, default: 0 },
  workloadScore: { type: Number, default: 50 },   // 0-100, AI computed
  status: { type: String, enum: ['active', 'done', 'absent'], default: 'active' },
  notes: { type: String, default: '' },
}, { timestamps: true });

VolunteerSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Volunteer', VolunteerSchema);
