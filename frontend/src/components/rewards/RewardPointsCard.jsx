import { Award, Sparkles, CheckCircle2 } from 'lucide-react';

/**
 * Contributor Total Points Summary Card (M12/M16).
 * Critical Rule: Displays strictly authoritative points from backend (50 pts per verified plantation).
 */
export default function RewardPointsCard({ totalPoints = 0, loading = false }) {
  return (
    <div
      data-testid="reward-points-card"
      className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 shadow-xl space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Environmental Impact Rewards
            </span>
            <h2 className="text-xl font-bold text-white">Total Eco Points</h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Verified Balance</span>
        </div>
      </div>

      <div className="flex items-baseline gap-3 pt-2">
        <span data-testid="total-points-display" className="text-4xl sm:text-5xl font-extrabold text-white font-mono tracking-tight">
          {loading ? '...' : totalPoints.toLocaleString()}
        </span>
        <span className="text-sm font-semibold text-emerald-400">PTS</span>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1.5">
        <div className="flex items-center gap-2 text-white font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Authoritative Reward Rule</span>
        </div>
        <p className="text-slate-400">
          Earn <strong className="text-emerald-300">50 points</strong> automatically for every plantation successfully verified by an EcoRevive coordinator.
        </p>
      </div>
    </div>
  );
}
