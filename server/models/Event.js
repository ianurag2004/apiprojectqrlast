const mongoose = require('mongoose');

const ApprovalStepSchema = new mongoose.Schema({
  role: { type: String, enum: ['hod', 'dean', 'finance'] },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  comment: { type: String, default: '' },
  timestamp: { type: Date, default: null },
});

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  type: {
    type: String,
    required: true,
    enum: ['technical', 'cultural', 'workshop', 'sports', 'seminar'],
  },
  description: { type: String, default: '' },
  date: { type: Date, required: true },
  endDate: { type: Date },
  venue: { type: String, required: true },
  venueCapacity: { type: Number, default: 500 },
  expectedAttendance: { type: Number, default: 200 },
  bannerImage: { type: String, default: '' },
  tags: [{ type: String }],
  status: {
    type: String,
    enum: ['draft', 'pending', 'hod_approved', 'dean_approved', 'approved', 'rejected', 'completed'],
    default: 'draft',
  },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvalChain: {
    type: [ApprovalStepSchema],
    default: () => [
      { role: 'hod', status: 'pending' },
      { role: 'dean', status: 'pending' },
      { role: 'finance', status: 'pending' },
    ],
  },
  budget: { type: mongoose.Schema.Types.ObjectId, ref: 'Budget', default: null },
  registrationDeadline: { type: Date },
  registrationOpen: { type: Boolean, default: false },
  aiPredictedTurnout: { type: Number, default: null },
  aiConfidence: { type: Number, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
