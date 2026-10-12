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
    <div data-testid="reward-activity-table" className="p-6 rounded-2xl bg-white border border-warm-200 shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-warm-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-forest-50 border border-forest-200 text-forest-800 flex items-center justify-center">
            <History className="w-4 h-4 text-forest-700" />
          </div>
          <h3 className="text-base font-semibold text-charcoal-900 font-serif">Points Activity Ledger</h3>
        </div>
        <span className="text-xs font-mono text-charcoal-500">
          Total Events: <strong className="text-charcoal-900 font-semibold">{total}</strong>
        </span>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="md" message="Loading rewards history..." />
        </div>
      ) : activities.length === 0 ? (
        <div
          data-testid="no-rewards-message"
          className="py-10 px-4 rounded-xl bg-warm-50 border border-warm-200 text-center space-y-2"
        >
          <Award className="w-8 h-8 text-charcoal-400 mx-auto" />
          <p className="text-sm font-semibold text-charcoal-800">No reward activities recorded yet</p>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            Points will be awarded automatically once your registered plantations are approved by an EcoRevive coordinator.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-warm-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-warm-50 border-b border-warm-200 text-charcoal-500 uppercase tracking-wider font-mono font-medium text-[11px]">
                <th className="py-3 px-3.5">Activity Description</th>
                <th className="py-3 px-3.5">Points Earned</th>
                <th className="py-3 px-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-200 font-medium">
              {activities.map((act) => (
                <tr
                  key={act.id}
                  data-testid={`reward-activity-row-${act.id}`}
                  className="hover:bg-warm-50/70 transition-colors"
                >
                  <td className="py-3.5 px-3.5 text-charcoal-800 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                    <span>{act.activity}</span>
                  </td>
                  <td className="py-3.5 px-3.5">
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-forest-800 bg-forest-50 px-2 py-0.5 rounded border border-forest-200">
                      +{act.points} PTS
                    </span>
                  </td>
                  <td className="py-3.5 px-3.5 text-charcoal-500 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-charcoal-400" />
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
        <div className="flex items-center justify-between pt-3 border-t border-warm-200 text-xs text-charcoal-500">
          <span>
            Showing Page <strong className="text-charcoal-900 font-semibold">{page}</strong> of{' '}
            <strong className="text-charcoal-900 font-semibold">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="rewards-prev-page-btn"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-warm-200 bg-white hover:bg-warm-50 disabled:opacity-40 disabled:pointer-events-none text-charcoal-700 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="rewards-next-page-btn"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-warm-200 bg-white hover:bg-warm-50 disabled:opacity-40 disabled:pointer-events-none text-charcoal-700 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
