const express = require('express');
const router = express.Router();
const { generateAnalytics, getAnalytics, getDashboardKPIs } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, getDashboardKPIs);
router.get('/event/:eventId', protect, getAnalytics);
router.post('/event/:eventId/generate', protect, authorize('organizer','hod','super_admin'), generateAnalytics);

module.exports = router;
