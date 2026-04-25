import { useEffect, useState } from 'react';
import api from '../api/axios';
import { CheckCircle, XCircle, Clock, Users, Settings, Loader2 } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('approvals');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/events', { params: { status: 'pending' } }),
      api.get('/events', { params: { status: 'hod_approved' } }),
      api.get('/events', { params: { status: 'dean_approved' } }),
    ]).then(([p, ha, da]) => {
      setPending([
        ...p.data.data.events,
        ...ha.data.data.events,
        ...da.data.data.events,
      ]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleApprove = async (eventId, status) => {
    setActionLoading(eventId + status);
    try {
      await api.patch(`/events/${eventId}/approve`, { status });
      setPending(prev => prev.filter(e => e._id !== eventId));
      toast.success(`Event ${status}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setActionLoading(''); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="text-white/40 text-sm">Manage approvals and system oversight</p>
        </div>
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-primary-400" />
          <span className="badge badge-pending">{pending.length} Pending</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl w-fit">
        {['approvals', 'activity'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t ? 'bg-primary-500 text-white' : 'text-white/50 hover:text-white'
            }`}>{t}</button>
        ))}
      </div>

      {tab === 'approvals' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-400" /></div>
          ) : pending.length === 0 ? (
            <div className="glass p-12 text-center">
              <CheckCircle size={40} className="mx-auto mb-3 text-emerald-400/40" />
              <h3 className="text-white font-semibold">All caught up!</h3>
              <p className="text-white/40 text-sm">No pending approvals</p>
            </div>
          ) : pending.map(event => (
            <div key={event._id} className="glass p-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge ${
                    event.status === 'pending' ? 'badge-pending' :
                    event.status === 'hod_approved' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                    'badge-approved'
                  }`}>{event.status.replace('_',' ').toUpperCase()}</span>
                  <span className="badge badge-draft capitalize">{event.type}</span>
                </div>
                <h3 className="font-semibold text-white">{event.title}</h3>
                <div className="text-sm text-white/40 mt-1">
                  {event.organizer?.name} · {formatDate(event.date)} · {event.venue}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/events/${event._id}`)}
                  className="btn-secondary btn-sm">View</button>
                <button
                  onClick={() => handleApprove(event._id, 'approved')}
                  disabled={actionLoading === event._id + 'approved'}
                  className="btn-success btn-sm flex items-center gap-1">
                  {actionLoading === event._id + 'approved' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                  Approve
                </button>
                <button
                  onClick={() => handleApprove(event._id, 'rejected')}
                  disabled={actionLoading === event._id + 'rejected'}
                  className="btn-danger btn-sm flex items-center gap-1">
                  <XCircle size={12} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'activity' && (
        <div className="glass p-8 text-center text-white/30">
          <Clock size={32} className="mx-auto mb-2" />
          <p>Activity log coming with database audit trail</p>
        </div>
      )}
    </div>
  );
}
