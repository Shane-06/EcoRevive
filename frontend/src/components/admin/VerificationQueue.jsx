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
          <Shield className="w-5 h-5 text-purple-700" />
          <h2 className="font-serif font-bold text-charcoal-900 text-base">Plantation Verification Queue</h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-warm-200 border border-warm-300 text-charcoal-700 font-mono">
            {pagination?.total ?? trees.length} submissions
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl bg-white border border-warm-400 text-charcoal-600 hover:text-charcoal-900 shadow-subtle transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-warm-200/90 border border-warm-300 shadow-subtle">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            data-testid={`queue-filter-${tab.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={() => onFilterChange && onFilterChange(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === tab
                ? 'bg-white text-purple-900 shadow-subtle border border-warm-300'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-12 rounded-2xl bg-white border border-warm-400 flex flex-col items-center justify-center min-h-[250px] shadow-card">
          <LoadingSpinner size="lg" message="Loading verification review queue..." />
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 rounded-2xl bg-white border border-warm-400 shadow-card">
          <ErrorAlert
            title="Queue Error"
            message={error.message || 'Unable to retrieve verification records.'}
            onRetry={onRefresh}
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && trees.length === 0 && (
        <div data-testid="empty-queue-notice" className="p-12 rounded-2xl bg-white border border-warm-400 text-center space-y-3 shadow-card">
          <div className="w-12 h-12 rounded-xl bg-warm-200 text-purple-800 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-charcoal-900 text-base">Queue is Clear</h3>
          <p className="text-xs text-charcoal-600 max-w-sm mx-auto leading-relaxed">
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
              cls: 'bg-[#fef9ed] border-[#f0dda2] text-[#855b11]',
              icon: Clock,
            };
            if (tree.status === 'Under Review') {
              statusBadge = {
                label: 'Under Review',
                cls: 'bg-[#eff6ff] border-[#bfdbfe] text-[#1e40af]',
                icon: Eye,
              };
            } else if (tree.status === 'Verified') {
              statusBadge = {
                label: 'Verified',
                cls: 'bg-[#edf7ee] border-[#b4dbbe] text-[#194c25]',
                icon: CheckCircle2,
              };
            } else if (tree.status === 'Rejected') {
              statusBadge = {
                label: 'Rejected',
                cls: 'bg-[#fdf2f2] border-[#f6c6c6] text-[#992222]',
                icon: AlertOctagon,
              };
            }
            const StatusIcon = statusBadge.icon;

            return (
              <div
                key={tree.id}
                data-testid={`queue-row-${tree.id}`}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-warm-400 hover:border-warm-500 shadow-card transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-serif font-bold text-charcoal-900 text-base">{tree.species}</h3>
                    {tree.treeId && (
                      <span className="px-2 py-0.5 rounded bg-forest-50 border border-forest-200 text-forest-800 font-mono text-[11px] font-bold">
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

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-charcoal-600">
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-charcoal-400" />
                      <span>Contributor: <strong className="text-charcoal-800">{tree.contributor?.name || 'Anonymous'}</strong></span>
                    </div>
                    <div>
                      <span>Coordinates: <strong className="font-mono text-charcoal-800">{tree.latitude?.toFixed(4)}, {tree.longitude?.toFixed(4)}</strong></span>
                    </div>
                    <div>
                      <span>Planted: <strong className="font-mono text-charcoal-800">{tree.plantedOn}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    data-testid={`inspect-tree-btn-${tree.id}`}
                    onClick={() => onSelectTree && onSelectTree(tree)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-semibold shadow-subtle transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-purple-200" />
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
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-warm-400 text-xs text-charcoal-600 shadow-subtle">
          <span>
            Page <strong className="text-charcoal-900">{pagination.page}</strong> of <strong className="text-charcoal-900">{pagination.totalPages}</strong>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange && onPageChange(pagination.page - 1)}
              className="p-1.5 rounded-lg bg-warm-100 border border-warm-300 text-charcoal-700 hover:bg-warm-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange && onPageChange(pagination.page + 1)}
              className="p-1.5 rounded-lg bg-warm-100 border border-warm-300 text-charcoal-700 hover:bg-warm-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
