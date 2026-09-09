import { Link } from 'react-router-dom';
import { Sparkles, Calendar, ArrowRight, Award } from 'lucide-react';

/**
 * Contributor Recent Reward Activities Widget (M12/M16).
 */
export default function RecentActivityCard({ recentActivities = [] }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch (_e) {
      return String(dateStr);
    }
  };

  return (
    <div
      data-testid="recent-activity-card"
      className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Recent Points Earned</h3>
        </div>
        <Link
          to="/rewards"
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {recentActivities.length === 0 ? (
        <div
          data-testid="dashboard-no-activities"
          className="py-6 px-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center space-y-1.5"
        >
          <Sparkles className="w-6 h-6 text-slate-500 mx-auto" />
          <p className="text-xs font-semibold text-slate-400">No reward points earned yet</p>
          <p className="text-[11px] text-slate-500">
            Submit plantations for verification to receive impact points.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {recentActivities.map((act) => (
            <div
              key={act.id}
              data-testid={`recent-activity-item-${act.id}`}
              className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200">{act.activity}</p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(act.createdAt)}</span>
                  </p>
                </div>
              </div>

              <span className="font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 text-xs">
                +{act.points} PTS
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
