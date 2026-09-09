import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Award, Trees, ArrowRight, RefreshCw } from 'lucide-react';
import RewardPointsCard from '../components/rewards/RewardPointsCard';
import RewardActivityTable from '../components/rewards/RewardActivityTable';
import ErrorAlert from '../components/common/ErrorAlert';
import rewardService from '../services/reward.service';

/**
 * Contributor Environmental Rewards Page (M12/M16).
 * Access: Authenticated users.
 */
export default function RewardsPage() {
  const [totalPoints, setTotalPoints] = useState(0);
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRewards = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await rewardService.getMyRewards({ page, pageSize: 20 });
      setTotalPoints(data?.totalPoints || 0);
      setActivities(data?.activities || []);
      setPagination(data?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRewards(1);
  }, [fetchRewards]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Award className="w-3 h-3" /> Impact Rewards
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Rewards & Contribution Points
          </h1>
          <p className="text-sm text-slate-400">
            Track points earned for verified environmental plantation initiatives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchRewards(pagination.page)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/trees"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-all hover:scale-[1.02]"
          >
            <Trees className="w-3.5 h-3.5" />
            <span>Plant New Tree</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {error && (
        <ErrorAlert
          title="Failed to Load Rewards"
          message={error.message || 'Unable to retrieve reward point ledger.'}
          onRetry={() => fetchRewards(pagination.page)}
        />
      )}

      {/* Grid: Points Summary + Activities Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <RewardPointsCard totalPoints={totalPoints} loading={loading} />
        </div>

        <div className="lg:col-span-8">
          <RewardActivityTable
            activities={activities}
            pagination={pagination}
            loading={loading}
            onPageChange={(newPage) => fetchRewards(newPage)}
          />
        </div>
      </div>
    </div>
  );
}
