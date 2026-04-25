import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Sparkles } from 'lucide-react';

const COLORS = ['#7c3aed', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];
const LABELS = { venue: 'Venue', catering: 'Catering', logistics: 'Logistics', marketing: 'Marketing', contingency: 'Contingency' };

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="glass px-3 py-2 text-sm">
        <div className="font-semibold text-white">{payload[0].name}</div>
        <div className="text-white/70">₹{payload[0].value?.toLocaleString()}</div>
        <div className="text-white/50">{payload[0].payload.pct}%</div>
      </div>
    );
  }
  return null;
};

export default function BudgetDonut({ allocation = {}, aiRecommended, totalRequested }) {
  const data = Object.entries(allocation)
    .filter(([, v]) => v > 0)
    .map(([key, value], i) => ({
      name: LABELS[key] || key,
      value,
      pct: totalRequested ? Math.round((value / totalRequested) * 100) : 0,
      color: COLORS[i % COLORS.length],
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-white/30 text-sm">
        No allocation data yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {aiRecommended && (
        <div className="flex items-center gap-2 text-sm">
          <span className="ai-badge"><Sparkles size={10} /> AI Recommended</span>
          <span className="text-white/70">₹{aiRecommended?.toLocaleString()}</span>
          {totalRequested && (
            <span className={`text-xs ${totalRequested > aiRecommended ? 'text-amber-400' : 'text-emerald-400'}`}>
              ({totalRequested > aiRecommended ? '+' : ''}₹{(totalRequested - aiRecommended).toLocaleString()} vs AI)
            </span>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
            paddingAngle={3} dataKey="value">
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span className="text-white/70 text-xs">{value}</span>}
            iconType="circle" iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Allocation table */}
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
              <span className="text-white/70">{item.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/40 text-xs">{item.pct}%</span>
              <span className="text-white font-medium">₹{item.value.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
