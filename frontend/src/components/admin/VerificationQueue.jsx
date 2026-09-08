import { Shield, Clock, Eye, CheckCircle2, AlertOctagon, ChevronLeft, ChevronRight, RefreshCw, User } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';

const STATUS_TABS = ['All', 'Pending', 'Under Review', 'Verified', 'Rejected'];

/**
 * Admin Verification Queue List Component (M9/M15).
 */
export default function VerificationQueue({
  trees = [],
  pagination = null,
  activeFilter = 'All',
  onFilterChange,
  onSelectTree,
  loading = false,
  error = null,
  onPageChange,
  onRefresh,
}) {
  return (
    <div data-testid="admin-verification-queue" className="space-y-4">
      {/* Header and Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white">Plantation Verification Queue</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {pagination?.total ?? trees.length} submissions
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            data-testid={`queue-filter-${tab.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={() => onFilterChange && onFilterChange(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === tab
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center min-h-[250px]">
          <LoadingSpinner size="lg" message="Loading verification review queue..." />
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <ErrorAlert
            title="Queue Error"
            message={error.message || 'Unable to retrieve verification records.'}
            onRetry={onRefresh}
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && trees.length === 0 && (
        <div data-testid="empty-queue-notice" className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="font-semibold text-slate-200 text-base">Queue is Clear</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No plantation submissions match the &quot;{activeFilter}&quot; status filter.
          </p>
        </div>
      )}

      {/* Queue Table / Card List */}
      {!loading && !error && trees.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {trees.map((tree) => {
            let statusBadge = {
              label: 'Pending',
              cls: 'bg-amber-950/80 border-amber-500/30 text-amber-400',
              icon: Clock,
            };
            if (tree.status === 'Under Review') {
              statusBadge = {
                label: 'Under Review',
                cls: 'bg-blue-950/80 border-blue-500/30 text-blue-400',
                icon: Eye,
              };
            } else if (tree.status === 'Verified') {
              statusBadge = {
                label: 'Verified',
                cls: 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400',
                icon: CheckCircle2,
              };
            } else if (tree.status === 'Rejected') {
              statusBadge = {
                label: 'Rejected',
                cls: 'bg-rose-950/80 border-rose-500/30 text-rose-400',
                icon: AlertOctagon,
              };
            }
            const StatusIcon = statusBadge.icon;

            return (
              <div
                key={tree.id}
                data-testid={`queue-row-${tree.id}`}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">{tree.species}</h3>
                    {tree.treeId && (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-bold">
                        {tree.treeId}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${statusBadge.cls}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusBadge.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      <span>Contributor: <strong className="text-slate-300">{tree.contributor?.name || 'Anonymous'}</strong></span>
                    </div>
                    <div>
                      <span>Coordinates: <strong className="font-mono text-slate-300">{tree.latitude?.toFixed(4)}, {tree.longitude?.toFixed(4)}</strong></span>
                    </div>
                    <div>
                      <span>Planted: <strong className="text-slate-300">{tree.plantedOn}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    data-testid={`inspect-tree-btn-${tree.id}`}
                    onClick={() => onSelectTree && onSelectTree(tree)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-950/40 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect & Verify</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && !error && pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
          <span>
            Page <strong className="text-white">{pagination.page}</strong> of <strong className="text-white">{pagination.totalPages}</strong>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange && onPageChange(pagination.page - 1)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange && onPageChange(pagination.page + 1)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
