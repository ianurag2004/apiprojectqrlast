import { create } from 'zustand';
import api from '../api/axios';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unread: 0,
  total: 0,
  loading: false,

  /** Fetch notifications from the server */
  fetchNotifications: async (page = 1) => {
    set({ loading: true });
    try {
      const { data } = await api.get('/notifications', { params: { page, limit: 20 } });
      set({
        notifications: data.data.notifications,
        unread: data.data.unread,
        total: data.data.total,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  /** Mark a single notification as read */
  markRead: async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      set(state => ({
        notifications: state.notifications.map(n =>
          n._id === id ? { ...n, read: true, readAt: new Date() } : n
        ),
        unread: Math.max(0, state.unread - 1),
      }));
    } catch {}
  },

  /** Mark all notifications as read */
  markAllRead: async () => {
    try {
      await api.patch('/notifications/read-all');
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, read: true, readAt: new Date() })),
        unread: 0,
      }));
    } catch {}
  },

  /** Push a new real-time notification from socket */
  pushNotification: (notif) => {
    set(state => ({
      notifications: [notif, ...state.notifications.slice(0, 49)],
      unread: state.unread + 1,
    }));
  },
}));
