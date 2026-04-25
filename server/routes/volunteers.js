const express = require('express');
const router = express.Router();
const {
  getVolunteers, addVolunteer, updateVolunteer, removeVolunteer, balanceReport,
} = require('../controllers/volunteerController');
const { protect, authorize } = require('../middleware/auth');

router.get('/event/:eventId', protect, getVolunteers);
router.post('/', protect, authorize('organizer','hod','super_admin'), addVolunteer);
router.patch('/:id', protect, authorize('organizer','hod','super_admin'), updateVolunteer);
router.delete('/:id', protect, authorize('organizer','hod','super_admin'), removeVolunteer);
router.get('/event/:eventId/balance', protect, balanceReport);

module.exports = router;
