const mongoose = require('mongoose');

const AllocationSchema = new mongoose.Schema({
  venue: { type: Number, default: 0 },
  catering: { type: Number, default: 0 },
  logistics: { type: Number, default: 0 },
  marketing: { type: Number, default: 0 },
  contingency: { type: Number, default: 0 },
  other: { type: Number, default: 0 },
}, { _id: false });

const SponsorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, default: 0 },
  status: { type: String, enum: ['confirmed', 'pending', 'cancelled'], default: 'pending' },
  contact: { type: String, default: '' },
});

const BudgetSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, unique: true },
  totalRequested: { type: Number, required: true },
  totalApproved: { type: Number, default: null },
  aiRecommended: { type: Number, default: null },
  allocation: { type: AllocationSchema, default: () => ({}) },
  actualSpend: { type: AllocationSchema, default: () => ({}) },
  sponsors: { type: [SponsorSchema], default: [] },
  approvalStatus: {
    type: String, enum: ['draft', 'pending', 'approved', 'rejected'], default: 'draft',
  },
  financeComment: { type: String, default: '' },
}, { timestamps: true });

BudgetSchema.virtual('totalSponsorship').get(function () {
  return this.sponsors
    .filter(s => s.status === 'confirmed')
    .reduce((sum, s) => sum + s.amount, 0);
});

BudgetSchema.virtual('totalActualSpend').get(function () {
  return Object.values(this.actualSpend.toObject ? this.actualSpend.toObject() : this.actualSpend)
    .reduce((s, v) => s + (v || 0), 0);
});

module.exports = mongoose.model('Budget', BudgetSchema);
