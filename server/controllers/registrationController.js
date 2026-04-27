const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { generateQR, parseQRPayload } = require('../services/qr');
const { cacheDel } = require('../config/redis');
const { sendRegistrationEmail, sendCheckInEmail } = require('../services/emailService');
const { createNotification } = require('../services/notificationService');

// @route POST /api/registrations
exports.register = async (req, res, next) => {
  try {
    const { eventId, name, email, phone, roll, department, teamName } = req.body;

    const event = await Event.findById(eventId).populate('organizer', 'name email');
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (!event.registrationOpen)
      return res.status(400).json({ success: false, message: 'Registrations are not open yet' });

    // Check capacity
    const count = await Registration.countDocuments({ event: eventId });
    if (count >= event.venueCapacity)
      return res.status(400).json({ success: false, message: 'Event is fully booked' });

    const reg = await Registration.create({
      event: eventId, name, email, phone, roll, department, teamName,
      participant: req.user?._id || null,
    });

    // Generate QR
    const { token, qrDataUrl } = await generateQR(reg._id.toString(), eventId);
    reg.qrToken = token;
    reg.qrCode = qrDataUrl;
    await reg.save();

    // Emit real-time event
    req.io?.to(`event:${eventId}`).emit('registration:new', {
      eventId, count: count + 1, name, registrationId: reg._id,
    });

    // 📧 Send registration confirmation email (async, non-blocking)
    sendRegistrationEmail({
      to: email,
      participantName: name,
      eventTitle: event.title,
      eventDate: event.date,
      venue: event.venue,
      qrDataUrl,
    }).catch(err => console.error('Email send error:', err.message));

    // 🔔 Notify the event organizer about new registration
    if (event.organizer?._id) {
      createNotification({
        recipientId: event.organizer._id,
        type: 'registration',
        title: 'New Registration',
        message: `${name} registered for ${event.title}`,
        icon: '🎫',
        link: `/registrations`,
        meta: { eventId, registrationId: reg._id },
        io: req.io,
      }).catch(err => console.error('Notification error:', err.message));
    }

    await cacheDel('dashboard:kpis');
    res.status(201).json({ success: true, data: { registration: reg } });
  } catch (err) { next(err); }
};

// @route GET /api/registrations/event/:eventId
exports.getRegistrations = async (req, res, next) => {
  try {
    const { search, checkedIn, page = 1, limit = 50 } = req.query;
    const filter = { event: req.params.eventId };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { roll: { $regex: search, $options: 'i' } },
      ];
    }
    if (checkedIn !== undefined) filter.checkedIn = checkedIn === 'true';

    const total = await Registration.countDocuments(filter);
    const registrations = await Registration.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({ success: true, data: { registrations, total, checkedInCount: await Registration.countDocuments({ event: req.params.eventId, checkedIn: true }) } });
  } catch (err) { next(err); }
};

// @route PATCH /api/registrations/:id/checkin — manual
exports.checkIn = async (req, res, next) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
    if (reg.checkedIn) return res.status(400).json({ success: false, message: 'Already checked in' });

    const event = await Event.findById(reg.event);

    reg.checkedIn = true;
    reg.checkedInAt = new Date();
    reg.checkedInBy = req.user._id;
    await reg.save();

    req.io?.to(`event:${reg.event}`).emit('checkin:update', {
      eventId: reg.event, participantId: reg._id, name: reg.name,
      timestamp: reg.checkedInAt,
    });

    // 📧 Send check-in confirmation email (async, non-blocking)
    sendCheckInEmail({
      to: reg.email,
      participantName: reg.name,
      eventTitle: event?.title || 'Event',
    }).catch(err => console.error('Check-in email error:', err.message));

    // 🔔 Notify the participant if they have an account
    if (reg.participant) {
      createNotification({
        recipientId: reg.participant,
        type: 'checkin',
        title: 'Checked In ✅',
        message: `You've been checked in to ${event?.title || 'the event'}. Certificate will be available after the event.`,
        icon: '✅',
        link: `/registrations`,
        meta: { eventId: reg.event, registrationId: reg._id },
        io: req.io,
      }).catch(err => console.error('Notification error:', err.message));
    }

    res.json({ success: true, data: { registration: reg } });
  } catch (err) { next(err); }
};

// @route POST /api/registrations/scan — QR scan check-in
exports.scanQR = async (req, res, next) => {
  try {
    const { payload } = req.body;
    const parsed = parseQRPayload(payload);
    if (!parsed) return res.status(400).json({ success: false, message: 'Invalid QR payload' });

    const { regId, eventId, token } = parsed;
    const reg = await Registration.findById(regId);
    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
    if (reg.qrToken !== token) return res.status(400).json({ success: false, message: 'QR token mismatch' });
    if (reg.checkedIn) return res.status(400).json({ success: false, message: 'Already checked in', data: { registration: reg } });

    const event = await Event.findById(eventId);

    reg.checkedIn = true;
    reg.checkedInAt = new Date();
    reg.checkedInBy = req.user._id;
    await reg.save();

    req.io?.to(`event:${eventId}`).emit('checkin:update', {
      eventId, participantId: reg._id, name: reg.name,
      timestamp: reg.checkedInAt, method: 'qr',
    });

    // 📧 Send check-in confirmation (async)
    sendCheckInEmail({
      to: reg.email,
      participantName: reg.name,
      eventTitle: event?.title || 'Event',
    }).catch(err => console.error('QR check-in email error:', err.message));

    res.json({ success: true, message: 'Check-in successful', data: { registration: reg } });
  } catch (err) { next(err); }
};

// @route GET /api/registrations/event/:eventId/export — CSV
exports.exportCSV = async (req, res, next) => {
  try {
    const regs = await Registration.find({ event: req.params.eventId }).lean();
    const header = 'Name,Email,Phone,Roll,Department,Team,CheckedIn,RegisteredAt\n';
    const rows = regs.map(r =>
      `"${r.name}","${r.email}","${r.phone}","${r.roll}","${r.department}","${r.teamName}","${r.checkedIn}","${r.createdAt}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=registrations-${req.params.eventId}.csv`);
    res.send(header + rows);
  } catch (err) { next(err); }
};


