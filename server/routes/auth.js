const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, getMe } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// List users (for volunteer assignment dropdown)
router.get('/users', protect, authorize('organizer', 'hod', 'super_admin'), async (req, res, next) => {
  try {
    const users = await User.find({ isActive: true }, 'name email department role').lean();
    res.json({ success: true, data: { users } });
  } catch (err) { next(err); }
});

module.exports = router;
