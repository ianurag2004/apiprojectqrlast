import { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import {
  Send, Users, MessageSquare, Search, Hash, Lock, Circle,
  ChevronDown, Smile, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_COLORS = {
  super_admin: '#a855f7',
  hod: '#3b82f6',
  dean: '#06b6d4',
  organizer: '#10b981',
  volunteer: '#f59e0b',
  participant: '#6b7280',
  finance: '#ec4899',
};

const ROLE_LABELS = {
  super_admin: 'Admin',
  hod: 'HoD',
  dean: 'Dean',
  organizer: 'Organizer',
  volunteer: 'Volunteer',
  participant: 'Participant',
  finance: 'Finance',
};

function avatarUrl(name) {
  return `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=7c3aed&textColor=ffffff`;
}

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isOwn, showAvatar }) {
  const role = msg.sender?.role;
  const roleColor = ROLE_COLORS[role] || '#6b7280';

  return (
    <div className={`flex items-end gap-2 group ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-7 h-7 ${showAvatar ? 'visible' : 'invisible'}`}>
        <img
          src={avatarUrl(msg.sender?.name)}
          alt={msg.sender?.name}
          className="w-7 h-7 rounded-lg object-cover"
        />
      </div>

      <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name + role badge */}
        {showAvatar && !isOwn && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <span className="text-xs font-semibold text-white/80">{msg.sender?.name}</span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: roleColor + '22', color: roleColor }}
            >
              {ROLE_LABELS[role] || role}
            </span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed shadow-sm transition-all duration-150 ${
            isOwn
              ? 'bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-br-sm'
              : 'bg-white/8 text-white/90 rounded-bl-sm border border-white/8'
          }`}
        >
          {msg.content}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-white/30 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {formatTime(msg.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ─── Message Input ────────────────────────────────────────────────────────────

function MessageInput({ onSend, placeholder = 'Type a message…' }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setText('');
      textareaRef.current?.focus();
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t border-white/8 bg-surface-100/50">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="w-full resize-none bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition-all scrollbar-thin"
          style={{ maxHeight: 120, overflowY: 'auto' }}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
        />
      </div>
      <button
        id="chat-send-btn"
        onClick={handleSend}
        disabled={!text.trim() || sending}
        className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:from-violet-500 hover:to-violet-600 transition-all active:scale-95"
      >
        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
      </button>
    </div>
  );
}

// ─── User List Item ───────────────────────────────────────────────────────────

function UserItem({ user, isActive, unread, onClick }) {
  const roleColor = ROLE_COLORS[user.role] || '#6b7280';
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
        isActive ? 'bg-violet-600/25 border border-violet-500/30' : 'hover:bg-white/5 border border-transparent'
      }`}
    >
      <div className="relative flex-shrink-0">
        <img src={avatarUrl(user.name)} alt={user.name} className="w-8 h-8 rounded-lg" />
        <div
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface-100"
          style={{ background: '#10b981' }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{user.name}</div>
        <div className="text-[10px]" style={{ color: roleColor }}>
          {ROLE_LABELS[user.role] || user.role}
        </div>
      </div>
      {unread > 0 && (
        <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user: me } = useAuthStore();
  const { socket } = useSocketStore();
  const {
    users, usersLoaded, fetchUsers,
    groupMessages, groupLoading, fetchGroupMessages, sendGroupMessage, receiveGroupMessage,
    dmThreads, dmLoading, fetchDmThread, sendDmMessage, receiveDmMessage,
    unreadCounts, fetchUnread,
    activeThread, setActiveThread,
  } = useChatStore();

  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Initial data load
  useEffect(() => {
    fetchUsers();
    fetchUnread();
    fetchGroupMessages();
  }, []);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [groupMessages, dmThreads, activeThread]);

  // Socket integration
  useEffect(() => {
    if (!socket) return;

    // Join group chat room
    socket.emit('join:group-chat');

    const onGroupMsg = (msg) => receiveGroupMessage(msg);
    const onDmMsg = (msg) => receiveDmMessage(msg, me._id);

    socket.on('chat:group:message', onGroupMsg);
    socket.on('chat:dm:message', onDmMsg);

    return () => {
      socket.emit('leave:group-chat');
      socket.off('chat:group:message', onGroupMsg);
      socket.off('chat:dm:message', onDmMsg);
    };
  }, [socket, me._id]);

  // Load DM thread when switching to a user
  useEffect(() => {
    if (activeThread !== 'group' && !dmThreads[activeThread]) {
      fetchDmThread(activeThread);
    }
  }, [activeThread]);

  // Derived
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const activeUser = activeThread !== 'group' ? users.find(u => u._id === activeThread) : null;

  const currentMessages =
    activeThread === 'group' ? groupMessages : (dmThreads[activeThread] || []);

  const isLoading =
    activeThread === 'group' ? groupLoading : (dmLoading[activeThread] || false);

  const handleSend = async (content) => {
    if (activeThread === 'group') {
      await sendGroupMessage(content, socket);
    } else {
      await sendDmMessage(activeThread, content);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-0 rounded-2xl overflow-hidden border border-white/8 shadow-2xl">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-surface-50 border-r border-white/8">

        {/* Header */}
        <div className="px-4 py-4 border-b border-white/8">
          <h1 className="font-display font-bold text-white text-base flex items-center gap-2">
            <MessageSquare size={16} className="text-violet-400" />
            Messages
            {totalUnread > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-violet-500 text-white px-1.5 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </h1>
        </div>

        {/* Group Chat Button */}
        <div className="px-3 pt-3 pb-1">
          <button
            id="chat-group-btn"
            onClick={() => setActiveThread('group')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
              activeThread === 'group'
                ? 'bg-violet-600/25 border border-violet-500/30'
                : 'hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center flex-shrink-0">
              <Hash size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">Group Chat</div>
              <div className="text-[10px] text-white/40">All demo users</div>
            </div>
          </button>
        </div>

        {/* DM Users */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-1.5 px-1 mb-2">
            <Lock size={10} className="text-white/30" />
            <span className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">
              Direct Messages
            </span>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              id="chat-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users…"
              className="w-full bg-white/5 border border-white/8 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-all"
            />
          </div>

          {/* User list */}
          <div className="space-y-0.5 overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            {!usersLoaded ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={16} className="animate-spin text-violet-400" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-4 text-xs text-white/30">No users found</div>
            ) : (
              filteredUsers.map(u => (
                <UserItem
                  key={u._id}
                  user={u}
                  isActive={activeThread === u._id}
                  unread={unreadCounts[u._id] || 0}
                  onClick={() => {
                    setActiveThread(u._id);
                    if (unreadCounts[u._id]) fetchDmThread(u._id);
                  }}
                />
              ))
            )}
          </div>
        </div>
      </aside>

      {/* ── Chat Area ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-[#0f1117] min-w-0">

        {/* Chat Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/8 bg-surface-50/60 backdrop-blur-sm">
          {activeThread === 'group' ? (
            <>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
                <Hash size={16} className="text-white" />
              </div>
              <div>
                <div className="font-semibold text-white text-sm">Group Chat</div>
                <div className="text-xs text-white/40">
                  {users.length + 1} participants · everyone can see this
                </div>
              </div>
            </>
          ) : activeUser ? (
            <>
              <div className="relative">
                <img src={avatarUrl(activeUser.name)} alt={activeUser.name} className="w-9 h-9 rounded-xl" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0f1117]" />
              </div>
              <div>
                <div className="font-semibold text-white text-sm">{activeUser.name}</div>
                <div className="text-xs" style={{ color: ROLE_COLORS[activeUser.role] }}>
                  {ROLE_LABELS[activeUser.role] || activeUser.role}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1 text-xs text-emerald-400">
                <Circle size={6} className="fill-emerald-400" />
                Online
              </div>
            </>
          ) : null}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Loader2 size={28} className="animate-spin text-violet-400 mx-auto" />
                <p className="text-sm text-white/30">Loading messages…</p>
              </div>
            </div>
          ) : currentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-violet-600/20 flex items-center justify-center">
                {activeThread === 'group'
                  ? <Hash size={28} className="text-violet-400" />
                  : <MessageSquare size={28} className="text-violet-400" />
                }
              </div>
              <div>
                <p className="font-semibold text-white/60 text-sm">
                  {activeThread === 'group' ? 'Start the group conversation!' : `Say hi to ${activeUser?.name}!`}
                </p>
                <p className="text-xs text-white/30 mt-1">Messages are end-to-end stored securely.</p>
              </div>
            </div>
          ) : (
            currentMessages.map((msg, i) => {
              const prev = currentMessages[i - 1];
              const showAvatar =
                !prev || prev.sender?._id !== msg.sender?._id;
              return (
                <MessageBubble
                  key={msg._id || i}
                  msg={msg}
                  isOwn={msg.sender?._id === me._id || msg.sender === me._id}
                  showAvatar={showAvatar}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <MessageInput
          onSend={handleSend}
          placeholder={
            activeThread === 'group'
              ? 'Message #group-chat…'
              : `Message ${activeUser?.name || ''}…`
          }
        />
      </div>
    </div>
  );
}
