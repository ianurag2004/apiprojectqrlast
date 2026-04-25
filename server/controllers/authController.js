const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { cacheSet, cacheDel } = require('../config/redis');

const signTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// @route POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, department, phone } = req.body;

    // Prevent self-assigning admin roles without invite (demo: allow all)
    const safeRole = ['super_admin', 'hod', 'dean', 'finance'].includes(role)
      ? (req.user?.role === 'super_admin' ? role : 'participant')
      : (role || 'participant');

    const user = await User.create({ name, email, password, role: safeRole, department, phone });
    const { accessToken, refreshToken } = signTokens(user._id);

    // Store refresh token in Redis (7d TTL)
    await cacheSet(`refresh:${user._id}`, refreshToken, 7 * 24 * 3600);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, accessToken },
    });
  } catch (err) { next(err); }
};

// @route POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.isActive)
      return res.status(403).json({ success: false, message: 'Account deactivated' });

    const { accessToken, refreshToken } = signTokens(user._id);
    await cacheSet(`refresh:${user._id}`, refreshToken, 7 * 24 * 3600);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userObj = user.toJSON();
    res.json({ success: true, data: { user: userObj, accessToken } });
  } catch (err) { next(err); }
};

// @route POST /api/auth/refresh
exports.refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'No refresh token' });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    const { accessToken, refreshToken: newRefresh } = signTokens(user._id);
    await cacheSet(`refresh:${user._id}`, newRefresh, 7 * 24 * 3600);

    res.cookie('refreshToken', newRefresh, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { accessToken, user } });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

// @route POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    // Blacklist access token
    const token = req.headers.authorization?.split(' ')[1];
    if (token) await cacheSet(`blacklist:${token}`, '1', 900); // 15min TTL

    await cacheDel(`refresh:${req.user._id}`);
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) { next(err); }
};

// @route GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};
