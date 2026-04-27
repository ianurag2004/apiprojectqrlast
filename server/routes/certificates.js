const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { generateCertificate } = require('../services/certificateService');
const { protect, optionalAuth } = require('../middleware/auth');

/**
 * GET /api/certificates/:registrationId
 * Generate and stream a PDF certificate for a checked-in participant.
 * Protected — only the participant (by email match) or organizer/admin can download.
 */
router.get('/:registrationId', protect, async (req, res, next) => {
  try {
    const reg = await Registration.findById(req.params.registrationId)
      .populate('event');

    if (!reg) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    // Must be checked in
    if (!reg.checkedIn) {
      return res.status(400).json({
        success: false,
        message: 'Certificate is only available for participants who have checked in.',
      });
    }

    // Event must have passed (or be the same day)
    const eventDate = new Date(reg.event.date);
    const now = new Date();
    if (eventDate > now && eventDate.toDateString() !== now.toDateString()) {
      return res.status(400).json({
        success: false,
        message: 'Certificate will be available after the event date.',
      });
    }

    // Authorization: must be the participant OR an organizer/admin
    const isParticipant = req.user.email === reg.email ||
      (reg.participant && reg.participant.toString() === req.user._id.toString());
    const isManager = ['organizer', 'hod', 'super_admin'].includes(req.user.role);

    if (!isParticipant && !isManager) {
      return res.status(403).json({ success: false, message: 'You can only download your own certificate.' });
    }

    const certId = `FEST-${reg.event.date.getFullYear()}-${reg._id.toString().slice(-8).toUpperCase()}`;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const verifyUrl = `${clientUrl}/verify/${certId}`;

    const pdfBuffer = await generateCertificate({
      participantName: reg.name,
      eventTitle: reg.event.title,
      eventDate: reg.event.date,
      venue: reg.event.venue,
      certId,
      department: reg.department,
      verifyUrl,
    });

    const filename = `Certificate_${reg.event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${reg.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

/**
 * GET /api/certificates/verify/:certId
 * Public route to verify a certificate's authenticity.
 */
router.get('/verify/:certId', async (req, res, next) => {
  try {
    const { certId } = req.params;
    // Extract the last 8 chars which is the registration ID suffix
    const regIdSuffix = certId.split('-').pop();

    if (!regIdSuffix || regIdSuffix.length !== 8) {
      return res.status(400).json({ success: false, message: 'Invalid certificate ID' });
    }

    // Find registration by ID suffix match
    const regs = await Registration.find({ checkedIn: true })
      .populate('event', 'title date venue')
      .lean();

    const reg = regs.find(r => r._id.toString().slice(-8).toUpperCase() === regIdSuffix);

    if (!reg) {
      return res.json({
        success: true,
        data: { valid: false, message: 'Certificate not found or invalid.' },
      });
    }

    return res.json({
      success: true,
      data: {
        valid: true,
        participantName: reg.name,
        eventTitle: reg.event.title,
        eventDate: reg.event.date,
        venue: reg.event.venue,
        checkedInAt: reg.checkedInAt,
        certId,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
