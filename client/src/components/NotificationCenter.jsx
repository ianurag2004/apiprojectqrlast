import { useEffect, useState, useRef } from 'react';
import { useNotificationStore } from '../store/notificationStore';
import { useSocketStore } from '../store/socketStore';
import { useNavigate } from 'react-router-dom';
import {
  Bell, X, CheckCheck, Loader2,
  ClipboardList, CheckCircle2, Award, Calendar, Info,
} from 'lucide-react';

const ICON_MAP = {
  registration: ClipboardList,
  checkin: CheckCircle2,
  certificate: Award,
  approval: Calendar,
  event_reminder: Calendar,
  system: Info,
};

const COLOR_MAP = {
  registration: 'text-blue-400 bg-blue-500/15',
  checkin: 'text-emerald-400 bg-emerald-500/15',
  certificate: 'text-amber-400 bg-amber-500/15',
  approval: 'text-purple-400 bg-purple-500/15',
  event_reminder: 'text-cyan-400 bg-cyan-500/15',
  system: 'text-white/60 bg-white/10',
};

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const {
    notifications, unread, loading,
    fetchNotifications, markRead, markAllRead, pushNotification,
  } = useNotificationStore();

  const { socket } = useSocketStore();

  // Fetch on mount + listen for real-time pushes
  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => pushNotification(data);
    socket.on('notification:new', handler);
    return () => socket.off('notification:new', handler);
  }, [socket, pushNotification]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = (notif) => {
    if (!notif.read) markRead(notif._id);
    if (notif.link) navigate(notif.link);
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        id="notification-bell"
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
        className="relative p-2 rounded-xl hover:bg-white/10 transition-colors text-white/70 hover:text-white"
        title="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-red-500/40">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className="absolute right-0 top-12 w-[380px] max-h-[500px] rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden animate-slide-in"
          style={{ background: '#12102B', backdropFilter: 'blur(20px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-primary-400" />
              <h3 className="font-semibold text-white text-sm">Notifications</h3>
              {unread > 0 && (
                <span className="bg-primary-500/20 text-primary-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-primary-400 hover:text-primary-300 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck size={12} /> Read all
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto max-h-[400px] scrollbar-thin">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-primary-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-16 text-center">
                <Bell size={28} className="mx-auto mb-2 text-white/10" />
                <p className="text-white/30 text-sm">No notifications yet</p>
              </div>
            ) : (
              <div>
                {notifications.map((n) => {
                  const Icon = ICON_MAP[n.type] || Bell;
                  const colorClass = COLOR_MAP[n.type] || COLOR_MAP.system;

                  return (
                    <button
                      key={n._id}
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-5 py-3.5 flex items-start gap-3 transition-colors border-b border-white/5 last:border-0 ${
                        n.read
                          ? 'hover:bg-white/[0.03]'
                          : 'bg-primary-500/[0.04] hover:bg-primary-500/[0.08]'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${colorClass}`}>
                        <Icon size={16} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${n.read ? 'text-white/60' : 'text-white'}`}>
                            {n.title}
                          </span>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-primary-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-white/25 mt-1 block">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
