const mongoose = require('mongoose');

const RegistrationSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  participant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String, default: '' },
  roll: { type: String, default: '' },         // Student roll number
  department: { type: String, default: '' },
  qrCode: { type: String, default: '' },       // Base64 QR or URL
  qrToken: { type: String, default: '' },      // Secure token embedded in QR
  checkedIn: { type: Boolean, default: false },
  checkedInAt: { type: Date, default: null },
  checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  paymentStatus: { type: String, enum: ['free', 'paid', 'pending'], default: 'free' },
  paymentId: { type: String, default: '' },    // Razorpay payment_id
  orderId:   { type: String, default: '' },    // Razorpay order_id
  teamName: { type: String, default: '' },
}, { timestamps: true });

// Prevent duplicate registrations
RegistrationSchema.index({ event: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Registration', RegistrationSchema);
