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
    badgeClass: 'bg-amber-950/80 border-amber-500/30 text-amber-400',
    icon: Clock,
  },
  'Under Review': {
    label: 'Under Review',
    badgeClass: 'bg-blue-950/80 border-blue-500/30 text-blue-400',
    icon: Eye,
  },
  Verified: {
    label: 'Verified',
    badgeClass: 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400',
    icon: CheckCircle2,
  },
  Rejected: {
    label: 'Rejected',
    badgeClass: 'bg-rose-950/80 border-rose-500/30 text-rose-400',
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
      <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center min-h-[300px]">
        <LoadingSpinner size="lg" message="Loading your registered plantations..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
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
      <div data-testid="empty-plantations-notice" className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
          <Trees className="w-6 h-6 text-emerald-400" />
        </div>
        <h3 className="font-semibold text-slate-200 text-base">No Plantations Registered Yet</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          You haven&apos;t submitted any trees yet. Use the registration form to submit your first planting record!
        </p>
      </div>
    );
  }

  return (
    <div data-testid="plantation-list-container" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trees className="w-5 h-5 text-emerald-400" />
          <h2 className="font-bold text-white text-base">My Registered Plantations</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {pagination?.total ?? trees.length}
          </span>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
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
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800/90 shadow-md hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">{tree.species}</h3>
                    {tree.treeId && (
                      <span
                        data-testid={`authoritative-tree-id-${tree.id}`}
                        className="px-2.5 py-0.5 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold"
                      >
                        {tree.treeId}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-slate-500">Record ID: {tree.id}</p>
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
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-0.5">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Planted On</span>
                  </div>
                  <div className="font-semibold text-slate-200">{tree.plantedOn}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-0.5">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-400" />
                    <span>Location</span>
                  </div>
                  <div className="font-mono text-slate-300 text-[11px]">
                    {tree.latitude?.toFixed(4)}, {tree.longitude?.toFixed(4)}
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-0.5">
                  <div className="text-[11px] text-slate-400">Submission Date</div>
                  <div className="font-mono text-slate-300 text-[11px]">
                    {tree.createdAt ? new Date(tree.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Rejection Reason (If status is Rejected) */}
              {tree.status === 'Rejected' && (
                <div
                  data-testid="rejection-reason-box"
                  className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 space-y-1"
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                    <span>Rejection Reason from Coordinator:</span>
                  </div>
                  <p className="text-rose-200/90 pl-5 text-[11px] leading-relaxed">
                    {tree.rejectionReason || tree.reason || 'Verification was not approved. Review photo clarity and species guidelines.'}
                  </p>
                </div>
              )}

              {/* Verified Tree Actions: Public Profile & QR */}
              {tree.status === 'Verified' && tree.treeId && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                  <Link
                    to={`/tree/${encodeURIComponent(tree.treeId)}`}
                    data-testid={`view-public-profile-btn-${tree.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" />
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
