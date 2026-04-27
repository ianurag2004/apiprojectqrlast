require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const { initSockets } = require('./sockets');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const budgetRoutes = require('./routes/budgets');
const registrationRoutes = require('./routes/registrations');
const volunteerRoutes = require('./routes/volunteers');
const aiRoutes = require('./routes/ai');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const certificateRoutes = require('./routes/certificates');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const httpServer = http.createServer(app);

// Socket.io setup
// Allow any localhost Vite dev port (5173-5179) in development
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.CLIENT_URL,
      'https://apiprojectqrlast1.vercel.app',
      'https://apiprojectqrlast-git-main-ianurag101-7414s-projects.vercel.app',
    ].filter(Boolean)
  : [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      process.env.CLIENT_URL,
    ].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Connect databases
connectDB();
connectRedis();
initSockets(io);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Attach io instance to every request (so controllers can emit)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'FestOS Server',
    university: 'Manav Rachna University',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`\n🎉 FestOS Server running on port ${PORT}`);
  console.log(`📡 Socket.io enabled`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = { app, io };
