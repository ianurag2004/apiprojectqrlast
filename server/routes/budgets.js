const express = require('express');
const router = express.Router();
const { getBudget, createBudget, updateBudget, aiSuggest } = require('../controllers/budgetController');
const { protect, authorize } = require('../middleware/auth');

router.get('/event/:eventId', protect, getBudget);
router.post('/event/:eventId', protect, authorize('organizer','super_admin'), createBudget);
router.patch('/event/:eventId', protect, authorize('finance','super_admin'), updateBudget);
router.get('/event/:eventId/ai-suggest', protect, aiSuggest);

module.exports = router;
