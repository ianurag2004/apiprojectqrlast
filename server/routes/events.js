const express = require('express');
const router = express.Router();
const {
  getEvents, createEvent, getEvent, updateEvent,
  submitEvent, approveEvent, deleteEvent,
} = require('../controllers/eventController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, getEvents);
router.post('/', protect, authorize('organizer','hod','dean','finance','super_admin'), createEvent);
router.get('/:id', optionalAuth, getEvent);
router.put('/:id', protect, authorize('organizer','super_admin'), updateEvent);
router.patch('/:id/submit', protect, authorize('organizer','super_admin'), submitEvent);
router.patch('/:id/approve', protect, authorize('hod','dean','finance','super_admin'), approveEvent);
router.delete('/:id', protect, authorize('super_admin'), deleteEvent);

module.exports = router;
