import { Sparkles, AlertTriangle, TrendingDown, TrendingUp, ChevronRight } from 'lucide-react';

const iconMap = {
  warning: <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />,
  down:    <TrendingDown size={14} className="text-red-400 flex-shrink-0" />,
  up:      <TrendingUp size={14} className="text-emerald-400 flex-shrink-0" />,
  default: <ChevronRight size={14} className="text-primary-400 flex-shrink-0" />,
};

const classifyInsight = (text) => {
  const t = text.toLowerCase();
  if (t.includes('low') || t.includes('below') || t.includes('reduce') || t.includes('deficit')) return 'warning';
  if (t.includes('excellent') || t.includes('outstanding') || t.includes('high') || t.includes('replicate')) return 'up';
  if (t.includes('over budget') || t.includes('review')) return 'down';
  return 'default';
};

export default function AIInsightCard({ insights = [], score, grade, title = 'AI Insights', loading = false }) {
  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500/20 rounded-xl flex items-center justify-center ring-1 ring-primary-500/40">
            <Sparkles size={15} className="text-primary-400" />
          </div>
          <span className="font-semibold text-white text-sm">{title}</span>
          <span className="ai-badge">AI</span>
        </div>
        {grade && score !== undefined && (
          <div className="text-right">
            <div className="text-2xl font-display font-bold gradient-text">{grade}</div>
            <div className="text-xs text-white/40">{score}/100</div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <p className="text-sm text-white/40 text-center py-4">No insights available yet</p>
      ) : (
        <ul className="space-y-2">
          {insights.map((insight, i) => {
            const type = classifyInsight(insight);
            return (
              <li key={i} className={`flex items-start gap-2 p-2.5 rounded-lg text-sm ${
                type === 'warning' ? 'bg-amber-500/10 text-amber-200' :
                type === 'up' ? 'bg-emerald-500/10 text-emerald-200' :
                type === 'down' ? 'bg-red-500/10 text-red-200' :
                'bg-primary-500/10 text-primary-200'
              }`}>
                {iconMap[type]}
                <span className="leading-snug">{insight}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
