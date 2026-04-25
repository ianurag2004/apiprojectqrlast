import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Zap, Sparkles, Loader2, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPES = ['technical', 'cultural', 'workshop', 'sports', 'seminar'];
const VENUE_OPTS = [
  'Main Auditorium, MRU',
  'Open-Air Amphitheatre, MRU Campus',
  'CS Lab Complex, Block D',
  'Innovation Lab, Block E',
  'Seminar Hall A',
  'Seminar Hall B',
  'Seminar Hall 2, CS Department',
  'Convention Hall, Administrative Block',
  'Sports Ground & Complex',
  'MRU Cricket Ground & Sports Complex',
  'Manav Rachna Innovation & Incubation Centre',
  'Conference Room 1',
  'Other...',
];

export default function ProposalFormPage() {
  const [form, setForm] = useState({
    title: '', type: 'technical', description: '', date: '', endDate: '',
    venue: '', venueCustom: '', venueCapacity: '', expectedAttendance: '', registrationDeadline: '', tags: '',
  });
  const [aiPreview, setAiPreview] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const getAIPrediction = async () => {
    if (!form.date || !form.type) return;
    setPredicting(true);
    try {
      const { data } = await api.post('/ai/predict/turnout', {
        event_type: form.type,
        date: form.date,
        venue_capacity: Number(form.venueCapacity) || 500,
        registration_days: form.registrationDeadline
          ? Math.max(1, Math.floor((new Date(form.registrationDeadline) - new Date()) / 86400000))
          : 14,
      });
      setAiPreview(data.data);
      toast.success('AI prediction ready!');
    } catch {
      toast.error('AI service unavailable');
    } finally { setPredicting(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const venueValue = form.venue === 'Other...' ? form.venueCustom : form.venue;
      const payload = {
        ...form,
        venue: venueValue,
        venueCapacity: Number(form.venueCapacity),
        expectedAttendance: Number(form.expectedAttendance),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      await api.post('/events', payload);
      toast.success('Proposal submitted!');
      navigate('/events');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-icon"><ChevronLeft size={18} /></button>
        <div>
          <h1 className="page-title">New Event Proposal</h1>
          <p className="text-white/40 text-sm">Submit for multi-level approval</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="glass p-6 space-y-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Zap size={15} className="text-primary-400" /> Event Details
          </h2>
          <div>
            <label className="label">Event Title *</label>
            <input className="input" required placeholder="e.g., TechFest 2025" value={form.title}
              onChange={e => set('title', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Event Type *</label>
              <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Venue *</label>
              <select className="input" value={form.venue} onChange={e => set('venue', e.target.value)} required>
                <option value="">Select a venue</option>
                {VENUE_OPTS.map(v => <option key={v}>{v}</option>)}
              </select>
              {form.venue === 'Other...' && (
                <input className="input mt-2" placeholder="Enter custom venue name" required
                  value={form.venueCustom} onChange={e => set('venueCustom', e.target.value)} />
              )}
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[100px] resize-none" placeholder="Briefly describe the event..."
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <label className="label">Tags (comma separated)</label>
            <input className="input" placeholder="hackathon, AI, innovation" value={form.tags}
              onChange={e => set('tags', e.target.value)} />
          </div>
        </div>

        {/* Dates & Capacity */}
        <div className="glass p-6 space-y-4">
          <h2 className="font-semibold text-white">Dates & Capacity</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Event Date *</label>
              <input type="datetime-local" className="input" required value={form.date}
                onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="datetime-local" className="input" value={form.endDate}
                onChange={e => set('endDate', e.target.value)} />
            </div>
            <div>
              <label className="label">Registration Deadline</label>
              <input type="date" className="input" value={form.registrationDeadline}
                onChange={e => set('registrationDeadline', e.target.value)} />
            </div>
            <div>
              <label className="label">Venue Capacity</label>
              <input type="number" className="input" placeholder="500" value={form.venueCapacity}
                onChange={e => set('venueCapacity', e.target.value)} />
            </div>
          </div>

          {/* AI Prediction */}
          <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-primary-400" />
                <span className="text-sm font-semibold text-primary-300">AI Turnout Prediction</span>
              </div>
              <button type="button" onClick={getAIPrediction} disabled={predicting || !form.date}
                className="btn-secondary btn-sm flex items-center gap-1.5 text-xs">
                {predicting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {predicting ? 'Predicting...' : 'Get AI Estimate'}
              </button>
            </div>
            {aiPreview ? (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-primary-500/10 rounded-lg p-2">
                  <div className="text-xl font-bold text-primary-300">{aiPreview.predicted}</div>
                  <div className="text-xs text-white/50">Predicted Turnout</div>
                </div>
                <div className="bg-primary-500/10 rounded-lg p-2">
                  <div className="text-xl font-bold text-emerald-400">{Math.round(aiPreview.confidence * 100)}%</div>
                  <div className="text-xs text-white/50">Confidence</div>
                </div>
                <div className="bg-primary-500/10 rounded-lg p-2">
                  <div className="text-xl font-bold text-amber-400">
                    {aiPreview.factors?.is_peak_season ? '🔥' : '📅'}
                  </div>
                  <div className="text-xs text-white/50">{aiPreview.factors?.is_peak_season ? 'Peak Season' : 'Regular'}</div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-white/40">Set event date and type, then click to get AI-powered attendance prediction</p>
            )}
          </div>

          <div>
            <label className="label">Expected Attendance</label>
            <input type="number" className="input"
              placeholder={aiPreview ? `AI suggests: ${aiPreview.predicted}` : 'e.g., 300'}
              value={form.expectedAttendance} onChange={e => set('expectedAttendance', e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Submitting...' : 'Submit Proposal'}
          </button>
        </div>
      </form>
    </div>
  );
}
