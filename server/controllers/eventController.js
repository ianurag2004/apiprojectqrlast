const Event = require('../models/Event');
const Budget = require('../models/Budget');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { predictTurnout } = require('../services/aiProxy');

const STATUS_FLOW = {
  draft: 'pending',
  pending: 'hod_approved',
  hod_approved: 'dean_approved',
  dean_approved: 'approved',
};

// @route GET /api/events
exports.getEvents = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 12 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    // If not admin/hod/dean, only show own events + approved ones
    if (req.user && !['super_admin','hod','dean','finance'].includes(req.user.role)) {
      filter.$or = [{ organizer: req.user._id }, { status: 'approved' }];
    }

    const cacheKey = `event:list:${JSON.stringify(filter)}:${page}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const total = await Event.countDocuments(filter);
    const events = await Event.find(filter)
      .populate('organizer', 'name email department avatar')
      .sort({ date: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const result = { success: true, data: { events, total, page: Number(page), pages: Math.ceil(total / limit) } };
    await cacheSet(cacheKey, JSON.stringify(result), 120);
    res.json(result);
  } catch (err) { next(err); }
};

// @route POST /api/events
exports.createEvent = async (req, res, next) => {
  try {
    const { title, type, description, date, endDate, venue, venueCapacity,
            expectedAttendance, tags, registrationDeadline } = req.body;

    const event = await Event.create({
      title, type, description, date, endDate, venue,
      venueCapacity, expectedAttendance, tags, registrationDeadline,
      organizer: req.user._id,
      status: 'draft',
    });

    // Trigger AI prediction in background
    try {
      const dt = new Date(date);
      const aiResult = await predictTurnout({
        event_type: type,
        date: date,
        venue_capacity: venueCapacity || 500,
        registration_days: registrationDeadline
          ? Math.max(1, Math.floor((new Date(registrationDeadline) - new Date()) / 86400000))
          : 14,
      });
      await Event.findByIdAndUpdate(event._id, {
        aiPredictedTurnout: aiResult.predicted,
        aiConfidence: aiResult.confidence,
      });
      event.aiPredictedTurnout = aiResult.predicted;
      event.aiConfidence = aiResult.confidence;
    } catch (aiErr) {
      console.warn('⚠️  AI prediction failed:', aiErr.message);
    }

    await cacheDel('event:list:*');
    await cacheDel('dashboard:kpis');

    res.status(201).json({ success: true, data: { event } });
  } catch (err) { next(err); }
};

// @route GET /api/events/:id
exports.getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email department avatar')
      .populate('budget')
      .lean();
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: { event } });
  } catch (err) { next(err); }
};

// @route PUT /api/events/:id
exports.updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'super_admin')
      return res.status(403).json({ success: false, message: 'Not authorized to edit this event' });

    if (!['draft'].includes(event.status))
      return res.status(400).json({ success: false, message: 'Only draft events can be edited' });

    const allowed = ['title','type','description','date','endDate','venue','venueCapacity',
                     'expectedAttendance','tags','registrationDeadline','bannerImage'];
    allowed.forEach(f => { if (req.body[f] !== undefined) event[f] = req.body[f]; });
    await event.save();

    await cacheDel(`event:detail:${req.params.id}`);
    res.json({ success: true, data: { event } });
  } catch (err) { next(err); }
};

// @route PATCH /api/events/:id/submit — submit for approval
exports.submitEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your event' });
    if (event.status !== 'draft')
      return res.status(400).json({ success: false, message: 'Event already submitted' });

    event.status = 'pending';
    await event.save();

    // Emit approval:status socket event
    req.io?.to(`event:${event._id}`).emit('approval:status', {
      eventId: event._id, stage: 'submitted', status: 'pending',
    });

    res.json({ success: true, message: 'Event submitted for approval', data: { event } });
  } catch (err) { next(err); }
};

// @route PATCH /api/events/:id/approve
exports.approveEvent = async (req, res, next) => {
  try {
    const { status, comment } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const userRole = req.user.role;

    // super_admin can fully approve or reject in one step
    if (userRole === 'super_admin') {
      if (status === 'rejected') {
        event.status = 'rejected';
        event.approvalChain.forEach(s => { if (s.status === 'pending') { s.status = 'rejected'; s.user = req.user._id; s.timestamp = new Date(); s.comment = comment || ''; } });
      } else {
        event.status = 'approved';
        event.registrationOpen = true;
        event.approvalChain.forEach(s => { s.status = 'approved'; s.user = req.user._id; s.timestamp = new Date(); s.comment = comment || 'Auto-approved by admin'; });
      }
      await event.save();
      req.io?.to(`event:${event._id}`).emit('approval:status', { eventId: event._id, stage: 'admin', status, comment });
      await cacheDel('dashboard:kpis');
      return res.json({ success: true, data: { event } });
    }

    const roleStepMap = { hod: 0, dean: 1, finance: 2 };
    if (!['hod','dean','finance'].includes(userRole))
      return res.status(403).json({ success: false, message: 'Not an approver role' });

    const stepIndex = roleStepMap[userRole];
    const step = event.approvalChain[stepIndex];
    if (!step) return res.status(400).json({ success: false, message: 'Invalid approval step' });
    if (step.status !== 'pending')
      return res.status(400).json({ success: false, message: 'This step already processed' });

    // Ensure previous step was approved
    if (stepIndex > 0 && event.approvalChain[stepIndex - 1].status !== 'approved')
      return res.status(400).json({ success: false, message: 'Previous approval step pending' });

    step.status = status;
    step.user = req.user._id;
    step.comment = comment || '';
    step.timestamp = new Date();

    if (status === 'rejected') {
      event.status = 'rejected';
    } else if (stepIndex === 2) {
      event.status = 'approved';
      event.registrationOpen = true;
    } else {
      event.status = ['hod_approved', 'dean_approved'][stepIndex];
    }

    await event.save();
    req.io?.to(`event:${event._id}`).emit('approval:status', { eventId: event._id, stage: userRole, status, comment });
    await cacheDel('dashboard:kpis');

    res.json({ success: true, data: { event } });
  } catch (err) { next(err); }
};

// @route PATCH /api/events/:id/registration-toggle
exports.toggleRegistration = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.status !== 'approved')
      return res.status(400).json({ success: false, message: 'Only approved events can toggle registrations' });

    event.registrationOpen = !event.registrationOpen;
    await event.save();
    res.json({ success: true, data: { registrationOpen: event.registrationOpen, event } });
  } catch (err) { next(err); }
};

// @route DELETE /api/events/:id
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    await cacheDel('dashboard:kpis');
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) { next(err); }
};
