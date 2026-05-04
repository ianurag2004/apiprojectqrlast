/**
 * Socket.io event handler setup
 * Call initSockets(io) from server/index.js after creating io
 */
const jwt = require('jsonwebtoken');

const initSockets = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Auto-join user's personal room for notification + DM delivery
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

    // ── Chat rooms ──────────────────────────────────────────────────────────
    // Join the global group chat room
    socket.on('join:group-chat', () => {
      socket.join('chat:group');
      console.log(`   ↳ Joined chat:group`);
    });

    // Leave the global group chat room
    socket.on('leave:group-chat', () => {
      socket.leave('chat:group');
    });

    // Real-time group message relay (message already persisted via REST)
    socket.on('chat:group:send', (msg) => {
      io.to('chat:group').emit('chat:group:message', msg);
    });

    // Real-time DM relay — deliver to both sender and recipient personal rooms
    socket.on('chat:dm:send', (msg) => {
      // msg should contain { recipientId, ... }
      if (msg?.recipientId) {
        io.to(`user:${msg.recipientId}`).emit('chat:dm:message', msg);
        // Also echo back to sender's own room so other tabs stay in sync
        if (socket.userId) {
          io.to(`user:${socket.userId}`).emit('chat:dm:message', msg);
        }
      }
    });
    // ── End Chat ────────────────────────────────────────────────────────────

    // Organizer emits manual check-in from frontend scanner
    socket.on('client:checkin', async (data) => {
      // data: { eventId, registrationId, token }
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
