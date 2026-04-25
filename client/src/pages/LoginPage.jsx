import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { Zap, Eye, EyeOff, Loader2, Users, ShieldCheck, GraduationCap, Star, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const DEMO_ACCOUNTS = [
  {
    role: 'Organizer',
    email: 'organizer@demo.festos',
    password: 'demo1234',
    icon: Sparkles,
    color: 'from-violet-500/20 to-violet-500/5 border-violet-500/30 hover:border-violet-400/60',
    badge: 'bg-violet-500/20 text-violet-300',
    desc: 'Create & manage events',
  },
  {
    role: 'HOD',
    email: 'hod@demo.festos',
    password: 'demo1234',
    icon: Users,
    color: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 hover:border-blue-400/60',
    badge: 'bg-blue-500/20 text-blue-300',
    desc: 'Dept. approvals',
  },
  {
    role: 'Dean',
    email: 'dean@demo.festos',
    password: 'demo1234',
    icon: ShieldCheck,
    color: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 hover:border-emerald-400/60',
    badge: 'bg-emerald-500/20 text-emerald-300',
    desc: 'Final approvals',
  },
  {
    role: 'Student',
    email: 'student@demo.festos',
    password: 'demo1234',
    icon: GraduationCap,
    color: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 hover:border-amber-400/60',
    badge: 'bg-amber-500/20 text-amber-300',
    desc: 'Register for events',
  },
  {
    role: 'Admin',
    email: 'admin@demo.festos',
    password: 'demo1234',
    icon: Star,
    color: 'from-rose-500/20 to-rose-500/5 border-rose-500/30 hover:border-rose-400/60',
    badge: 'bg-rose-500/20 text-rose-300',
    desc: 'Full access',
  },
];

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [activeDemo, setActiveDemo] = useState(null);
  const { login, isLoading } = useAuthStore();
  const { connect } = useSocketStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(form.email, form.password);
    if (result.success) {
      connect();
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      toast.error(result.message);
    }
  };

  const fillDemo = (account) => {
    setActiveDemo(account.role);
    setForm({ email: account.email, password: account.password });
    toast.success(`Demo filled: ${account.role}`, { duration: 1500 });
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-[80px]" />
      </div>

      <div className="w-full max-w-md relative animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-glow-lg mb-4">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white">FestOS</h1>
          <p className="text-white/50 mt-1 text-sm">Manav Rachna University · Event Management</p>
        </div>

        <div className="glass-strong p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email" className="input" placeholder="you@mru.edu.in" required
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" required
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-white/50 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">Create account</Link>
          </p>

          {/* Demo Credentials */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-white/40 font-medium px-2">Try a demo account</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                const isActive = activeDemo === acc.role;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => fillDemo(acc)}
                    title={`${acc.role} — ${acc.desc}\n${acc.email}`}
                    className={`group flex flex-col items-center gap-1.5 p-2.5 rounded-xl border bg-gradient-to-b transition-all duration-200 ${acc.color} ${
                      isActive ? 'scale-95 ring-2 ring-white/20' : 'hover:scale-[1.04]'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${acc.badge}`}>
                      <Icon size={14} />
                    </div>
                    <span className="text-[10px] font-semibold text-white/80 leading-none">{acc.role}</span>
                    <span className="text-[9px] text-white/40 leading-none text-center">{acc.desc}</span>
                  </button>
                );
              })}
            </div>

            {activeDemo && (
              <p className="text-center text-xs text-primary-400/80 mt-2 animate-fade-in">
                ✓ Credentials filled — click <span className="font-semibold">Sign In</span>
              </p>
            )}

            <p className="text-center text-[10px] text-white/25 mt-2">
              All demo accounts use password: <span className="text-white/40 font-mono">demo1234</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

