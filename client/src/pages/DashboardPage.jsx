import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useSocketStore } from '../store/socketStore';
import { useAuthStore } from '../store/authStore';
import KPICard from '../components/KPICard';
import AIInsightCard from '../components/AIInsightCard';
import {
  Calendar, Users, DollarSign, CheckCircle2, Clock, Zap,
  Activity, TrendingUp,
} from 'lucide-react';
import { formatDistanceToNow } from '../utils/dateUtils';

const LIVE_FEED_LABELS = {
  'registration:new': { label: 'New Registration', color: 'text-primary-400', dot: 'bg-primary-500' },
  'checkin:update': { label: 'Check-in', color: 'text-emerald-400', dot: 'bg-emerald-500' },
  'approval:status': { label: 'Approval Update', color: 'text-amber-400', dot: 'bg-amber-500' },
  'volunteer:alert': { label: 'Volunteer Alert', color: 'text-red-400', dot: 'bg-red-500' },
};

const defaultInsights = [
  'Schedule events in Oct–Dec or Feb–Mar for peak attendance.',
  'Cultural events see 1.2x higher turnout than average.',
  'Events with ≥14 day registration windows have 34% higher attendance.',
  'Volunteer-to-participant ratio of 1:15 delivers optimal experience.',
];

export default function DashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const { events: liveEvents, joinAdmin } = useSocketStore();
  const { user } = useAuthStore();

  useEffect(() => {
    joinAdmin();
    api.get('/dashboard').then(res => {
      setKpis(res.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const upcoming = kpis?.upcomingEvents || [];
  const liveFeed = liveEvents.slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Good {timeOfDay()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-white/40 text-sm mt-1">Here's what's happening at Manav Rachna University</p>
        </div>
        <div className="ai-badge"><Zap size={10} /> AI Engine Active</div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Events" value={kpis?.totalEvents || 0} icon={Calendar} color="primary" loading={loading} />
        <KPICard title="Registrations" value={kpis?.totalRegistrations || 0} icon={Users} color="blue" loading={loading} />
        <KPICard title="Checked In" value={kpis?.checkedIn || 0} icon={CheckCircle2} color="emerald" loading={loading} />
        <KPICard title="Budget Allocated" value={kpis?.totalBudget || 0} icon={DollarSign} color="amber" prefix="₹" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <div className="lg:col-span-2 glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Calendar size={16} className="text-primary-400" /> Upcoming Events
            </h2>
            {kpis?.pendingApprovals > 0 && (
              <span className="badge badge-pending">
                <Clock size={10} /> {kpis.pendingApprovals} pending
              </span>
            )}
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-8 text-white/30">
              <Calendar size={32} className="mx-auto mb-2 opacity-50" />
              <p>No upcoming approved events</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(ev => (
                <EventCard key={ev._id} event={ev} />
              ))}
            </div>
          )}
        </div>

        {/* AI Insights */}
        <AIInsightCard insights={defaultInsights} title="AI Planning Insights" />
      </div>

      {/* Live Feed */}
      <div className="glass p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-primary-400" />
          <h2 className="font-semibold text-white">Live Event Feed</h2>
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse-slow" />
        </div>
        {liveFeed.length === 0 ? (
          <p className="text-sm text-white/30 py-4 text-center">
            Live updates will appear here as events happen in real time
          </p>
        ) : (
          <div className="space-y-2">
            {liveFeed.map((ev, i) => {
              const meta = LIVE_FEED_LABELS[ev.type] || { label: ev.type, color: 'text-white/60', dot: 'bg-white/40' };
              return (
                <div key={i} className="flex items-start gap-3 text-sm p-2 rounded-lg hover:bg-white/5">
                  <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${meta.dot}`} />
                  <div className="flex-1 min-w-0">
                    <span className={`font-medium ${meta.color}`}>{meta.label}</span>
                    {ev.data?.name && <span className="text-white/60"> — {ev.data.name}</span>}
                    {ev.data?.message && <span className="text-white/60"> — {ev.data.message}</span>}
                  </div>
                  <span className="text-white/30 text-xs flex-shrink-0">
                    {formatDistanceToNow(ev.time)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event }) {
  const typeColors = {
    technical: 'text-blue-400 bg-blue-500/10',
    cultural: 'text-pink-400 bg-pink-500/10',
    workshop: 'text-emerald-400 bg-emerald-500/10',
    sports: 'text-orange-400 bg-orange-500/10',
    seminar: 'text-purple-400 bg-purple-500/10',
  };
  const tc = typeColors[event.type] || 'text-white/60 bg-white/10';
  const daysUntil = Math.ceil((new Date(event.date) - new Date()) / 86400000);

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex flex-col items-center justify-center text-center ring-1 ring-primary-500/30">
        <div className="text-base font-bold text-primary-300 leading-none">
          {new Date(event.date).getDate()}
        </div>
        <div className="text-[9px] text-primary-400/80 uppercase">
          {new Date(event.date).toLocaleString('en-IN', { month: 'short' })}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white text-sm truncate">{event.title}</div>
        <div className="text-xs text-white/40">{event.venue}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`badge text-[10px] ${tc} border-0 px-2 py-0.5`}>{event.type}</span>
        <span className={`text-xs ${daysUntil <= 3 ? 'text-red-400' : 'text-white/40'}`}>
          {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
        </span>
      </div>
    </div>
  );
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
