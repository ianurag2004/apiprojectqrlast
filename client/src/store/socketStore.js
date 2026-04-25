import { io } from 'socket.io-client';
import { create } from 'zustand';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socketInstance = null;

export const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,
  events: [],

  connect: () => {
    if (socketInstance?.connected) return;
    const token = localStorage.getItem('accessToken');
    socketInstance = io(SOCKET_URL, {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      set({ socket: socketInstance, connected: true });
      console.log('🔌 Socket connected:', socketInstance.id);
    });

    socketInstance.on('disconnect', () => {
      set({ connected: false });
    });

    // Global event listeners (add to feed)
    ['registration:new', 'checkin:update', 'approval:status', 'volunteer:alert', 'analytics:ready']
      .forEach(ev => {
        socketInstance.on(ev, (data) => {
          set(state => ({
            events: [{ type: ev, data, time: new Date() }, ...state.events.slice(0, 49)],
          }));
        });
      });

    set({ socket: socketInstance });
  },

  joinEventRoom: (eventId) => {
    socketInstance?.emit('join:event', eventId);
  },

  leaveEventRoom: (eventId) => {
    socketInstance?.emit('leave:event', eventId);
  },

  joinAdmin: () => {
    socketInstance?.emit('join:admin');
  },

  disconnect: () => {
    socketInstance?.disconnect();
    socketInstance = null;
    set({ socket: null, connected: false, events: [] });
  },

  clearEvents: () => set({ events: [] }),
}));
