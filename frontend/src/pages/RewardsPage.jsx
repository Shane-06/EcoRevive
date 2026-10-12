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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-warm-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-forest-50 text-forest-800 border border-forest-200 flex items-center gap-1 font-mono">
              <Award className="w-3 h-3 text-forest-700" /> Impact Rewards
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-900 font-serif tracking-tight">
            Rewards & Contribution Points
          </h1>
          <p className="text-sm text-charcoal-600">
            Track points earned for verified environmental plantation initiatives.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchRewards(pagination.page)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-charcoal-700 bg-white border border-warm-300 hover:bg-warm-100/80 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/trees"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-forest-900 hover:bg-forest-800 rounded-lg shadow-sm transition-all"
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
