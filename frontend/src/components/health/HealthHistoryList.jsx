import { Activity, Calendar, User, FileText, Image, AlertCircle, HeartPulse, CheckCircle2, AlertTriangle, Skull } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * Health Observation Chronological History Component (M11/M16).
 * Critical Rule: If no health logs exist, displays "No health record yet" (NEVER Dead).
 */
export default function HealthHistoryList({
  healthLogs = [],
  loading = false,
  treeId = '',
  onRefresh,
}) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-forest-50 border border-forest-200 text-forest-800">
            <HeartPulse className="w-3.5 h-3.5 text-forest-700" />
            Healthy
          </span>
        );
      case 'Good':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sage-50 border border-sage-200 text-sage-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-sage-700" />
            Good
          </span>
        );
      case 'Needs Attention':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
            Needs Attention
          </span>
        );
      case 'Dead':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-800">
            <Skull className="w-3.5 h-3.5 text-rose-700" />
            Dead
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warm-100 border border-warm-200 text-charcoal-700">
            <Activity className="w-3.5 h-3.5 text-charcoal-500" />
            {status || 'Unknown'}
          </span>
        );
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'Unknown date';
    try {
      const date = new Date(ts);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_e) {
      return String(ts);
    }
  };

  return (
    <div data-testid="health-history-list" className="p-6 rounded-2xl bg-white border border-warm-200 shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-warm-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-forest-50 border border-forest-200 text-forest-800 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <h3 className="text-base font-semibold text-charcoal-900 font-serif">
            Health Observation History
            {treeId && (
              <span className="ml-2 text-xs font-mono font-normal text-forest-800 px-2 py-0.5 rounded bg-forest-50 border border-forest-200">
                {treeId}
              </span>
            )}
          </h3>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="text-xs font-medium text-charcoal-600 hover:text-forest-800 transition-colors disabled:opacity-50"
          >
            Refresh
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-8 flex justify-center">
          <LoadingSpinner size="md" message="Loading health observations..." />
        </div>
      ) : healthLogs.length === 0 ? (
        <div
          data-testid="no-health-logs-message"
          className="py-8 px-4 rounded-xl bg-warm-50 border border-warm-200 text-center space-y-2"
        >
          <AlertCircle className="w-7 h-7 text-charcoal-400 mx-auto" />
          <p className="text-sm font-semibold text-charcoal-800">No health record yet</p>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            This verified tree currently has no recorded health observations on file.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {healthLogs.map((log) => (
            <div
              key={log.id}
              data-testid={`health-log-item-${log.id}`}
              className="p-4 rounded-xl bg-warm-50/50 border border-warm-200 hover:border-forest-700/30 transition-colors space-y-2.5"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>{getStatusBadge(log.healthStatus)}</div>
                <div className="flex items-center gap-1.5 text-xs text-charcoal-500 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-charcoal-400" />
                  <span>{formatTimestamp(log.recordedAt)}</span>
                </div>
              </div>

              {log.notes && (
                <div className="text-xs text-charcoal-700 flex items-start gap-2 bg-white p-2.5 rounded-lg border border-warm-200">
                  <FileText className="w-3.5 h-3.5 text-charcoal-400 shrink-0 mt-0.5" />
                  <p className="whitespace-pre-wrap">{log.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-charcoal-500 pt-2 border-t border-warm-200/80">
                {log.submittedBy ? (
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-charcoal-400" />
                    <span>Inspected by: {log.submittedBy.name || 'Caretaker'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-charcoal-400">
                    <span>Verified Observation</span>
                  </div>
                )}

                {log.photoReference && (
                  <div className="flex items-center gap-1 text-forest-800 font-mono text-[10px]">
                    <Image className="w-3 h-3 text-forest-700" />
                    <span>Photo Attached</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
