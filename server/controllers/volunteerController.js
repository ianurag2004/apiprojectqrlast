const Volunteer = require('../models/Volunteer');
const Event = require('../models/Event');
const User = require('../models/User');
const { balanceVolunteers } = require('../services/aiProxy');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');

// @route GET /api/volunteers/event/:eventId
exports.getVolunteers = async (req, res, next) => {
  try {
    const volunteers = await Volunteer.find({ event: req.params.eventId })
      .populate('user', 'name email department avatar')
      .lean();
    res.json({ success: true, data: { volunteers } });
  } catch (err) { next(err); }
};

// @route POST /api/volunteers
exports.addVolunteer = async (req, res, next) => {
  try {
    const { eventId, userId, role, tasksAssigned } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const volunteer = await Volunteer.create({
      event: eventId, user: userId, role, tasksAssigned: tasksAssigned || [],
    });
    await volunteer.populate('user', 'name email avatar');

    req.io?.to(`event:${eventId}`).emit('volunteer:alert', {
      eventId, message: `New volunteer ${user.name} added as ${role}`,
    });

    res.status(201).json({ success: true, data: { volunteer } });
  } catch (err) { next(err); }
};

// @route PATCH /api/volunteers/:id
exports.updateVolunteer = async (req, res, next) => {
  try {
    const allowed = ['role','tasksAssigned','hoursWorked','status','notes'];
    const volunteer = await Volunteer.findById(req.params.id);
    if (!volunteer) return res.status(404).json({ success: false, message: 'Volunteer not found' });
    allowed.forEach(f => { if (req.body[f] !== undefined) volunteer[f] = req.body[f]; });
    await volunteer.save();
    res.json({ success: true, data: { volunteer } });
  } catch (err) { next(err); }
};

// @route DELETE /api/volunteers/:id
exports.removeVolunteer = async (req, res, next) => {
  try {
    await Volunteer.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Volunteer removed' });
  } catch (err) { next(err); }
};

// @route GET /api/volunteers/event/:eventId/balance
exports.balanceReport = async (req, res, next) => {
  try {
    const cacheKey = `ai:volunteers:${req.params.eventId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true });

    const volunteers = await Volunteer.find({ event: req.params.eventId })
      .populate('user', 'name').lean();

    const payload = volunteers.map(v => ({
      id: v._id.toString(),
      name: v.user?.name || 'Unknown',
      role: v.role,
      tasks_assigned: v.tasksAssigned?.length || 0,
      hours_worked: v.hoursWorked || 0,
    }));

    const result = await balanceVolunteers({ volunteers: payload });

    // Update workload scores in DB
    for (const score of result.scores || []) {
      await Volunteer.findByIdAndUpdate(score.id, { workloadScore: score.workload_score });
    }

    // Emit alert if imbalanced
    if ((result.overloaded?.length || 0) > 0) {
      req.io?.to(`event:${req.params.eventId}`).emit('volunteer:alert', {
        eventId: req.params.eventId,
        message: `${result.overloaded.length} volunteer(s) are overloaded — review workload`,
        overloaded: result.overloaded,
      });
    }

    await cacheSet(cacheKey, JSON.stringify(result), 3600);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
