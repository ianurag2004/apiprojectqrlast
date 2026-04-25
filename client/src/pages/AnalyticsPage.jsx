import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import AIInsightCard from '../components/AIInsightCard';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { BarChart3, Loader2, RefreshCw, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const ChartTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass px-3 py-2 text-sm">
        <div className="text-white/60 mb-1">{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { id } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const { data } = await api.get(`/analytics/event/${id}`);
      setAnalytics(data.data.analytics);
    } catch {}
    finally { setLoading(false); }
  };

  const generateAnalytics = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post(`/analytics/event/${id}/generate`, {
        feedbackAvg: 4.2, socialReach: 800,
      });
      setAnalytics(data.data.analytics);
      toast.success('Analytics generated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  useEffect(() => { fetchAnalytics(); }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-primary-400" /></div>;

  if (!analytics) return (
    <div className="glass p-12 text-center space-y-4">
      <BarChart3 size={48} className="mx-auto text-white/20" />
      <h3 className="text-white font-semibold">Analytics Not Generated Yet</h3>
      <p className="text-white/40 text-sm">Generate post-event analytics to view AI-powered performance insights</p>
      <button onClick={generateAnalytics} disabled={generating} className="btn-primary flex items-center gap-2 mx-auto">
        {generating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        {generating ? 'Generating...' : 'Generate Analytics'}
      </button>
    </div>
  );

  const turnoutData = [
    { name: 'Predicted', value: analytics.predictedTurnout, fill: '#7c3aed' },
    { name: 'Actual', value: analytics.actualTurnout, fill: '#F59E0B' },
    { name: 'Capacity', value: analytics.attendanceRate > 0 ? Math.round(analytics.actualTurnout / analytics.attendanceRate) : 0, fill: '#374151' },
  ];

  const budgetData = [
    { name: 'Requested', value: analytics.budgetRequested, fill: '#3B82F6' },
    { name: 'Approved', value: analytics.budgetApproved, fill: '#10B981' },
    { name: 'Spent', value: analytics.actualSpend, fill: '#F59E0B' },
  ];

  const timeline = analytics.registrationTimeline || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Event Analytics</h1>
          <p className="text-white/40 text-sm">{analytics.event?.title}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={generateAnalytics} disabled={generating} className="btn-secondary btn-sm flex items-center gap-1.5">
            <RefreshCw size={13} className={generating ? 'animate-spin' : ''} /> Regenerate
          </button>
        </div>
      </div>

      {/* Engagement Score */}
      <div className="glass p-6 flex items-center gap-8">
        <div className="text-center">
          <div className="text-6xl font-display font-bold gradient-text">{analytics.engagementGrade}</div>
          <div className="text-white/40 text-sm mt-1">Engagement Grade</div>
        </div>
        <div className="w-px h-16 bg-white/10" />
        <div className="grid grid-cols-4 gap-6 flex-1">
          <Metric label="Turnout" value={`${Math.round(analytics.attendanceRate * 100)}%`} color="text-primary-300" />
          <Metric label="Engagement Score" value={analytics.engagementScore} color="text-amber-400" />
          <Metric label="Feedback" value={`${analytics.feedbackAvg}/5`} color="text-emerald-400" />
          <Metric label="Volunteers" value={analytics.volunteerCount} color="text-blue-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Turnout Chart */}
        <div className="glass p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={15} className="text-primary-400" /> Attendance: Predicted vs Actual
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={turnoutData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[6,6,0,0]}>
                {turnoutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget Chart */}
        <div className="glass p-5">
          <h3 className="font-semibold text-white mb-4">Budget Performance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={budgetData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[6,6,0,0]}>
                {budgetData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Registration Timeline */}
        {timeline.length > 0 && (
          <div className="glass p-5">
            <h3 className="font-semibold text-white mb-4">Registration Timeline</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2}
                  dot={{ fill: '#7c3aed', r: 3 }} activeDot={{ r: 5 }} name="Registrations" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* AI Insights */}
        <AIInsightCard
          insights={analytics.insights}
          score={analytics.engagementScore}
          grade={analytics.engagementGrade}
          title="AI Performance Analysis"
        />
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-white/40 mt-1">{label}</div>
    </div>
  );
}
