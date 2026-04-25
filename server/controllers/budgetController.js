const Budget = require('../models/Budget');
const Event = require('../models/Event');
const { optimizeBudget } = require('../services/aiProxy');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');

// @route GET /api/budgets/event/:eventId
exports.getBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({ event: req.params.eventId })
      .populate('event', 'title type date');
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });
    res.json({ success: true, data: { budget } });
  } catch (err) { next(err); }
};

// @route POST /api/budgets/event/:eventId
exports.createBudget = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'super_admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const { totalRequested, allocation, sponsors } = req.body;

    // Get AI recommendation
    let aiRecommended = null;
    try {
      const predictedTurnout = event.aiPredictedTurnout || event.expectedAttendance;
      const aiResult = await optimizeBudget({
        event_type: event.type,
        predicted_turnout: predictedTurnout,
        total_budget: totalRequested,
        sponsorship: (sponsors || []).filter(s => s.status === 'confirmed')
          .reduce((sum, s) => sum + s.amount, 0),
      });
      aiRecommended = aiResult.recommended_total;
    } catch {}

    const budget = await Budget.create({
      event: req.params.eventId,
      totalRequested,
      aiRecommended,
      allocation: allocation || {},
      sponsors: sponsors || [],
      approvalStatus: 'pending',
    });

    await Event.findByIdAndUpdate(req.params.eventId, { budget: budget._id });
    await cacheDel(`ai:budget:${req.params.eventId}`);

    res.status(201).json({ success: true, data: { budget } });
  } catch (err) { next(err); }
};

// @route PATCH /api/budgets/event/:eventId
exports.updateBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({ event: req.params.eventId });
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });

    const allowed = ['totalRequested','allocation','actualSpend','sponsors','approvalStatus','financeComment','totalApproved'];
    allowed.forEach(f => { if (req.body[f] !== undefined) budget[f] = req.body[f]; });
    await budget.save();

    res.json({ success: true, data: { budget } });
  } catch (err) { next(err); }
};

// @route GET /api/budgets/event/:eventId/ai-suggest
exports.aiSuggest = async (req, res, next) => {
  try {
    const cacheKey = `ai:budget:${req.params.eventId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true });

    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const budget = await Budget.findOne({ event: event._id });
    const sponsorship = budget
      ? budget.sponsors.filter(s => s.status === 'confirmed').reduce((sum, s) => sum + s.amount, 0)
      : 0;

    const result = await optimizeBudget({
      event_type: event.type,
      predicted_turnout: event.aiPredictedTurnout || event.expectedAttendance,
      total_budget: budget?.totalRequested,
      sponsorship,
    });

    await cacheSet(cacheKey, JSON.stringify(result), 3600);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
