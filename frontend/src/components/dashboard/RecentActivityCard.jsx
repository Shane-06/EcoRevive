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
      className="p-6 rounded-2xl bg-white border border-warm-200 shadow-card space-y-4"
    >
      <div className="flex items-center justify-between border-b border-warm-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-forest-50 border border-forest-200 text-forest-800 flex items-center justify-center">
            <Award className="w-4 h-4 text-forest-700" />
          </div>
          <h3 className="text-base font-semibold text-charcoal-900 font-serif">Recent Points Earned</h3>
        </div>
        <Link
          to="/rewards"
          className="text-xs font-medium text-forest-800 hover:text-forest-900 flex items-center gap-1 transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {recentActivities.length === 0 ? (
        <div
          data-testid="dashboard-no-activities"
          className="py-8 px-4 rounded-xl bg-warm-50 border border-warm-200 text-center space-y-1.5"
        >
          <Sparkles className="w-6 h-6 text-charcoal-400 mx-auto" />
          <p className="text-xs font-semibold text-charcoal-700">No reward points earned yet</p>
          <p className="text-[11px] text-charcoal-500">
            Submit plantations for verification to receive impact points.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {recentActivities.map((act) => (
            <div
              key={act.id}
              data-testid={`recent-activity-item-${act.id}`}
              className="p-3 rounded-xl bg-warm-50/60 border border-warm-200 flex items-center justify-between text-xs hover:border-forest-700/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-forest-50 border border-forest-200 text-forest-800 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-forest-700" />
                </div>
                <div>
                  <p className="font-semibold text-charcoal-800">{act.activity}</p>
                  <p className="text-[10px] text-charcoal-500 flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3 text-charcoal-400" />
                    <span>{formatDate(act.createdAt)}</span>
                  </p>
                </div>
              </div>

              <span className="font-mono font-bold text-forest-800 bg-forest-50 px-2 py-0.5 rounded border border-forest-200 text-xs">
                +{act.points} PTS
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
