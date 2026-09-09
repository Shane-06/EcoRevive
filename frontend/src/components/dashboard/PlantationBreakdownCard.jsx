import { Trees, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

/**
 * Plantation Status Breakdown Metric Component (M12/M16).
 * Consumes backend pre-aggregated counts: total, verified, pending, underReview, rejected.
 */
export default function PlantationBreakdownCard({
  plantations = {},
  title = 'Plantation Portfolio Breakdown',
}) {
  const {
    total = 0,
    verified = 0,
    pending = 0,
    underReview = 0,
    rejected = 0,
  } = plantations;

  return (
    <div
      data-testid="plantation-breakdown-card"
      className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <Trees className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">{title}</h3>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Total Planted: <strong className="text-white font-bold">{total}</strong>
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Verified */}
        <div
          data-testid="breakdown-verified"
          className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified
            </span>
          </div>
          <p className="text-2xl font-bold text-white font-mono">{verified}</p>
          <p className="text-[10px] text-emerald-300/80">Approved & Id Issued</p>
        </div>

        {/* Pending */}
        <div
          data-testid="breakdown-pending"
          className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Pending
            </span>
          </div>
          <p className="text-2xl font-bold text-white font-mono">{pending}</p>
          <p className="text-[10px] text-amber-300/80">Awaiting Inspection</p>
        </div>

        {/* Under Review */}
        <div
          data-testid="breakdown-under-review"
          className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/30 space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-blue-400 font-semibold">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> In Review
            </span>
          </div>
          <p className="text-2xl font-bold text-white font-mono">{underReview}</p>
          <p className="text-[10px] text-blue-300/80">Coordinator Auditing</p>
        </div>

        {/* Rejected */}
        <div
          data-testid="breakdown-rejected"
          className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-rose-400 font-semibold">
            <span className="flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Rejected
            </span>
          </div>
          <p className="text-2xl font-bold text-white font-mono">{rejected}</p>
          <p className="text-[10px] text-rose-300/80">Verification Failed</p>
        </div>
      </div>
    </div>
  );
}
