import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import ApprovalTimeline from '../components/ApprovalTimeline';
import BudgetDonut from '../components/BudgetDonut';
import AIInsightCard from '../components/AIInsightCard';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { formatDate, formatCurrency } from '../utils/dateUtils';
import {
  Calendar, MapPin, Users, DollarSign, ChevronLeft,
  CheckCircle, XCircle, Loader2, BarChart3, UserPlus, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = ['Overview', 'Budget', 'Registrations', 'Volunteers', 'Approvals'];

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuthStore();
  const { joinEventRoom, leaveEventRoom } = useSocketStore();

  const [event, setEvent] = useState(null);
  const [budget, setBudget] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    joinEventRoom(id);
    fetchAll();
    return () => leaveEventRoom(id);
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [evRes] = await Promise.all([api.get(`/events/${id}`)]);
      setEvent(evRes.data.data.event);
      if (evRes.data.data.event.budget) setBudget(evRes.data.data.event.budget);
    } catch { toast.error('Event not found'); navigate('/events'); }
    finally { setLoading(false); }
  };

  const fetchRegistrations = async () => {
    const { data } = await api.get(`/registrations/event/${id}`);
    setRegistrations(data.data.registrations);
  };

  const fetchVolunteers = async () => {
    const { data } = await api.get(`/volunteers/event/${id}`);
    setVolunteers(data.data.volunteers);
  };

  useEffect(() => {
    if (tab === 'Registrations') fetchRegistrations();
    if (tab === 'Volunteers') fetchVolunteers();
  }, [tab]);

  const handleApprove = async (status, comment = '') => {
    setActionLoading(true);
    try {
      const { data } = await api.patch(`/events/${id}/approve`, { status, comment });
      setEvent(data.data.event);
      toast.success(`Event ${status}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setActionLoading(false); }
  };

  const handleSubmit = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.patch(`/events/${id}/submit`);
      setEvent(data.data.event);
      toast.success('Event submitted for approval');
    } catch (err) { toast.error(err.response?.data?.message || 'Submit failed'); }
    finally { setActionLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-primary-400" /></div>;
  if (!event) return null;

  const canApprove = hasRole('hod','dean','finance','super_admin');
  const isOrganizer = event.organizer?._id === user?._id;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <button onClick={() => navigate(-1)} className="btn-icon mb-3 flex items-center gap-1 text-sm text-white/50 hover:text-white">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge ${
                event.status === 'approved' ? 'badge-approved' :
                event.status === 'rejected' ? 'badge-rejected' :
                event.status === 'draft' ? 'badge-draft' : 'badge-pending'
              }`}>{event.status?.replace('_',' ').toUpperCase()}</span>
              <span className="badge badge-draft capitalize">{event.type}</span>
            </div>
            <h1 className="text-3xl font-display font-bold text-white">{event.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-white/50">
              <span className="flex items-center gap-1"><Calendar size={13} />{formatDate(event.date)}</span>
              <span className="flex items-center gap-1"><MapPin size={13} />{event.venue}</span>
              <span className="flex items-center gap-1"><Users size={13} />{event.venueCapacity} capacity</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end">
            {/* Organizer actions */}
            {isOrganizer && event.status === 'draft' && (
              <button onClick={handleSubmit} disabled={actionLoading} className="btn-primary flex items-center gap-2">
                {actionLoading && <Loader2 size={14} className="animate-spin" />}
                Submit for Approval
              </button>
            )}
            {/* Approver actions */}
            {canApprove && ['pending','hod_approved','dean_approved'].includes(event.status) && (
              <div className="flex gap-2">
                <button onClick={() => handleApprove('approved')} disabled={actionLoading}
                  className="btn-success flex items-center gap-1.5">
                  <CheckCircle size={14} /> Approve
                </button>
                <button onClick={() => handleApprove('rejected')} disabled={actionLoading}
                  className="btn-danger flex items-center gap-1.5">
                  <XCircle size={14} /> Reject
                </button>
              </div>
            )}
            {/* Analytics */}
            {event.status === 'completed' && (
              <button onClick={() => navigate(`/events/${id}/analytics`)}
                className="btn-secondary flex items-center gap-2">
                <BarChart3 size={14} /> View Analytics
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Turnout Banner */}
      {event.aiPredictedTurnout && (
        <div className="glass p-4 flex items-center gap-6">
          <div className="ai-badge">AI Prediction</div>
          <div className="flex items-center gap-8">
            <div>
              <div className="text-2xl font-bold text-primary-300">{event.aiPredictedTurnout}</div>
              <div className="text-xs text-white/40">Predicted Turnout</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{Math.round((event.aiConfidence || 0) * 100)}%</div>
              <div className="text-xs text-white/40">AI Confidence</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{event.expectedAttendance}</div>
              <div className="text-xs text-white/40">Expected (Manual)</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-primary-500 text-white shadow-glow' : 'text-white/50 hover:text-white'
            }`}>{t}</button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'Overview' && <OverviewTab event={event} />}
      {tab === 'Budget' && <BudgetTab eventId={id} budget={budget} setBudget={setBudget} event={event} />}
      {tab === 'Registrations' && <RegistrationsTab eventId={id} registrations={registrations} refetch={fetchRegistrations} />}
      {tab === 'Volunteers' && <VolunteersTab eventId={id} volunteers={volunteers} refetch={fetchVolunteers} />}
      {tab === 'Approvals' && <ApprovalTimeline approvalChain={event.approvalChain} eventStatus={event.status} />}
    </div>
  );
}

function OverviewTab({ event }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass p-5">
        <h3 className="font-semibold text-white mb-3">Event Description</h3>
        <p className="text-white/60 text-sm leading-relaxed">{event.description || 'No description provided.'}</p>
        {event.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {event.tags.map(tag => (
              <span key={tag} className="px-2 py-1 bg-primary-500/10 text-primary-300 text-xs rounded-lg border border-primary-500/20">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="glass p-5">
        <h3 className="font-semibold text-white mb-3">Organizer</h3>
        <div className="flex items-center gap-3">
          <img
            src={`https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(event.organizer?.name || 'O')}&backgroundColor=7c3aed&textColor=ffffff`}
            className="w-10 h-10 rounded-xl"
          />
          <div>
            <div className="text-white font-medium">{event.organizer?.name}</div>
            <div className="text-white/40 text-sm">{event.organizer?.department}</div>
            <div className="text-white/40 text-xs">{event.organizer?.email}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetTab({ eventId, budget, setBudget, event }) {
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);

  const getAISuggestion = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/budgets/event/${eventId}/ai-suggest`);
      setAiSuggestion(data.data);
    } catch { toast.error('AI service unavailable'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-white">Budget Overview</h3>
        <button onClick={getAISuggestion} disabled={loading} className="btn-secondary btn-sm flex items-center gap-1.5">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <span className="ai-badge">AI</span>}
          Get AI Recommendation
        </button>
      </div>
      {!budget ? (
        <div className="glass p-8 text-center text-white/40">
          <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
          <p>No budget submitted yet</p>
          <p className="text-xs mt-1">Submit budget from the Budget section</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass p-5">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><div className="text-xl font-bold text-white">{formatCurrency(budget.totalRequested)}</div><div className="text-xs text-white/40">Requested</div></div>
              <div><div className="text-xl font-bold text-emerald-400">{formatCurrency(budget.totalApproved)}</div><div className="text-xs text-white/40">Approved</div></div>
              <div><div className="text-xl font-bold text-amber-400">{formatCurrency(budget.aiRecommended)}</div><div className="text-xs text-white/40">AI Recommended</div></div>
              <div><div className={`text-xl font-bold ${budget.approvalStatus === 'approved' ? 'text-emerald-400' : 'text-amber-400'}`}>{budget.approvalStatus?.toUpperCase()}</div><div className="text-xs text-white/40">Status</div></div>
            </div>
          </div>
          <div className="glass p-5">
            <BudgetDonut allocation={budget.allocation} aiRecommended={budget.aiRecommended} totalRequested={budget.totalRequested} />
          </div>
        </div>
      )}
      {aiSuggestion && (
        <AIInsightCard insights={aiSuggestion.tips || []} title="AI Budget Insights" />
      )}
    </div>
  );
}

function RegistrationsTab({ eventId, registrations, refetch }) {
  const [search, setSearch] = useState('');
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '', roll: '' });
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const filtered = search
    ? registrations.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.email.includes(search))
    : registrations;

  const handleRegister = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      await api.post('/registrations', { ...regForm, eventId });
      toast.success('Registered!');
      setShowForm(false);
      setRegForm({ name: '', email: '', phone: '', roll: '' });
      refetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Registration failed'); }
    finally { setAdding(false); }
  };

  const handleExport = () => {
    window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/registrations/event/${eventId}/export`, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <input className="input flex-1 max-w-xs" placeholder="Search participants..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary btn-sm flex items-center gap-1.5">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary btn-sm flex items-center gap-1.5">
            <UserPlus size={14} /> Register
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleRegister} className="glass p-4 grid grid-cols-2 gap-3">
          <input className="input" placeholder="Full Name" required value={regForm.name} onChange={e => setRegForm(f=>({...f,name:e.target.value}))} />
          <input className="input" type="email" placeholder="Email" required value={regForm.email} onChange={e => setRegForm(f=>({...f,email:e.target.value}))} />
          <input className="input" placeholder="Phone" value={regForm.phone} onChange={e => setRegForm(f=>({...f,phone:e.target.value}))} />
          <input className="input" placeholder="Roll Number" value={regForm.roll} onChange={e => setRegForm(f=>({...f,roll:e.target.value}))} />
          <div className="col-span-2 flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary btn-sm">Cancel</button>
            <button type="submit" disabled={adding} className="btn-primary btn-sm flex items-center gap-1.5">
              {adding && <Loader2 size={12} className="animate-spin" />} Register
            </button>
          </div>
        </form>
      )}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Roll</th><th>QR</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-white/30 py-8">No registrations yet</td></tr>
            ) : filtered.map(r => (
              <tr key={r._id}>
                <td className="font-medium text-white">{r.name}</td>
                <td>{r.email}</td>
                <td>{r.roll || '—'}</td>
                <td>
                  {r.qrCode && (
                    <div className="w-10 h-10 bg-white rounded p-0.5">
                      <img src={r.qrCode} alt="QR" className="w-full h-full object-cover" />
                    </div>
                  )}
                </td>
                <td>
                  <span className={`badge ${r.checkedIn ? 'badge-approved' : 'badge-pending'}`}>
                    {r.checkedIn ? 'Checked In' : 'Registered'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VolunteersTab({ eventId, volunteers, refetch }) {
  const [balanceReport, setBalanceReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const getBalance = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/volunteers/event/${eventId}/balance`);
      setBalanceReport(data.data);
    } catch { toast.error('Balance check failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">{volunteers.length} Volunteers</h3>
        <button onClick={getBalance} disabled={loading} className="btn-secondary btn-sm flex items-center gap-1.5">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <span className="ai-badge">AI</span>}
          Check Workload Balance
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead><tr><th>Volunteer</th><th>Role</th><th>Tasks</th><th>Hours</th><th>Workload</th></tr></thead>
          <tbody>
            {volunteers.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-white/30 py-8">No volunteers assigned</td></tr>
            ) : volunteers.map(v => {
              const score = balanceReport?.scores?.find(s => s.id === v._id);
              return (
                <tr key={v._id}>
                  <td className="font-medium text-white">{v.user?.name}</td>
                  <td><span className="badge badge-draft capitalize">{v.role}</span></td>
                  <td>{v.tasksAssigned?.length || 0}</td>
                  <td>{v.hoursWorked}h</td>
                  <td>
                    {score ? (
                      <span className={`badge ${
                        score.status === 'overloaded' ? 'badge-rejected' :
                        score.status === 'underloaded' ? 'badge-pending' : 'badge-approved'
                      }`}>{score.status}</span>
                    ) : (
                      <div className="w-16 h-2 bg-white/10 rounded-full">
                        <div className="h-2 bg-primary-500 rounded-full" style={{ width: `${v.workloadScore}%` }} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {balanceReport?.suggestions?.length > 0 && (
        <AIInsightCard
          insights={balanceReport.suggestions.map(s => `Move a task from ${s.from_name} to ${s.to_name}: ${s.task}`)}
          title="AI Workload Redistribution Suggestions"
        />
      )}
    </div>
  );
}
