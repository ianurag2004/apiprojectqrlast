const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

// Lazy-initialise Razorpay only when keys are set
const getRazorpay = () => {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || keyId === 'rzp_test_your_key_id') {
    return null;
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

/**
 * POST /api/payments/create-order
 * Body: { eventId, name, email, phone, roll, department, teamName }
 * Creates a Razorpay order and returns order details.
 * If REG_FEE_PAISE=0 or Razorpay keys are not set, returns { free: true }.
 */
router.post('/create-order', async (req, res, next) => {
  try {
    const { eventId, name, email, phone, roll, department, teamName } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (!event.registrationOpen)
      return res.status(400).json({ success: false, message: 'Registrations are not open' });

    const count = await Registration.countDocuments({ event: eventId });
    if (count >= event.venueCapacity)
      return res.status(400).json({ success: false, message: 'Event is fully booked' });

    const feePaise = parseInt(process.env.REG_FEE_PAISE || '0', 10);
    const razorpay = getRazorpay();

    // Free registration or no Razorpay keys — skip payment
    if (feePaise === 0 || !razorpay) {
      return res.json({ success: true, free: true, eventTitle: event.title });
    }

    const order = await razorpay.orders.create({
      amount: feePaise,
      currency: 'INR',
      receipt: `reg_${Date.now()}`,
      notes: { eventId, name, email },
    });

    return res.json({
      success: true,
      free: false,
      orderId: order.id,
      amount: feePaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      eventTitle: event.title,
    });
  } catch (err) { next(err); }
});

/**
 * POST /api/payments/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, regData }
 * Verifies signature then creates the registration record.
 */
router.post('/verify', async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      regData,          // { eventId, name, email, phone, roll, department, teamName }
      free,             // boolean — skips signature check for free events
    } = req.body;

    if (!free) {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      const expected = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expected !== razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Payment verification failed' });
      }
    }

    // Create registration
    const { generateQR } = require('../services/qr');
    const { cacheDel } = require('../config/redis');

    const event = await Event.findById(regData.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const reg = await Registration.create({
      event: regData.eventId,
      name: regData.name,
      email: regData.email,
      phone: regData.phone,
      roll: regData.roll,
      department: regData.department,
      teamName: regData.teamName,
      participant: null,
      paymentId: razorpay_payment_id || null,
      orderId: razorpay_order_id || null,
    });

    const { token, qrDataUrl } = await generateQR(reg._id.toString(), regData.eventId);
    reg.qrToken = token;
    reg.qrCode = qrDataUrl;
    await reg.save();

    await cacheDel('dashboard:kpis');

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      data: { registration: reg },
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/payments/event-qr/:eventId
 * Returns a QR code data URL that encodes the public registration URL for an event.
 * Used by organisers to display/print the QR.
 */
router.get('/event-qr/:eventId', async (req, res, next) => {
  try {
    const QRCode = require('qrcode');
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const url = `${clientUrl}/register/${req.params.eventId}`;

    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: { dark: '#0D0F1A', light: '#FFFFFF' },
    });

    res.json({ success: true, qrDataUrl, url });
  } catch (err) { next(err); }
});

module.exports = router;
