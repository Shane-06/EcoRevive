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
      className="p-6 rounded-2xl bg-white border border-warm-200 shadow-card space-y-5"
    >
      <div className="flex items-center justify-between border-b border-warm-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-forest-50 border border-forest-200 text-forest-800 flex items-center justify-center">
            <Trees className="w-4 h-4 text-forest-700" />
          </div>
          <h3 className="text-base font-semibold text-charcoal-900 font-serif">{title}</h3>
        </div>
        <span className="text-xs font-mono text-charcoal-500">
          Total Planted: <strong className="text-charcoal-900 font-semibold">{total}</strong>
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Verified */}
        <div
          data-testid="breakdown-verified"
          className="p-3.5 rounded-xl bg-forest-50/70 border border-forest-200 space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-forest-800 font-semibold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-forest-700" /> Verified
            </span>
          </div>
          <p className="text-2xl font-bold text-charcoal-900 font-mono">{verified}</p>
          <p className="text-[10px] text-forest-700 font-medium">Approved & Id Issued</p>
        </div>

        {/* Pending */}
        <div
          data-testid="breakdown-pending"
          className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-700" /> Pending
            </span>
          </div>
          <p className="text-2xl font-bold text-charcoal-900 font-mono">{pending}</p>
          <p className="text-[10px] text-amber-700 font-medium">Awaiting Inspection</p>
        </div>

        {/* Under Review */}
        <div
          data-testid="breakdown-under-review"
          className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-sky-800 font-semibold">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-sky-700" /> In Review
            </span>
          </div>
          <p className="text-2xl font-bold text-charcoal-900 font-mono">{underReview}</p>
          <p className="text-[10px] text-sky-700 font-medium">Coordinator Auditing</p>
        </div>

        {/* Rejected */}
        <div
          data-testid="breakdown-rejected"
          className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-rose-800 font-semibold">
            <span className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-700" /> Rejected
            </span>
          </div>
          <p className="text-2xl font-bold text-charcoal-900 font-mono">{rejected}</p>
          <p className="text-[10px] text-rose-700 font-medium">Verification Failed</p>
        </div>
      </div>
    </div>
  );
}
