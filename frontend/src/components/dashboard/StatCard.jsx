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
      bg: 'bg-forest-50',
      border: 'border-forest-200',
      text: 'text-forest-800',
    },
    blue: {
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      text: 'text-sky-800',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-800',
    },
    teal: {
      bg: 'bg-sage-50',
      border: 'border-sage-200',
      text: 'text-sage-800',
    },
    rose: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-800',
    },
  };

  const scheme = colorMap[accentColor] || colorMap.emerald;

  return (
    <div
      data-testid={testId || `stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className="p-5 rounded-xl bg-white border border-warm-200 hover:border-forest-700/30 shadow-card transition-colors space-y-2.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider font-mono">
          {title}
        </span>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg ${scheme.bg} border ${scheme.border} ${scheme.text} flex items-center justify-center`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold text-charcoal-900 font-mono tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>

      {subtitle && (
        <p className="text-[11px] text-charcoal-500">{subtitle}</p>
      )}
    </div>
  );
}
