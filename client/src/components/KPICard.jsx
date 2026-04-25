import { useEffect, useRef, useState } from 'react';
import { TrendingUp } from 'lucide-react';

function CountUp({ end, duration = 1500, prefix = '', suffix = '' }) {
  const [count, setCount] = useState(0);
  const rafRef = useRef();

  useEffect(() => {
    const start = Date.now();
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [end, duration]);

  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
}

export default function KPICard({ title, value, icon: Icon, color = 'primary', trend, prefix = '', suffix = '', loading = false }) {
  const colorMap = {
    primary: { bg: 'from-primary-500/20 to-primary-500/5', icon: 'text-primary-400', ring: 'ring-primary-500/30' },
    amber:   { bg: 'from-amber-500/20 to-amber-500/5', icon: 'text-amber-400', ring: 'ring-amber-500/30' },
    emerald: { bg: 'from-emerald-500/20 to-emerald-500/5', icon: 'text-emerald-400', ring: 'ring-emerald-500/30' },
    red:     { bg: 'from-red-500/20 to-red-500/5', icon: 'text-red-400', ring: 'ring-red-500/30' },
    blue:    { bg: 'from-blue-500/20 to-blue-500/5', icon: 'text-blue-400', ring: 'ring-blue-500/30' },
  };
  const c = colorMap[color] || colorMap.primary;

  return (
    <div className="kpi-card animate-fade-in">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.bg} flex items-center justify-center ring-1 ${c.ring}`}>
          <Icon size={18} className={c.icon} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-display font-bold text-white">
          {loading ? (
            <div className="h-8 w-20 bg-white/10 rounded-lg animate-pulse" />
          ) : (
            <CountUp end={typeof value === 'number' ? value : 0} prefix={prefix} suffix={suffix} />
          )}
        </div>
        <div className="text-xs text-white/50 font-medium mt-0.5">{title}</div>
      </div>
    </div>
  );
}
