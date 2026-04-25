import { useState, useRef, useEffect } from 'react';
import api from '../api/axios';
import { Bot, X, Send, Loader2, Sparkles, ChevronDown, Trash2, MessageSquare } from 'lucide-react';

const SUGGESTIONS = [
  '💡 How to plan a hackathon?',
  '📊 What\'s a good budget for 300 students?',
  '👥 How many volunteers for a cultural fest?',
  '📝 Approval process walkthrough',
  '🎯 How to maximise event turnout?',
];

function BotAvatar() {
  return (
    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0 shadow-glow">
      <Bot size={14} className="text-white" />
    </div>
  );
}

function MessageBubble({ msg }) {
  const isBot = msg.role === 'model';
  return (
    <div className={`flex gap-2.5 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}>
      {isBot && <BotAvatar />}
      <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
        isBot
          ? 'bg-white/8 text-white/90 rounded-tl-sm'
          : 'bg-primary-600 text-white rounded-tr-sm'
      }`}>
        {/* Render simple markdown: bold, newlines, bullet lists */}
        {msg.text.split('\n').map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <br key={i} />;
          // Bold **text**
          const parts = trimmed.split(/\*\*(.*?)\*\*/g);
          return (
            <p key={i} className={trimmed.startsWith('•') || trimmed.startsWith('-') ? 'ml-2' : ''}>
              {parts.map((part, j) =>
                j % 2 === 1 ? <strong key={j} className="font-semibold">{part}</strong> : part
              )}
            </p>
          );
        })}
        <div className={`text-[10px] mt-1 ${isBot ? 'text-white/30' : 'text-white/50'}`}>
          {new Date(msg.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

export default function ChatBot() {
  const [open, setOpen]       = useState(false);
  const [messages, setMsgs]   = useState([
    {
      role: 'model',
      text: "Hi! I'm **FestBot** 🤖 — your AI assistant for FestOS.\n\nI can help you with event planning, budgets, volunteer management, and more. What would you like to know?",
      ts: Date.now(),
    }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread]   = useState(0);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnread(0);
    }
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', text: msg, ts: Date.now() };
    setMsgs(prev => [...prev, userMsg]);
    setLoading(true);

    // Build history for Gemini (exclude the greeting)
    const history = messages
      .filter((_, i) => i > 0)           // skip greeting
      .map(m => ({ role: m.role, text: m.text }));

    try {
      const { data } = await api.post('/ai/chat', { message: msg, history });
      const botMsg = { role: 'model', text: data.reply, ts: Date.now() };

      setMsgs(prev => [...prev, botMsg]);
      if (!open) setUnread(u => u + 1);
    } catch {
      setMsgs(prev => [...prev, {
        role: 'model',
        text: 'Sorry, something went wrong. Please try again! 😅',
        ts: Date.now(),
      }]);
    } finally { setLoading(false); }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => setMsgs(msgs => [msgs[0]]);

  return (
    <>
      {/* ── Floating Button ── */}
      <button
        onClick={() => { setOpen(o => !o); setUnread(0); }}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 ${
          open
            ? 'bg-surface-100 border border-white/10 rotate-0'
            : 'bg-gradient-to-br from-primary-500 to-primary-700 shadow-glow hover:scale-110'
        }`}
        aria-label="Toggle FestBot"
      >
        {open
          ? <ChevronDown size={22} className="text-white/70" />
          : <Bot size={24} className="text-white" />
        }
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* ── Chat Panel ── */}
      <div className={`fixed bottom-24 right-6 z-50 w-[360px] max-h-[600px] flex flex-col rounded-2xl border border-white/10 shadow-2xl transition-all duration-300 origin-bottom-right overflow-hidden ${
        open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'
      }`}
        style={{ background: 'rgba(15,16,28,0.97)', backdropFilter: 'blur(20px)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-primary-500/10 to-transparent">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow">
            <Bot size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white flex items-center gap-1.5">
              FestBot <span className="ai-badge text-[9px]">AI</span>
            </div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Powered by Claude
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={clearChat} title="Clear chat"
              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
              <Trash2 size={13} />
            </button>
            <button onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin" style={{ maxHeight: '400px' }}>
          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-2.5 items-start">
              <BotAvatar />
              <div className="bg-white/8 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions (only show when ≤1 msg after greeting) */}
        {messages.length <= 1 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => sendMessage(s)}
                className="text-[10px] px-2.5 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-300 rounded-lg border border-primary-500/20 transition-all hover:scale-[1.02] text-left">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-white/10">
          <div className="flex gap-2 items-end bg-white/5 rounded-xl border border-white/10 focus-within:border-primary-500/40 transition-colors p-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask FestBot anything..."
              rows={1}
              className="flex-1 bg-transparent text-white text-sm placeholder-white/30 resize-none outline-none leading-relaxed max-h-24 scrollbar-thin"
              style={{ minHeight: '24px' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                input.trim() && !loading
                  ? 'bg-primary-500 hover:bg-primary-400 text-white shadow-glow'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="text-[9px] text-white/20 text-center mt-1.5">
            FestBot can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </>
  );
}
