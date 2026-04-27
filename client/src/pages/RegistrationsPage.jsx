import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import {
  Users, Search, Download, UserPlus, CheckCircle2, XCircle,
  Loader2, Calendar, ChevronDown, QrCode, Filter, RefreshCw,
  ClipboardList, BadgeCheck, Clock, Hash, X, ExternalLink, Award,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { formatDate } from '../utils/dateUtils';
import toast from 'react-hot-toast';

/* ─── Registration Form ──────────────────────────────────────── */
const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Mechanical Engineering',
  'Civil Engineering', 'Electronics & Communication', 'Electrical Engineering',
  'Management', 'Law', 'Pharmacy', 'Architecture', 'Other',
];

const EMPTY_FORM = { name: '', email: '', phone: '', roll: '', department: '', teamName: '' };

function RegistrationForm({ event, onSuccess, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!event) return toast.error('Please select an event first');
    setLoading(true);
    try {
      await api.post('/registrations', { ...form, eventId: event._id });
      toast.success(`✅ ${form.name} registered successfully!`);
      setForm(EMPTY_FORM);
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Full Name *</label>
          <input className="input" required placeholder="Anurag Sharma"
            value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Email *</label>
          <input type="email" className="input" required placeholder="anurag@mru.edu.in"
            value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input type="tel" className="input" placeholder="9876543210"
            value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
        <div>
          <label className="label">Roll Number</label>
          <input className="input" placeholder="22CSE1001"
            value={form.roll} onChange={e => set('roll', e.target.value)} />
        </div>
        <div>
          <label className="label">Department</label>
          <select className="input" value={form.department} onChange={e => set('department', e.target.value)}>
            <option value="">Select department</option>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Team Name <span className="text-white/30">(optional)</span></label>
          <input className="input" placeholder="Team Alpha"
            value={form.teamName} onChange={e => set('teamName', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        )}
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
          {loading ? 'Registering...' : 'Register Participant'}
        </button>
      </div>
    </form>
  );
}

/* ─── Stat Pill ─────────────────────────────────────────────── */
function StatPill({ icon: Icon, label, value, color = 'primary' }) {
  const colors = {
    primary:  'bg-primary-500/10  text-primary-300  ring-primary-500/20',
    emerald:  'bg-emerald-500/10  text-emerald-300  ring-emerald-500/20',
    amber:    'bg-amber-500/10    text-amber-300    ring-amber-500/20',
    rose:     'bg-rose-500/10     text-rose-300     ring-rose-500/20',
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ring-1 ${colors[color]}`}>
      <Icon size={16} />
      <div>
        <div className="text-lg font-bold leading-none">{value}</div>
        <div className="text-[11px] opacity-70 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function RegistrationsPage() {
  const { user, hasRole } = useAuthStore();
  const { socket } = useSocketStore();

  const [events, setEvents]         = useState([]);
  const [selectedEvent, setSelected] = useState(null);
  const [registrations, setRegs]    = useState([]);
  const [stats, setStats]           = useState({ total: 0, checkedIn: 0 });
  const [loadingEvents, setLE]      = useState(true);
  const [loadingRegs, setLR]        = useState(false);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFS]       = useState('all'); // all | checkedIn | pending
  const [showForm, setShowForm]     = useState(false);
  const [checkingIn, setCheckingIn] = useState(null);

  const [showQRModal, setShowQRModal] = useState(false);
  const [eventQR,     setEventQR]     = useState(null);   // { qrDataUrl, url }
  const [loadingQR,   setLoadingQR]   = useState(false);

  const canManage = hasRole('organizer', 'hod', 'super_admin');

  /* Load approved events with open registrations */
  useEffect(() => {
    api.get('/events', { params: { status: 'approved' } })
      .then(r => {
        setEvents(r.data.data.events || []);
        // Auto-select first event if only one
        if (r.data.data.events?.length === 1) setSelected(r.data.data.events[0]);
      })
      .catch(() => toast.error('Could not load events'))
      .finally(() => setLE(false));
  }, []);

  /* Load registrations for selected event */
  const loadRegs = useCallback(async () => {
    if (!selectedEvent) return;
    setLR(true);
    try {
      const { data } = await api.get(`/registrations/event/${selectedEvent._id}`);
      setRegs(data.data.registrations || []);
      setStats({ total: data.data.total, checkedIn: data.data.checkedInCount });
    } catch { toast.error('Failed to load registrations'); }
    finally { setLR(false); }
  }, [selectedEvent]);

  useEffect(() => { loadRegs(); }, [loadRegs]);

  /* Real-time updates */
  useEffect(() => {
    if (!socket || !selectedEvent) return;
    const onNew     = () => loadRegs();
    const onCheckin = () => loadRegs();
    socket.on('registration:new',  onNew);
    socket.on('checkin:update',    onCheckin);
    return () => { socket.off('registration:new', onNew); socket.off('checkin:update', onCheckin); };
  }, [socket, selectedEvent, loadRegs]);

  /* Manual check-in */
  const handleCheckIn = async (regId) => {
    setCheckingIn(regId);
    try {
      await api.patch(`/registrations/${regId}/checkin`);
      toast.success('✅ Checked in!');
      loadRegs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally { setCheckingIn(null); }
  };

  /* CSV export */
  const handleExport = () => {
    if (!selectedEvent) return;
    window.open(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/registrations/event/${selectedEvent._id}/export`,
      '_blank'
    );
  };

  /* Certificate download */
  const [downloadingCert, setDownloadingCert] = useState(null);
  const handleDownloadCert = async (regId) => {
    setDownloadingCert(regId);
    try {
      const response = await api.get(`/certificates/${regId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate_${selectedEvent?.title || 'Event'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Certificate downloaded!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not download certificate');
    } finally { setDownloadingCert(null); }
  };

  /* Show event registration QR */
  const handleShowQR = async () => {
    if (!selectedEvent) return;
    setShowQRModal(true);
    if (eventQR?.eventId === selectedEvent._id) return; // cached
    setLoadingQR(true);
    try {
      const { data } = await api.get(`/payments/event-qr/${selectedEvent._id}`);
      setEventQR({ ...data, eventId: selectedEvent._id });
    } catch { toast.error('Could not generate QR'); }
    finally { setLoadingQR(false); }
  };

  /* Filter */
  const filtered = registrations.filter(r => {
    const matchSearch = !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      (r.roll || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === 'all'       ? true :
      filterStatus === 'checkedIn' ? r.checkedIn :
      !r.checkedIn;
    return matchSearch && matchStatus;
  });

  const fillRate = stats.total > 0
    ? Math.round((stats.checkedIn / stats.total) * 100)
    : 0;

  const capacityPct = selectedEvent?.venueCapacity
    ? Math.min(Math.round((stats.total / selectedEvent.venueCapacity) * 100), 100)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Registrations</h1>
          <p className="text-white/40 text-sm">Manage event participants & check-ins</p>
        </div>
        <div className="flex gap-2">
          {selectedEvent && canManage && (
            <>
              <button onClick={handleShowQR} className="btn-secondary flex items-center gap-2">
                <QrCode size={15} /> QR Code
              </button>
              <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
                <Download size={15} /> Export CSV
              </button>
              <button
                onClick={() => setShowForm(f => !f)}
                className="btn-primary flex items-center gap-2"
              >
                <UserPlus size={15} />
                {showForm ? 'Hide Form' : 'Add Participant'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Event Selector ── */}
      <div className="glass p-4">
        <label className="label mb-2">Select Event</label>
        {loadingEvents ? (
          <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
        ) : events.length === 0 ? (
          <div className="flex items-center gap-2 text-amber-400 text-sm">
            <Calendar size={14} />
            No approved events with open registrations found.
          </div>
        ) : (
          <div className="relative">
            <select
              className="input pr-10 appearance-none"
              value={selectedEvent?._id || ''}
              onChange={e => {
                const ev = events.find(ev => ev._id === e.target.value);
                setSelected(ev || null);
                setSearch('');
                setFS('all');
              }}
            >
              <option value="">— Choose an event —</option>
              {events.map(ev => (
                <option key={ev._id} value={ev._id}>
                  {ev.title} · {ev.venue} · {new Date(ev.date).toLocaleDateString('en-IN')}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          </div>
        )}
      </div>

      {selectedEvent && (
        <>
          {/* ── Stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatPill icon={Users}       label="Total Registered" value={stats.total}    color="primary" />
            <StatPill icon={BadgeCheck}  label="Checked In"       value={stats.checkedIn} color="emerald" />
            <StatPill icon={Clock}       label="Pending Check-in" value={stats.total - stats.checkedIn} color="amber" />
            <StatPill icon={Hash}        label="Capacity Used"    value={`${capacityPct}%`} color={capacityPct >= 90 ? 'rose' : 'primary'} />
          </div>

          {/* Progress bars */}
          <div className="glass p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs text-white/50 mb-1.5">
                <span>Capacity</span>
                <span>{stats.total} / {selectedEvent.venueCapacity}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-700 ${capacityPct >= 90 ? 'bg-rose-500' : capacityPct >= 70 ? 'bg-amber-500' : 'bg-primary-500'}`}
                  style={{ width: `${capacityPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-white/50 mb-1.5">
                <span>Check-in Rate</span>
                <span>{stats.checkedIn} / {stats.total}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${fillRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Registration Form ── */}
          {showForm && canManage && (
            <div className="glass p-6 border border-primary-500/20">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-primary-500/20 rounded-xl flex items-center justify-center">
                  <UserPlus size={15} className="text-primary-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">New Registration</h2>
                  <p className="text-xs text-white/40">{selectedEvent.title}</p>
                </div>
              </div>
              <RegistrationForm
                event={selectedEvent}
                onSuccess={() => { loadRegs(); }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          {/* ── Filters + Table ── */}
          <div className="glass overflow-hidden">
            {/* Filter bar */}
            <div className="p-4 border-b border-white/10 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-44">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input className="input pl-9 text-sm" placeholder="Search by name, email, roll..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={13} className="text-white/40" />
                {['all','checkedIn','pending'].map(s => (
                  <button key={s} onClick={() => setFS(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterStatus === s
                        ? 'bg-primary-500 text-white'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}>
                    {s === 'all' ? 'All' : s === 'checkedIn' ? '✅ Checked In' : '⏳ Pending'}
                  </button>
                ))}
                <button onClick={loadRegs} disabled={loadingRegs} className="btn-icon" title="Refresh">
                  <RefreshCw size={13} className={loadingRegs ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Table */}
            {loadingRegs ? (
              <div className="space-y-2 p-4">
                {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <ClipboardList size={36} className="mx-auto mb-3 text-white/15" />
                <p className="text-white/40 text-sm">
                  {registrations.length === 0 ? 'No registrations yet for this event.' : 'No results match your search.'}
                </p>
                {registrations.length === 0 && canManage && (
                  <button onClick={() => setShowForm(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
                    <UserPlus size={14} /> Register First Participant
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Participant</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Roll / Dept.</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Team</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">QR</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Registered</th>
                      {canManage && <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((r, i) => (
                      <tr key={r._id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-4 py-3 text-white/30 text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-300 text-xs font-bold flex-shrink-0">
                              {r.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-white">{r.name}</div>
                              <div className="text-xs text-white/40">{r.email}</div>
                              {r.phone && <div className="text-xs text-white/30">{r.phone}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white/70 text-xs font-mono">{r.roll || '—'}</div>
                          <div className="text-white/40 text-xs">{r.department || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-white/50 text-xs">{r.teamName || '—'}</td>
                        <td className="px-4 py-3">
                          {r.qrCode ? (
                            <div className="w-9 h-9 bg-white rounded-lg p-0.5 cursor-pointer hover:scale-110 transition-transform"
                              title="QR Code">
                              <img src={r.qrCode} alt="QR" className="w-full h-full object-cover rounded" />
                            </div>
                          ) : (
                            <QrCode size={16} className="text-white/20" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {r.checkedIn ? (
                            <div>
                              <span className="badge badge-approved">✓ Checked In</span>
                              {r.checkedInAt && (
                                <div className="text-[10px] text-white/30 mt-1">
                                  {new Date(r.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="badge badge-pending">Registered</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-white/40">
                          {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                        {canManage && (
                          <td className="px-4 py-3">
                            {!r.checkedIn ? (
                              <button
                                onClick={() => handleCheckIn(r._id)}
                                disabled={checkingIn === r._id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium transition-all"
                              >
                                {checkingIn === r._id
                                  ? <Loader2 size={11} className="animate-spin" />
                                  : <CheckCircle2 size={11} />
                                }
                                Check In
                              </button>
                            ) : (
                              <>
                              <span className="flex items-center gap-1 text-xs text-white/20">
                                <XCircle size={11} /> Done
                              </span>
                              <button
                                onClick={() => handleDownloadCert(r._id)}
                                disabled={downloadingCert === r._id}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium transition-all mt-1"
                                title="Download Certificate"
                              >
                                {downloadingCert === r._id
                                  ? <Loader2 size={11} className="animate-spin" />
                                  : <Award size={11} />
                                }
                                Certificate
                              </button>
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="px-4 py-3 border-t border-white/10 text-xs text-white/30 flex justify-between">
                  <span>Showing {filtered.length} of {registrations.length} registrations</span>
                  <span>{stats.checkedIn} checked in · {stats.total - stats.checkedIn} pending</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* No event selected state */}
      {!selectedEvent && !loadingEvents && events.length > 0 && (
        <div className="glass p-16 text-center">
          <Calendar size={40} className="mx-auto mb-3 text-white/15" />
          <p className="text-white/40">Select an event above to view and manage registrations</p>
        </div>
      )}

      {/* ── Event Registration QR Modal ── */}
      {showQRModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowQRModal(false); }}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl border border-white/15 p-6 text-center space-y-4"
            style={{ background: '#12102B' }}
          >
            {/* Close */}
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            <div>
              <h3 className="text-lg font-semibold text-white mb-0.5">Event Registration QR</h3>
              <p className="text-white/40 text-xs">
                Display this QR at the venue. Participants scan to register directly.
              </p>
            </div>

            {loadingQR ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 size={28} className="animate-spin text-primary-400" />
              </div>
            ) : eventQR ? (
              <>
                {/* Gradient frame */}
                <div className="p-0.5 rounded-2xl bg-gradient-to-br from-primary-500 via-accent to-emerald-500 inline-block mx-auto">
                  <div className="bg-white p-3 rounded-[14px]">
                    <img src={eventQR.qrDataUrl} alt="Registration QR" className="w-52 h-52" />
                  </div>
                </div>

                <div className="text-xs text-white/40 space-y-2">
                  <p className="font-medium text-white/60">{selectedEvent?.title}</p>
                  <p className="font-mono break-all text-[10px] text-white/30">{eventQR.url}</p>
                </div>

                <div className="flex gap-2">
                  <a
                    href={eventQR.qrDataUrl}
                    download={`festos-qr-${selectedEvent?._id}.png`}
                    className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-sm"
                  >
                    ↓ Download
                  </a>
                  <a
                    href={eventQR.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-sm"
                  >
                    <ExternalLink size={13} /> Open Link
                  </a>
                </div>
              </>
            ) : (
              <p className="text-rose-400 text-sm py-8">Failed to generate QR. Try again.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
