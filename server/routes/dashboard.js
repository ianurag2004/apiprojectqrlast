const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Budget = require('../models/Budget');
const Volunteer = require('../models/Volunteer');
const { protect } = require('../middleware/auth');
const { cacheGet, cacheSet } = require('../config/redis');

/**
 * GET /api/dashboard
 * Returns KPI data for the dashboard page.
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const cacheKey = 'dashboard:kpis';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true });

    const [totalEvents, totalRegistrations, budgets, upcomingEvents] = await Promise.all([
      Event.countDocuments(),
      Registration.countDocuments(),
      Budget.find({}, 'totalApproved actualSpend').lean(),
      Event.find({ status: 'approved', date: { $gte: new Date() } })
        .sort({ date: 1 }).limit(5)
        .populate('organizer', 'name avatar').lean(),
    ]);

    const totalBudget = budgets.reduce((s, b) => s + (b.totalApproved || 0), 0);
    const checkedIn = await Registration.countDocuments({ checkedIn: true });
    const pendingApprovals = await Event.countDocuments({ status: { $in: ['pending', 'hod_approved', 'dean_approved'] } });
    const totalVolunteers = await Volunteer.countDocuments();

    const kpis = {
      totalEvents,
      totalRegistrations,
      checkedIn,
      totalBudget,
      pendingApprovals,
      totalVolunteers,
      upcomingEvents,
    };

    await cacheSet(cacheKey, JSON.stringify(kpis), 300);
    res.json({ success: true, data: kpis });
  } catch (err) { next(err); }
});

module.exports = router;
