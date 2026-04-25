export const formatDistanceToNow = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

export const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN')}`;

export const eventTypeColor = (type) => {
  const map = {
    technical: 'text-blue-400',
    cultural:  'text-pink-400',
    workshop:  'text-emerald-400',
    sports:    'text-orange-400',
    seminar:   'text-purple-400',
  };
  return map[type] || 'text-white/60';
};
