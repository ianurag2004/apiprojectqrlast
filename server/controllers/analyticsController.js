const Analytics = require('../models/Analytics');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Budget = require('../models/Budget');
const Volunteer = require('../models/Volunteer');
const { scoreEngagement } = require('../services/aiProxy');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');

// @route POST /api/analytics/event/:eventId/generate
exports.generateAnalytics = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const [registrations, budget, volunteers] = await Promise.all([
      Registration.find({ event: event._id }).lean(),
      Budget.findOne({ event: event._id }).lean(),
      Volunteer.find({ event: event._id }).lean(),
    ]);

    const actualTurnout = registrations.filter(r => r.checkedIn).length;
    const attendanceRate = actualTurnout / Math.max(event.venueCapacity, 1);
    const totalActualSpend = budget
      ? Object.values(budget.actualSpend || {}).reduce((s, v) => s + (v || 0), 0)
      : 0;
    const budgetUtilization = budget?.totalApproved
      ? totalActualSpend / budget.totalApproved
      : 0;

    // Registration timeline (group by day)
    const timeline = {};
    registrations.forEach(r => {
      const day = new Date(r.createdAt).toISOString().split('T')[0];
      timeline[day] = (timeline[day] || 0) + 1;
    });
    const registrationTimeline = Object.entries(timeline)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    const feedbackAvg = req.body.feedbackAvg || 4.0;
    const socialReach = req.body.socialReach || actualTurnout * 2;

    // AI engagement score
    let engagementResult = { engagement_score: 0, grade: 'N/A', insights: [] };
    try {
      engagementResult = await scoreEngagement({
        attendance_rate: attendanceRate,
        budget_utilization: budgetUtilization,
        feedback_avg: feedbackAvg,
        social_reach: socialReach,
        actual_attendance: actualTurnout,
      });
    } catch (e) {
      console.warn('Engagement score failed:', e.message);
    }

    const analytics = await Analytics.findOneAndUpdate(
      { event: event._id },
      {
        event: event._id,
        predictedTurnout: event.aiPredictedTurnout || event.expectedAttendance,
        actualTurnout,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        budgetRequested: budget?.totalRequested || 0,
        budgetApproved: budget?.totalApproved || 0,
        actualSpend: totalActualSpend,
        budgetUtilization: Math.round(budgetUtilization * 100) / 100,
        engagementScore: engagementResult.engagement_score,
        engagementGrade: engagementResult.grade,
        feedbackAvg,
        socialReach,
        volunteerCount: volunteers.length,
        registrationTimeline,
        insights: engagementResult.insights || [],
        generatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    await cacheDel(`analytics:${req.params.eventId}`);
    req.io?.to(`event:${req.params.eventId}`).emit('analytics:ready', { eventId: event._id });

    res.json({ success: true, data: { analytics } });
  } catch (err) { next(err); }
};

// @route GET /api/analytics/event/:eventId
exports.getAnalytics = async (req, res, next) => {
  try {
    const cacheKey = `analytics:${req.params.eventId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true });

    const analytics = await Analytics.findOne({ event: req.params.eventId })
      .populate('event', 'title type date venue');
    if (!analytics) return res.status(404).json({ success: false, message: 'Analytics not yet generated' });

    await cacheSet(cacheKey, JSON.stringify({ analytics }), 300);
    res.json({ success: true, data: { analytics } });
  } catch (err) { next(err); }
};

// @route GET /api/analytics/dashboard
exports.getDashboardKPIs = async (req, res, next) => {
  try {
    const cacheKey = 'dashboard:kpis';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true });

    const [totalEvents, totalRegistrations, budgets, upcomingEvents, recentAnalytics] = await Promise.all([
      Event.countDocuments(),
      Registration.countDocuments(),
      Budget.find({}, 'totalApproved actualSpend').lean(),
      Event.find({ status: 'approved', date: { $gte: new Date() } })
        .sort({ date: 1 }).limit(5)
        .populate('organizer', 'name avatar').lean(),
      Analytics.find().sort({ generatedAt: -1 }).limit(3)
        .populate('event', 'title type').lean(),
    ]);

    const totalBudget = budgets.reduce((s, b) => s + (b.totalApproved || 0), 0);
    const checkedIn = await Registration.countDocuments({ checkedIn: true });
    const pendingApprovals = await Event.countDocuments({ status: { $in: ['pending','hod_approved','dean_approved'] } });

    const kpis = {
      totalEvents,
      totalRegistrations,
      checkedIn,
      totalBudget,
      pendingApprovals,
      upcomingEvents,
      recentAnalytics,
    };

    await cacheSet(cacheKey, JSON.stringify(kpis), 300);
    res.json({ success: true, data: kpis });
  } catch (err) { next(err); }
};
