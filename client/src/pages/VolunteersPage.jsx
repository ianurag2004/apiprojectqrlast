import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import {
  UserCog, Search, Plus, Loader2, ChevronDown, RefreshCw,
  Trash2, Edit3, X, Clock, CheckCircle2, AlertTriangle,
  Users, Shield, Wrench, Megaphone, Coffee, Monitor, MapPin,
} from 'lucide-react';

const ROLES = [
  { value: 'coordinator', label: 'Coordinator', icon: Shield, color: 'text-purple-400 bg-purple-500/15' },
  { value: 'logistics', label: 'Logistics', icon: MapPin, color: 'text-blue-400 bg-blue-500/15' },
  { value: 'registration', label: 'Registration', icon: Users, color: 'text-emerald-400 bg-emerald-500/15' },
  { value: 'security', label: 'Security', icon: Shield, color: 'text-red-400 bg-red-500/15' },
  { value: 'tech', label: 'Tech Support', icon: Monitor, color: 'text-cyan-400 bg-cyan-500/15' },
  { value: 'marketing', label: 'Marketing', icon: Megaphone, color: 'text-pink-400 bg-pink-500/15' },
  { value: 'hospitality', label: 'Hospitality', icon: Coffee, color: 'text-amber-400 bg-amber-500/15' },
];

const STATUS_MAP = {
  active: { label: 'Active', class: 'badge-approved' },
  done: { label: 'Done', class: 'badge-completed' },
  absent: { label: 'Absent', class: 'badge-rejected' },
};

const TASK_SUGGESTIONS = [
  'Stage setup', 'Sound check', 'Crowd management', 'Registration desk',
  'Photography', 'Social media updates', 'Guest reception', 'Refreshments',
  'Parking management', 'Equipment handling', 'Backstage coordination',
  'Emergency first aid', 'Decoration', 'Feedback collection', 'Cleanup',
];

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ring-1 ${color}`}>
      <Icon size={16} />
      <div>
        <div className="text-lg font-bold leading-none">{value}</div>
        <div className="text-[11px] opacity-70 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

/* ── Add / Edit Modal ─────────────────────────────────────── */
function VolunteerModal({ volunteer, eventId, users, onClose, onSaved }) {
  const isEdit = !!volunteer;
  const [form, setForm] = useState({
    userId: volunteer?.user?._id || '',
    role: volunteer?.role || 'logistics',
    tasksAssigned: volunteer?.tasksAssigned || [],
    hoursWorked: volunteer?.hoursWorked || 0,
    status: volunteer?.status || 'active',
    notes: volunteer?.notes || '',
  });
  const [taskInput, setTaskInput] = useState('');
  const [saving, setSaving] = useState(false);

  const addTask = (task) => {
    const t = task.trim();
    if (t && !form.tasksAssigned.includes(t)) {
      setForm(f => ({ ...f, tasksAssigned: [...f.tasksAssigned, t] }));
    }
    setTaskInput('');
  };

  const removeTask = (idx) => {
    setForm(f => ({ ...f, tasksAssigned: f.tasksAssigned.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/volunteers/${volunteer._id}`, {
          role: form.role,
          tasksAssigned: form.tasksAssigned,
          hoursWorked: Number(form.hoursWorked),
          status: form.status,
          notes: form.notes,
        });
        toast.success('Volunteer updated!');
      } else {
        if (!form.userId) return toast.error('Select a user');
        await api.post('/volunteers', {
          eventId, userId: form.userId,
          role: form.role, tasksAssigned: form.tasksAssigned,
        });
        toast.success('Volunteer added!');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const suggestions = TASK_SUGGESTIONS.filter(t => !form.tasksAssigned.includes(t));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-lg rounded-2xl border border-white/15 p-6 space-y-5"
        style={{ background: '#12102B' }}>
        <button onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
          <X size={16} />
        </button>
        <h3 className="text-lg font-semibold text-white">
          {isEdit ? 'Edit Volunteer' : 'Add Volunteer'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div>
              <label className="label">Select User *</label>
              <select className="input" value={form.userId}
                onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}>
                <option value="">— Choose a user —</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role *</label>
              <select className="input" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {isEdit && (
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="done">Done</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
            )}
            {isEdit && (
              <div>
                <label className="label">Hours Worked</label>
                <input type="number" min="0" step="0.5" className="input"
                  value={form.hoursWorked}
                  onChange={e => setForm(f => ({ ...f, hoursWorked: e.target.value }))} />
              </div>
            )}
          </div>

          {/* Tasks */}
          <div>
            <label className="label">Assigned Tasks</label>
            <div className="flex gap-2 mb-2">
              <input className="input flex-1" placeholder="Add a task..."
                value={taskInput} onChange={e => setTaskInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTask(taskInput); } }} />
              <button type="button" onClick={() => addTask(taskInput)}
                className="btn-secondary btn-sm"><Plus size={14} /></button>
            </div>
            {form.tasksAssigned.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.tasksAssigned.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-500/15 text-primary-300 text-xs rounded-lg border border-primary-500/20">
                    {t}
                    <button type="button" onClick={() => removeTask(i)} className="hover:text-red-400"><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {suggestions.slice(0, 6).map(s => (
                <button key={s} type="button" onClick={() => addTask(s)}
                  className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 transition-colors">
                  + {s}
                </button>
              ))}
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {isEdit ? 'Update' : 'Add Volunteer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */
export default function VolunteersPage() {
  const { hasRole } = useAuthStore();
  const canManage = hasRole('organizer', 'hod', 'super_admin');

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelected] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingEvents, setLE] = useState(true);
  const [loadingVols, setLV] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editVol, setEditVol] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    api.get('/events', { params: { status: 'approved' } })
      .then(r => { setEvents(r.data.data.events || []); })
      .catch(() => toast.error('Could not load events'))
      .finally(() => setLE(false));
    // Load users for assignment dropdown
    api.get('/auth/users').then(r => setUsers(r.data.data?.users || [])).catch(() => {});
  }, []);

  const loadVolunteers = useCallback(async () => {
    if (!selectedEvent) return;
    setLV(true);
    try {
      const { data } = await api.get(`/volunteers/event/${selectedEvent._id}`);
      setVolunteers(data.data.volunteers || []);
    } catch { toast.error('Failed to load volunteers'); }
    finally { setLV(false); }
  }, [selectedEvent]);

  useEffect(() => { loadVolunteers(); }, [loadVolunteers]);

  const handleDelete = async (volId) => {
    if (!confirm('Remove this volunteer?')) return;
    setDeleting(volId);
    try {
      await api.delete(`/volunteers/${volId}`);
      toast.success('Volunteer removed');
      loadVolunteers();
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(null); }
  };

  const filtered = volunteers.filter(v => {
    const matchSearch = !search ||
      v.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.user?.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || v.role === filterRole;
    return matchSearch && matchRole;
  });

  const stats = {
    total: volunteers.length,
    active: volunteers.filter(v => v.status === 'active').length,
    totalHours: volunteers.reduce((s, v) => s + (v.hoursWorked || 0), 0),
    totalTasks: volunteers.reduce((s, v) => s + (v.tasksAssigned?.length || 0), 0),
  };

  const getRoleMeta = (role) => ROLES.find(r => r.value === role) || ROLES[1];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Volunteers</h1>
          <p className="text-white/40 text-sm">Assign tasks, track hours & manage event volunteers</p>
        </div>
        {selectedEvent && canManage && (
          <button onClick={() => { setEditVol(null); setShowModal(true); }}
            className="btn-primary flex items-center gap-2">
            <Plus size={15} /> Add Volunteer
          </button>
        )}
      </div>

      {/* Event Selector */}
      <div className="glass p-4">
        <label className="label mb-2">Select Event</label>
        {loadingEvents ? (
          <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
        ) : events.length === 0 ? (
          <div className="flex items-center gap-2 text-amber-400 text-sm">
            <AlertTriangle size={14} /> No approved events found.
          </div>
        ) : (
          <div className="relative">
            <select className="input pr-10 appearance-none"
              value={selectedEvent?._id || ''}
              onChange={e => {
                const ev = events.find(ev => ev._id === e.target.value);
                setSelected(ev || null);
                setSearch(''); setFilterRole('all');
              }}>
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
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Users} label="Total Volunteers" value={stats.total} color="bg-primary-500/10 text-primary-300 ring-primary-500/20" />
            <StatCard icon={CheckCircle2} label="Active" value={stats.active} color="bg-emerald-500/10 text-emerald-300 ring-emerald-500/20" />
            <StatCard icon={Clock} label="Total Hours" value={stats.totalHours} color="bg-amber-500/10 text-amber-300 ring-amber-500/20" />
            <StatCard icon={Wrench} label="Tasks Assigned" value={stats.totalTasks} color="bg-blue-500/10 text-blue-300 ring-blue-500/20" />
          </div>

          {/* Role distribution bar */}
          {volunteers.length > 0 && (
            <div className="glass p-4">
              <div className="text-xs text-white/50 mb-2">Role Distribution</div>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                {ROLES.map(r => {
                  const count = volunteers.filter(v => v.role === r.value).length;
                  if (!count) return null;
                  const pct = (count / volunteers.length) * 100;
                  return (
                    <div key={r.value} title={`${r.label}: ${count}`}
                      className={`${r.color.split(' ')[1]} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }} />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {ROLES.map(r => {
                  const count = volunteers.filter(v => v.role === r.value).length;
                  if (!count) return null;
                  return (
                    <span key={r.value} className="text-[10px] text-white/40 flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${r.color.split(' ')[1]}`} />
                      {r.label}: {count}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters + Table */}
          <div className="glass overflow-hidden">
            <div className="p-4 border-b border-white/10 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-44">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input className="input pl-9 text-sm" placeholder="Search by name or email..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setFilterRole('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterRole === 'all' ? 'bg-primary-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                  All
                </button>
                {ROLES.map(r => {
                  const count = volunteers.filter(v => v.role === r.value).length;
                  if (!count) return null;
                  return (
                    <button key={r.value} onClick={() => setFilterRole(r.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterRole === r.value ? 'bg-primary-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                      {r.label} ({count})
                    </button>
                  );
                })}
                <button onClick={loadVolunteers} disabled={loadingVols} className="btn-icon" title="Refresh">
                  <RefreshCw size={13} className={loadingVols ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {loadingVols ? (
              <div className="space-y-2 p-4">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <UserCog size={36} className="mx-auto mb-3 text-white/15" />
                <p className="text-white/40 text-sm">
                  {volunteers.length === 0 ? 'No volunteers assigned yet.' : 'No results match your filter.'}
                </p>
                {volunteers.length === 0 && canManage && (
                  <button onClick={() => { setEditVol(null); setShowModal(true); }}
                    className="btn-primary mt-4 inline-flex items-center gap-2">
                    <Plus size={14} /> Add First Volunteer
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Volunteer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Tasks</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Hours</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Workload</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Status</th>
                      {canManage && <th className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((v, i) => {
                      const roleMeta = getRoleMeta(v.role);
                      const RoleIcon = roleMeta.icon;
                      const statusMeta = STATUS_MAP[v.status] || STATUS_MAP.active;
                      return (
                        <tr key={v._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 text-white/30 text-xs">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={`https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(v.user?.name || 'V')}&backgroundColor=7c3aed&textColor=ffffff`}
                                className="w-8 h-8 rounded-lg ring-2 ring-primary-500/30" alt="" />
                              <div>
                                <div className="font-medium text-white">{v.user?.name || 'Unknown'}</div>
                                <div className="text-xs text-white/40">{v.user?.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${roleMeta.color}`}>
                              <RoleIcon size={11} /> {roleMeta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {v.tasksAssigned?.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {v.tasksAssigned.slice(0, 3).map((t, j) => (
                                  <span key={j} className="px-2 py-0.5 bg-white/5 text-white/60 text-[10px] rounded-md">{t}</span>
                                ))}
                                {v.tasksAssigned.length > 3 && (
                                  <span className="px-2 py-0.5 bg-white/5 text-white/40 text-[10px] rounded-md">+{v.tasksAssigned.length - 3}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-white/20 text-xs">No tasks</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-white/60 text-xs font-mono">{v.hoursWorked || 0}h</td>
                          <td className="px-4 py-3">
                            <div className="w-20">
                              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className={`h-1.5 rounded-full transition-all duration-500 ${
                                  v.workloadScore > 75 ? 'bg-red-500' : v.workloadScore > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`} style={{ width: `${Math.min(v.workloadScore || 0, 100)}%` }} />
                              </div>
                              <div className="text-[10px] text-white/30 mt-0.5">{v.workloadScore || 0}%</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge ${statusMeta.class}`}>{statusMeta.label}</span>
                          </td>
                          {canManage && (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button onClick={() => { setEditVol(v); setShowModal(true); }}
                                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-primary-400 transition-colors"
                                  title="Edit"><Edit3 size={13} /></button>
                                <button onClick={() => handleDelete(v._id)}
                                  disabled={deleting === v._id}
                                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors"
                                  title="Remove">
                                  {deleting === v._id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t border-white/10 text-xs text-white/30 flex justify-between">
                  <span>Showing {filtered.length} of {volunteers.length} volunteers</span>
                  <span>{stats.active} active · {stats.totalHours}h total · {stats.totalTasks} tasks</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!selectedEvent && !loadingEvents && events.length > 0 && (
        <div className="glass p-16 text-center">
          <UserCog size={40} className="mx-auto mb-3 text-white/15" />
          <p className="text-white/40">Select an event above to manage volunteers</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <VolunteerModal
          volunteer={editVol}
          eventId={selectedEvent?._id}
          users={users}
          onClose={() => { setShowModal(false); setEditVol(null); }}
          onSaved={() => { setShowModal(false); setEditVol(null); loadVolunteers(); }}
        />
      )}
    </div>
  );
}
