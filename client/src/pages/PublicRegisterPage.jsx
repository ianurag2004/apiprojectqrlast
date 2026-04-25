import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  User, Mail, Phone, Hash, Building2, Users, CreditCard,
  CheckCircle2, Loader2, ArrowRight, QrCode, Calendar,
  MapPin, Clock, AlertCircle, Sparkles, Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ── Public-only axios — no auth redirect interceptor ────────── */
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});


/* ── Helpers ─────────────────────────────────────────────────── */
const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Mechanical Engineering',
  'Civil Engineering', 'Electronics & Communication', 'Electrical Engineering',
  'Management', 'Law', 'Pharmacy', 'Architecture', 'Other',
];
const EMPTY = { name: '', email: '', phone: '', roll: '', department: '', teamName: '' };

/* ── Razorpay loader ─────────────────────────────────────────── */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/* ── Step indicator ─────────────────────────────────────────── */
function StepDot({ step, current, label }) {
  const done   = current > step;
  const active = current === step;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
          done   ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
          active ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 scale-110' :
                   'bg-white/10 text-white/30'
        }`}
      >
        {done ? <CheckCircle2 size={16} /> : step}
      </div>
      <span className={`text-[10px] font-medium hidden sm:block ${active ? 'text-primary-300' : done ? 'text-emerald-400' : 'text-white/30'}`}>
        {label}
      </span>
    </div>
  );
}

function StepLine({ done }) {
  return (
    <div className="flex-1 h-0.5 mx-1 mt-[-20px] relative">
      <div className="absolute inset-0 bg-white/10 rounded-full" />
      <div className={`absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full transition-all duration-700 ${done ? 'right-0' : 'right-full'}`} />
    </div>
  );
}

/* ── Field component ─────────────────────────────────────────── */
function Field({ icon: Icon, label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium text-white/70">
        <Icon size={13} className="text-primary-400" />
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────── */
export default function PublicRegisterPage() {
  const { eventId } = useParams();
  const navigate    = useNavigate();

  const [event,    setEvent]   = useState(null);
  const [loading,  setLoading] = useState(true);
  const [step,     setStep]    = useState(1);   // 1 = form, 2 = payment, 3 = success
  const [form,     setForm]    = useState(EMPTY);
  const [submitting, setSub]   = useState(false);
  const [successReg, setSucc]  = useState(null);
  const topRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  /* load event */
  useEffect(() => {
    publicApi.get(`/events/${eventId}`)
      .then(r => setEvent(r.data.data.event))
      .catch(() => toast.error('Event not found'))
      .finally(() => setLoading(false));
  }, [eventId]);

  /* scroll top on step change */
  useEffect(() => topRef.current?.scrollIntoView({ behavior: 'smooth' }), [step]);

  /* ── Step 1 → 2: validate form ── */
  const handleFormNext = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setStep(2);
  };

  /* ── Step 2: create order then launch Razorpay ── */
  const handlePay = async () => {
    setSub(true);
    try {
      const { data } = await publicApi.post('/payments/create-order', { ...form, eventId });
      if (!data.success) { toast.error(data.message || 'Failed'); return; }

      if (data.free) {
        // No payment required — directly register
        await completeRegistration({ free: true });
        return;
      }

      // Load Razorpay
      const ok = await loadRazorpayScript();
      if (!ok) { toast.error('Could not load payment gateway. Please try again.'); return; }

      const options = {
        key:         data.keyId,
        amount:      data.amount,
        currency:    data.currency,
        name:        'FestOS · Manav Rachna',
        description: `Registration — ${data.eventTitle}`,
        order_id:    data.orderId,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        theme: { color: '#7C3AED' },
        handler: async (response) => {
          await completeRegistration({
            free: false,
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => setSub(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment initiation failed');
      setSub(false);
    }
  };

  /* ── finalize registration after payment ── */
  const completeRegistration = async (paymentInfo) => {
    try {
      const { data } = await publicApi.post('/payments/verify', {
        ...paymentInfo,
        regData: { ...form, eventId },
      });
      setSucc(data.data.registration);
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed after payment');
    } finally {
      setSub(false);
    }
  };

  /* ── Loading / not found ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0F1A' }}>
      <Loader2 size={32} className="animate-spin text-primary-400" />
    </div>
  );

  if (!event) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#0D0F1A' }}>
      <AlertCircle size={40} className="text-rose-400" />
      <p className="text-white/60">Event not found or link is invalid.</p>
    </div>
  );

  const eventDate = new Date(event.date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const eventTime = new Date(event.date).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: 'linear-gradient(135deg, #0D0F1A 0%, #12102B 50%, #0D0F1A 100%)' }}>
      {/* ── Background decorations ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto" ref={topRef}>

        {/* ── Brand header ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="text-xl font-display font-bold text-white">FestOS</span>
          </div>
          <p className="text-white/40 text-sm">Manav Rachna University · Event Management</p>
        </div>

        {/* ── Event info card ── */}
        <div className="mb-6 rounded-2xl overflow-hidden border border-white/10"
             style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}>
          <div className="h-1.5 bg-gradient-to-r from-primary-500 via-accent to-emerald-500" />
          <div className="p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-display font-bold text-white mb-1">{event.title}</h1>
                {event.description && (
                  <p className="text-white/50 text-sm line-clamp-2">{event.description}</p>
                )}
              </div>
              <span className="text-xs px-3 py-1.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30 capitalize font-semibold flex-shrink-0">
                {event.type}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/50">
              <span className="flex items-center gap-1.5"><Calendar size={13} className="text-primary-400" />{eventDate}</span>
              <span className="flex items-center gap-1.5"><Clock size={13} className="text-primary-400" />{eventTime}</span>
              <span className="flex items-center gap-1.5"><MapPin size={13} className="text-primary-400" />{event.venue}</span>
            </div>
            {!event.registrationOpen && (
              <div className="mt-3 flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20">
                <AlertCircle size={14} />
                Registrations are currently closed for this event.
              </div>
            )}
          </div>
        </div>

        {/* ── Stepper ── */}
        {step < 3 && (
          <div className="flex items-center justify-center mb-8 px-4">
            <StepDot step={1} current={step} label="Details" />
            <StepLine done={step > 1} />
            <StepDot step={2} current={step} label="Payment" />
            <StepLine done={step > 2} />
            <StepDot step={3} current={step} label="Confirm" />
          </div>
        )}

        {/* ────────────────── STEP 1: Form ────────────────── */}
        {step === 1 && (
          <form onSubmit={handleFormNext}
            className="rounded-2xl border border-white/10 p-6 space-y-5"
            style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}>

            <div>
              <h2 className="text-lg font-semibold text-white mb-0.5">Your Details</h2>
              <p className="text-white/40 text-sm">Fill in your information to register for this event.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field icon={User} label="Full Name" required>
                <input id="reg-name" className="input" required placeholder="Anurag Sharma"
                  value={form.name} onChange={e => set('name', e.target.value)} />
              </Field>
              <Field icon={Mail} label="Email Address" required>
                <input id="reg-email" type="email" className="input" required placeholder="anurag@mru.edu.in"
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </Field>
              <Field icon={Phone} label="Phone Number">
                <input id="reg-phone" type="tel" className="input" placeholder="9876543210"
                  value={form.phone} onChange={e => set('phone', e.target.value)} />
              </Field>
              <Field icon={Hash} label="Roll Number">
                <input id="reg-roll" className="input" placeholder="22CSE1001"
                  value={form.roll} onChange={e => set('roll', e.target.value)} />
              </Field>
              <Field icon={Building2} label="Department">
                <select id="reg-dept" className="input" value={form.department} onChange={e => set('department', e.target.value)}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field icon={Users} label="Team Name">
                <input id="reg-team" className="input" placeholder="Team Alpha (optional)"
                  value={form.teamName} onChange={e => set('teamName', e.target.value)} />
              </Field>
            </div>

            <button type="submit" disabled={!event.registrationOpen}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              Continue to Payment <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* ────────────────── STEP 2: Payment review ────────────────── */}
        {step === 2 && (
          <div className="rounded-2xl border border-white/10 p-6 space-y-5"
            style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}>

            <div>
              <h2 className="text-lg font-semibold text-white mb-0.5">Review & Pay</h2>
              <p className="text-white/40 text-sm">Confirm your details before completing payment.</p>
            </div>

            {/* Summary card */}
            <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/10">
              {[
                ['Name',       form.name],
                ['Email',      form.email],
                ['Phone',      form.phone || '—'],
                ['Roll No.',   form.roll || '—'],
                ['Department', form.department || '—'],
                ['Team',       form.teamName || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-white/40">{k}</span>
                  <span className="text-white font-medium">{v}</span>
                </div>
              ))}
            </div>

            {/* Security note */}
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Shield size={12} className="text-emerald-400" />
              Payments are secured by Razorpay. FestOS does not store card details.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} disabled={submitting}
                className="btn-secondary flex-1 flex items-center justify-center gap-2">
                ← Back
              </button>
              <button onClick={handlePay} disabled={submitting}
                className="btn-primary flex-1 flex items-center justify-center gap-2 text-base py-3">
                {submitting
                  ? <><Loader2 size={16} className="animate-spin" /> Processing...</>
                  : <><CreditCard size={16} /> Pay & Register</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ────────────────── STEP 3: Success ────────────────── */}
        {step === 3 && successReg && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-5"
            style={{ backdropFilter: 'blur(12px)' }}>

            {/* Animated checkmark */}
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center animate-pulse">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>

            <div>
              <h2 className="text-2xl font-display font-bold text-white mb-1">You're registered! 🎉</h2>
              <p className="text-white/50 text-sm">
                Welcome, <strong className="text-white">{successReg.name}</strong>!
                Your spot for <strong className="text-primary-300">{event.title}</strong> is confirmed.
              </p>
            </div>

            {/* QR code */}
            {successReg.qrCode && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-white/40 text-xs flex items-center gap-1.5">
                  <QrCode size={12} /> Your entry QR code — show this at the venue
                </p>
                <div className="bg-white p-3 rounded-2xl shadow-2xl shadow-primary-500/20 inline-block">
                  <img src={successReg.qrCode} alt="Entry QR" className="w-44 h-44 rounded-xl" />
                </div>
                <a
                  href={successReg.qrCode}
                  download={`festos-ticket-${successReg._id}.png`}
                  className="text-xs text-primary-400 hover:text-primary-300 underline underline-offset-2 transition-colors"
                >
                  Download QR Code
                </a>
              </div>
            )}

            {/* Info */}
            <div className="text-xs text-white/30 space-y-1">
              <p>Registration ID: <span className="font-mono text-white/50">{successReg._id}</span></p>
              {successReg.paymentId && (
                <p>Payment ID: <span className="font-mono text-white/50">{successReg.paymentId}</span></p>
              )}
            </div>

            <button onClick={() => navigate('/')} className="btn-secondary w-full">
              Back to Home
            </button>
          </div>
        )}

        {/* ── Footer ── */}
        <p className="text-center text-white/20 text-xs mt-8">
          © {new Date().getFullYear()} FestOS · Manav Rachna University · Powered by Razorpay
        </p>
      </div>
    </div>
  );
}
