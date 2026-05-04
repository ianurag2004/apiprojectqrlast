import { create } from 'zustand';
import api from '../api/axios';

export const useChatStore = create((set, get) => ({
  // List of all users available for DM
  users: [],
  usersLoaded: false,

  // Group messages
  groupMessages: [],
  groupLoading: false,

  // DM threads keyed by userId
  dmThreads: {},   // { [userId]: Message[] }
  dmLoading: {},   // { [userId]: boolean }

  // Unread count map { [senderId]: number }
  unreadCounts: {},

  // Active view: 'group' | userId string
  activeThread: 'group',

  setActiveThread: (id) => set({ activeThread: id }),

  // ── Users ─────────────────────────────────────────────────────────────────
  fetchUsers: async () => {
    try {
      const { data } = await api.get('/messages/users');
      set({ users: data.data, usersLoaded: true });
    } catch (err) {
      console.error('fetchUsers error', err);
    }
  },

  // ── Unread ────────────────────────────────────────────────────────────────
  fetchUnread: async () => {
    try {
      const { data } = await api.get('/messages/unread');
      set({ unreadCounts: data.data });
    } catch {}
  },

  markDmRead: (userId) => {
    set(state => {
      const counts = { ...state.unreadCounts };
      delete counts[userId];
      return { unreadCounts: counts };
    });
  },

  // ── Group Chat ────────────────────────────────────────────────────────────
  fetchGroupMessages: async () => {
    set({ groupLoading: true });
    try {
      const { data } = await api.get('/messages/group?limit=60');
      set({ groupMessages: data.data, groupLoading: false });
    } catch {
      set({ groupLoading: false });
    }
  },

  sendGroupMessage: async (content, socket) => {
    try {
      const { data } = await api.post('/messages/group', { content });
      // REST already broadcasts via socket on server side, but add locally
      // (server emits to chat:group room so sender gets it too if joined)
      return data.data;
    } catch (err) {
      throw err;
    }
  },

  // Called when socket delivers a group message
  receiveGroupMessage: (msg) => {
    set(state => {
      // Prevent duplicates (server emits back to sender too)
      const exists = state.groupMessages.some(m => m._id === msg._id);
      if (exists) return {};
      return { groupMessages: [...state.groupMessages, msg] };
    });
  },

  // ── Direct Messages ───────────────────────────────────────────────────────
  fetchDmThread: async (userId) => {
    set(state => ({ dmLoading: { ...state.dmLoading, [userId]: true } }));
    try {
      const { data } = await api.get(`/messages/dm/${userId}?limit=60`);
      set(state => ({
        dmThreads: { ...state.dmThreads, [userId]: data.data },
        dmLoading: { ...state.dmLoading, [userId]: false },
      }));
      // Mark as read locally
      get().markDmRead(userId);
    } catch {
      set(state => ({ dmLoading: { ...state.dmLoading, [userId]: false } }));
    }
  },

  sendDmMessage: async (userId, content) => {
    try {
      const { data } = await api.post(`/messages/dm/${userId}`, { content });
      return data.data;
    } catch (err) {
      throw err;
    }
  },

  // Called when socket delivers a DM
  receiveDmMessage: (msg, myId) => {
    const otherId =
      msg.sender._id === myId ? msg.recipient : msg.sender._id;

    set(state => {
      const thread = state.dmThreads[otherId] || [];
      const exists = thread.some(m => m._id === msg._id);
      if (exists) return {};

      const isActive = state.activeThread === otherId;
      const newUnread = isActive
        ? state.unreadCounts
        : {
            ...state.unreadCounts,
            [msg.sender._id]: (state.unreadCounts[msg.sender._id] || 0) + 1,
          };

      return {
        dmThreads: { ...state.dmThreads, [otherId]: [...thread, msg] },
        unreadCounts: newUnread,
      };
    });
  },
}));
