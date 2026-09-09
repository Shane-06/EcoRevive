/**
 * Reusable Metric KPI Stat Card (M12/M16).
 */
export default function StatCard({
  title,
  value = 0,
  icon: Icon,
  accentColor = 'emerald',
  subtitle,
  testId,
}) {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
    },
    teal: {
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/30',
      text: 'text-teal-400',
    },
    rose: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      text: 'text-rose-400',
    },
  };

  const scheme = colorMap[accentColor] || colorMap.emerald;

  return (
    <div
      data-testid={testId || `stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 shadow-lg transition-colors space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl ${scheme.bg} border ${scheme.border} ${scheme.text} flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>

      {subtitle && (
        <p className="text-[11px] text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}
