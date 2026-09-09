import { Award, Calendar, ChevronLeft, ChevronRight, History, Sparkles } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * Paginated Reward Activity Ledger Component (M12/M16).
 * Consumes backend pagination contract: page >= 1, pageSize 1..100.
 */
export default function RewardActivityTable({
  activities = [],
  pagination = {},
  loading = false,
  onPageChange,
}) {
  const { page = 1, totalPages = 1, total = 0 } = pagination;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_e) {
      return String(dateStr);
    }
  };

  return (
    <div data-testid="reward-activity-table" className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <History className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Points Activity Ledger</h3>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Total Events: <strong className="text-slate-200">{total}</strong>
        </span>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="md" message="Loading rewards history..." />
        </div>
      ) : activities.length === 0 ? (
        <div
          data-testid="no-rewards-message"
          className="py-10 px-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center space-y-2"
        >
          <Award className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No reward activities recorded yet</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Points will be awarded automatically once your registered plantations are approved by an EcoRevive coordinator.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Activity Description</th>
                <th className="py-3 px-3">Points Earned</th>
                <th className="py-3 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {activities.map((act) => (
                <tr
                  key={act.id}
                  data-testid={`reward-activity-row-${act.id}`}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-3 text-slate-200 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{act.activity}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                      +{act.points} PTS
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatDate(act.createdAt)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
          <span>
            Showing Page <strong className="text-slate-200">{page}</strong> of{' '}
            <strong className="text-slate-200">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="rewards-prev-page-btn"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="rewards-next-page-btn"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
