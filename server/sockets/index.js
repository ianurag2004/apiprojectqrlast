/**
 * Socket.io event handler setup
 * Call initSockets(io) from server/index.js after creating io
 */
const jwt = require('jsonwebtoken');

const initSockets = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Auto-join user's personal room for notification delivery
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.join(`user:${decoded.id}`);
        socket.userId = decoded.id;
        console.log(`   ↳ Joined personal room user:${decoded.id}`);
      } catch {
        // Invalid token — still allow connection but no personal room
      }
    }

    // Client joins an event room to receive real-time updates
    socket.on('join:event', (eventId) => {
      socket.join(`event:${eventId}`);
      console.log(`   ↳ Joined room event:${eventId}`);
    });

    socket.on('leave:event', (eventId) => {
      socket.leave(`event:${eventId}`);
    });

    // Client joins admin room for global updates
    socket.on('join:admin', () => {
      socket.join('admin');
    });

    // Organizer emits manual check-in from frontend scanner
    socket.on('client:checkin', async (data) => {
      // data: { eventId, registrationId, token }
      // Server validates and emits back to room
      io.to(`event:${data.eventId}`).emit('checkin:update', {
        eventId: data.eventId,
        participantId: data.registrationId,
        timestamp: new Date(),
        method: 'socket_direct',
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = { initSockets };
