// The API returns UTC timestamps without a "Z"; add it so browsers don't read them as local time.
export function parseApiDate(value) {
  const s = String(value);
  return new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`);
}

export function timeAgo(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - parseApiDate(value)) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function severityStyle(severity) {
  const s = String(severity).toLowerCase();
  if (s === 'critical' || s === 'high') return 'bg-red-500/10 text-red-600 border-red-500/30';
  if (s === 'warning' || s === 'medium') return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
  return 'bg-sky-500/10 text-sky-600 border-sky-500/30';
}
