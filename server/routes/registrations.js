const express = require('express');
const router = express.Router();
const {
  register, getRegistrations, checkIn, scanQR, exportCSV,
} = require('../controllers/registrationController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

router.post('/', optionalAuth, register);
router.get('/event/:eventId', protect, getRegistrations);
router.patch('/:id/checkin', protect, authorize('organizer','hod','super_admin'), checkIn);
router.post('/scan', protect, authorize('organizer','hod','super_admin'), scanQR);
router.get('/event/:eventId/export', protect, authorize('organizer','hod','finance','super_admin'), exportCSV);

module.exports = router;
