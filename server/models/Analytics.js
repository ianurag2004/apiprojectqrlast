const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, unique: true },
  predictedTurnout: { type: Number, default: 0 },
  actualTurnout: { type: Number, default: 0 },
  attendanceRate: { type: Number, default: 0 },      // 0-1
  budgetRequested: { type: Number, default: 0 },
  budgetApproved: { type: Number, default: 0 },
  actualSpend: { type: Number, default: 0 },
  budgetUtilization: { type: Number, default: 0 },   // 0-1+
  engagementScore: { type: Number, default: 0 },     // 0-100
  engagementGrade: { type: String, default: 'N/A' },
  feedbackAvg: { type: Number, default: 0 },
  socialReach: { type: Number, default: 0 },
  volunteerCount: { type: Number, default: 0 },
  registrationTimeline: [{
    date: { type: String },
    count: { type: Number },
  }],
  insights: [{ type: String }],
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Analytics', AnalyticsSchema);
