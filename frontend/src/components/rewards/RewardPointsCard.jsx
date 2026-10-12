import { Award, Sparkles, CheckCircle2 } from 'lucide-react';

/**
 * Contributor Total Points Summary Card (M12/M16).
 * Critical Rule: Displays strictly authoritative points from backend (50 pts per verified plantation).
 */
export default function RewardPointsCard({ totalPoints = 0, loading = false }) {
  return (
    <div
      data-testid="reward-points-card"
      className="p-6 rounded-2xl bg-white border border-warm-200 shadow-card space-y-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-forest-50 border border-forest-200 text-forest-800 flex items-center justify-center">
            <Award className="w-6 h-6 text-forest-700" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-forest-800 uppercase tracking-wider font-mono">
              Environmental Impact Rewards
            </span>
            <h2 className="text-xl font-bold text-charcoal-900 font-serif">Total Eco Points</h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-50 border border-forest-200 text-forest-800 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-forest-600" />
          <span>Verified Balance</span>
        </div>
      </div>

      <div className="flex items-baseline gap-2.5 pt-1">
        <span data-testid="total-points-display" className="text-4xl sm:text-5xl font-extrabold text-charcoal-900 font-mono tracking-tight">
          {loading ? '...' : totalPoints.toLocaleString()}
        </span>
        <span className="text-sm font-bold text-forest-700 font-mono">PTS</span>
      </div>

      <div className="p-4 rounded-xl bg-warm-50 border border-warm-200 text-xs text-charcoal-600 space-y-1.5">
        <div className="flex items-center gap-2 text-charcoal-900 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-forest-700" />
          <span>Authoritative Reward Rule</span>
        </div>
        <p className="text-charcoal-500 leading-relaxed">
          Earn <strong className="text-forest-800 font-semibold">50 points</strong> automatically for every plantation successfully verified by an EcoRevive coordinator.
        </p>
      </div>
    </div>
  );
}
