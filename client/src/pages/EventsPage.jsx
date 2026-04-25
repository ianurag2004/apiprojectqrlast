import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Calendar, Filter, Plus, Search, BarChart3, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { formatDate, eventTypeColor } from '../utils/dateUtils';

const STATUS_OPTS = ['all','draft','pending','hod_approved','dean_approved','approved','rejected','completed'];
const TYPE_OPTS = ['all','technical','cultural','workshop','sports','seminar'];

const TYPE_BADGES = {
  technical: 'bg-blue-500/20 text-blue-400',
  cultural:  'bg-pink-500/20 text-pink-400',
  workshop:  'bg-emerald-500/20 text-emerald-400',
  sports:    'bg-orange-500/20 text-orange-400',
  seminar:   'bg-purple-500/20 text-purple-400',
};

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (status !== 'all') params.status = status;
    if (type !== 'all') params.type = type;
    api.get('/events', { params }).then(res => {
      setEvents(res.data.data.events);
      setTotal(res.data.data.total);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [status, type]);

  const filtered = search
    ? events.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || e.venue.toLowerCase().includes(search.toLowerCase()))
    : events;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Events</h1>
          <p className="text-white/40 text-sm">{total} total events</p>
        </div>
        {hasRole('organizer','hod','super_admin') && (
          <button onClick={() => navigate('/events/new')} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Proposal
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input className="input pl-9" placeholder="Search events..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-white/40" />
          <select className="input w-auto" value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
          </select>
          <select className="input w-auto" value={type} onChange={e => setType(e.target.value)}>
            {TYPE_OPTS.map(t => <option key={t} value={t}>{t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Event Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 glass animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass p-12 text-center">
          <Calendar size={40} className="mx-auto mb-3 text-white/20" />
          <p className="text-white/40">No events found</p>
          {hasRole('organizer','hod','super_admin') && (
            <button onClick={() => navigate('/events/new')} className="btn-primary mt-4 inline-flex items-center gap-2">
              <Plus size={16} /> Create First Event
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(event => (
            <EventCard key={event._id} event={event} onClick={() => navigate(`/events/${event._id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, onClick }) {
  const daysUntil = Math.ceil((new Date(event.date) - new Date()) / 86400000);
  const typeBadge = TYPE_BADGES[event.type] || 'bg-white/10 text-white/60';

  return (
    <div onClick={onClick}
      className="glass p-5 cursor-pointer hover:border-primary-500/30 hover:shadow-glow transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <span className={`badge border-0 ${typeBadge}`}>{event.type}</span>
        <span className={`badge ${
          event.status === 'approved' ? 'badge-approved' :
          event.status === 'rejected' ? 'badge-rejected' :
          event.status === 'completed' ? 'badge-completed' :
          event.status === 'draft' ? 'badge-draft' : 'badge-pending'
        }`}>{event.status.replace('_',' ')}</span>
      </div>

      <h3 className="font-semibold text-white text-base mb-1 group-hover:text-primary-300 transition-colors line-clamp-2">
        {event.title}
      </h3>
      <p className="text-white/40 text-sm mb-3 truncate">{event.venue}</p>

      <div className="flex items-center justify-between text-xs text-white/40">
        <div className="flex items-center gap-1">
          <Calendar size={11} />
          {formatDate(event.date)}
        </div>
        {event.aiPredictedTurnout && (
          <div className="flex items-center gap-1 text-primary-400">
            <BarChart3 size={11} />
            ~{event.aiPredictedTurnout} expected
          </div>
        )}
      </div>

      {daysUntil > 0 && daysUntil <= 30 && (
        <div className={`mt-3 pt-3 border-t border-white/10 text-xs ${daysUntil <= 3 ? 'text-red-400' : 'text-white/30'}`}>
          {daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
        </div>
      )}
    </div>
  );
}
