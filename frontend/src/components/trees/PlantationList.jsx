import { Link } from 'react-router-dom';
import { Trees, Calendar, MapPin, CheckCircle2, Clock, Eye, AlertOctagon, QrCode, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';

/**
 * Status badge styling mappings matching backend lifecycle.
 */
const STATUS_BADGES = {
  Pending: {
    label: 'Pending Review',
    badgeClass: 'bg-[#fef9ed] border-[#f0dda2] text-[#855b11]',
    icon: Clock,
  },
  'Under Review': {
    label: 'Under Review',
    badgeClass: 'bg-[#eff6ff] border-[#bfdbfe] text-[#1e40af]',
    icon: Eye,
  },
  Verified: {
    label: 'Verified',
    badgeClass: 'bg-[#edf7ee] border-[#b4dbbe] text-[#194c25]',
    icon: CheckCircle2,
  },
  Rejected: {
    label: 'Rejected',
    badgeClass: 'bg-[#fdf2f2] border-[#f6c6c6] text-[#992222]',
    icon: AlertOctagon,
  },
};

/**
 * Contributor's Personal Plantations List Component (M5/M15).
 */
export default function PlantationList({
  trees = [],
  pagination = null,
  loading = false,
  error = null,
  onPageChange,
  onRefresh,
}) {
  if (loading) {
    return (
      <div className="p-12 rounded-2xl bg-white border border-warm-400 flex flex-col items-center justify-center min-h-[300px] shadow-card">
        <LoadingSpinner size="lg" message="Loading your registered plantations..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-warm-400 shadow-card">
        <ErrorAlert
          title="Failed to Load Plantations"
          message={error.message || 'Unable to retrieve your plantation history.'}
          onRetry={onRefresh}
        />
      </div>
    );
  }

  if (!trees || trees.length === 0) {
    return (
      <div data-testid="empty-plantations-notice" className="p-12 rounded-2xl bg-white border border-warm-400 text-center space-y-3 shadow-card">
        <div className="w-12 h-12 rounded-xl bg-warm-200 text-forest-800 flex items-center justify-center mx-auto">
          <Trees className="w-6 h-6" />
        </div>
        <h3 className="font-serif font-bold text-charcoal-900 text-base">No Plantations Registered Yet</h3>
        <p className="text-xs text-charcoal-600 max-w-sm mx-auto leading-relaxed">
          You haven&apos;t submitted any trees yet. Use the registration form to submit your first planting record!
        </p>
      </div>
    );
  }

  return (
    <div data-testid="plantation-list-container" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trees className="w-5 h-5 text-forest-700" />
          <h2 className="font-serif font-bold text-charcoal-900 text-base">My Registered Plantations</h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-warm-200 border border-warm-300 text-charcoal-700 font-mono">
            {pagination?.total ?? trees.length}
          </span>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 rounded-lg text-charcoal-500 hover:text-charcoal-900 hover:bg-warm-200 transition-colors"
            title="Refresh History"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3.5">
        {trees.map((tree) => {
          const statusConfig = STATUS_BADGES[tree.status] || STATUS_BADGES.Pending;
          const StatusIcon = statusConfig.icon;

          return (
            <div
              key={tree.id}
              data-testid={`plantation-item-${tree.id}`}
              className="p-5 sm:p-6 rounded-2xl bg-white border border-warm-400 shadow-card hover:border-forest-300 transition-all space-y-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-serif font-bold text-charcoal-900 text-base">{tree.species}</h3>
                    {tree.treeId && (
                      <span
                        data-testid={`authoritative-tree-id-${tree.id}`}
                        className="px-2.5 py-0.5 rounded-md bg-forest-50 border border-forest-200 text-forest-800 font-mono text-xs font-bold"
                      >
                        {tree.treeId}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-charcoal-500">Record ID: {tree.id}</p>
                </div>

                <span
                  data-testid={`status-badge-${tree.status.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${statusConfig.badgeClass}`}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusConfig.label}
                </span>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-warm-50 border border-warm-300 space-y-0.5">
                  <div className="text-[11px] text-charcoal-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-charcoal-400" />
                    <span>Planted On</span>
                  </div>
                  <div className="font-semibold text-charcoal-800 font-mono">{tree.plantedOn}</div>
                </div>

                <div className="p-3 rounded-xl bg-warm-50 border border-warm-300 space-y-0.5">
                  <div className="text-[11px] text-charcoal-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-700" />
                    <span>Location</span>
                  </div>
                  <div className="font-mono text-charcoal-800 text-[11px]">
                    {tree.latitude?.toFixed(4)}, {tree.longitude?.toFixed(4)}
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-warm-50 border border-warm-300 space-y-0.5">
                  <div className="text-[11px] text-charcoal-500">Submission Date</div>
                  <div className="font-mono text-charcoal-800 text-[11px]">
                    {tree.createdAt ? new Date(tree.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Rejection Reason (If status is Rejected) */}
              {tree.status === 'Rejected' && (
                <div
                  data-testid="rejection-reason-box"
                  className="p-3.5 rounded-xl bg-[#fdf2f2] border border-[#f6c6c6] text-xs text-[#8c1d1d] space-y-1"
                >
                  <div className="font-bold flex items-center gap-1.5 text-[#992222]">
                    <AlertOctagon className="w-3.5 h-3.5 text-[#b91c1c]" />
                    <span>Rejection Reason from Coordinator:</span>
                  </div>
                  <p className="text-[#7f1d1d] pl-5 text-[11px] leading-relaxed">
                    {tree.rejectionReason || tree.reason || 'Verification was not approved. Review photo clarity and species guidelines.'}
                  </p>
                </div>
              )}

              {/* Verified Tree Actions: Public Profile & QR */}
              {tree.status === 'Verified' && tree.treeId && (
                <div className="pt-2 border-t border-warm-300 flex items-center justify-end gap-2">
                  <Link
                    to={`/tree/${encodeURIComponent(tree.treeId)}`}
                    data-testid={`view-public-profile-btn-${tree.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-white text-xs font-semibold shadow-subtle transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5 text-forest-200" />
                    <span>View Public Profile & QR</span>
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
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
