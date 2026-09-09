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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 border border-emerald-500/40 text-emerald-300">
            <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
            Healthy
          </span>
        );
      case 'Good':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-950 border border-teal-500/40 text-teal-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            Good
          </span>
        );
      case 'Needs Attention':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950 border border-amber-500/40 text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Needs Attention
          </span>
        );
      case 'Dead':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950 border border-rose-500/40 text-rose-300">
            <Skull className="w-3.5 h-3.5 text-rose-400" />
            Dead
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
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
    <div data-testid="health-history-list" className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-teal-400" />
          <h3 className="text-base font-bold text-white">
            Health Observation History
            {treeId && (
              <span className="ml-2 text-xs font-mono text-teal-400 px-2 py-0.5 rounded bg-teal-950/80 border border-teal-500/30">
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
            className="text-xs text-slate-400 hover:text-teal-300 transition-colors disabled:opacity-50"
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
          className="py-8 px-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center space-y-2"
        >
          <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No health record yet</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            This verified tree currently has no recorded health observations on file.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {healthLogs.map((log) => (
            <div
              key={log.id}
              data-testid={`health-log-item-${log.id}`}
              className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700/80 transition-colors space-y-2.5"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>{getStatusBadge(log.healthStatus)}</div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formatTimestamp(log.recordedAt)}</span>
                </div>
              </div>

              {log.notes && (
                <div className="text-xs text-slate-300 flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                  <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <p className="whitespace-pre-wrap">{log.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                {log.submittedBy ? (
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-500" />
                    <span>Inspected by: {log.submittedBy.name || 'Caretaker'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-slate-500">
                    <span>Verified Observation</span>
                  </div>
                )}

                {log.photoReference && (
                  <div className="flex items-center gap-1 text-teal-400 font-mono text-[10px]">
                    <Image className="w-3 h-3" />
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
