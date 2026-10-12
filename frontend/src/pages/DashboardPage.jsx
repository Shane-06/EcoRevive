import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Trees, CheckCircle2, Award, HeartPulse, MapPin, ArrowRight, RefreshCw, LayoutDashboard } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import PlantationBreakdownCard from '../components/dashboard/PlantationBreakdownCard';
import RecentActivityCard from '../components/dashboard/RecentActivityCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import dashboardService from '../services/dashboard.service';
import { useAuth } from '../hooks/useAuth';

/**
 * Contributor Dashboard Page (M12/M16).
 * Access: Restricted to authenticated contributors/users.
 * Displays strictly backend-aggregated personal metrics.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getMyDashboard();
      setMetrics(data || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading && !metrics) {
    return (
      <div className="max-w-7xl mx-auto py-16 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" message="Loading your personal environmental dashboard..." />
      </div>
    );
  }

  const plantations = metrics?.plantations || {
    total: 0,
    verified: 0,
    pending: 0,
    underReview: 0,
    rejected: 0,
  };

  const health = metrics?.health || {
    monitoredTrees: 0,
  };

  const rewards = metrics?.rewards || {
    totalPoints: 0,
    recentActivities: [],
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-warm-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-forest-50 text-forest-800 border border-forest-200 flex items-center gap-1 font-mono">
              <LayoutDashboard className="w-3 h-3 text-forest-700" /> Contributor Workspace
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-900 font-serif tracking-tight">
            Welcome back, {user?.name || 'Contributor'}
          </h1>
          <p className="text-sm text-charcoal-600">
            Overview of your planted trees, verification milestones, and environmental rewards balance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchDashboard}
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
            <span>Register Plantation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {error && (
        <ErrorAlert
          title="Dashboard Sync Failed"
          message={error.message || 'Unable to retrieve latest contributor metrics.'}
          onRetry={fetchDashboard}
        />
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Plantations"
          value={plantations.total}
          icon={Trees}
          accentColor="emerald"
          subtitle="Registered by your account"
          testId="dashboard-stat-total-plantations"
        />
        <StatCard
          title="Verified Trees"
          value={plantations.verified}
          icon={CheckCircle2}
          accentColor="blue"
          subtitle="Permanent IDs issued"
          testId="dashboard-stat-verified-trees"
        />
        <StatCard
          title="Monitored Trees"
          value={health.monitoredTrees}
          icon={HeartPulse}
          accentColor="teal"
          subtitle="Inspected by caretakers"
          testId="dashboard-stat-monitored-trees"
        />
        <StatCard
          title="Reward Points"
          value={rewards.totalPoints}
          icon={Award}
          accentColor="amber"
          subtitle="Verified impact balance"
          testId="dashboard-stat-total-points"
        />
      </div>

      {/* Main Grid: Status Breakdown + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <PlantationBreakdownCard
            plantations={plantations}
            title="My Plantations Status Breakdown"
          />

          {/* Quick Action Navigation Card */}
          <div className="p-6 rounded-2xl bg-white border border-warm-200 shadow-card space-y-4">
            <h3 className="text-base font-semibold text-charcoal-900 font-serif">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                to="/map"
                className="p-3.5 rounded-xl bg-warm-50/70 border border-warm-200 hover:border-forest-700/40 transition-colors flex items-center gap-3 text-xs text-charcoal-700 hover:text-charcoal-900"
              >
                <div className="w-8 h-8 rounded-lg bg-forest-50 border border-forest-200 text-forest-800 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-forest-700" />
                </div>
                <div>
                  <p className="font-semibold text-charcoal-900">Explore Map</p>
                  <p className="text-[10px] text-charcoal-500">Locate suitable sites</p>
                </div>
              </Link>

              <Link
                to="/trees"
                className="p-3.5 rounded-xl bg-warm-50/70 border border-warm-200 hover:border-forest-700/40 transition-colors flex items-center gap-3 text-xs text-charcoal-700 hover:text-charcoal-900"
              >
                <div className="w-8 h-8 rounded-lg bg-forest-50 border border-forest-200 text-forest-800 flex items-center justify-center shrink-0">
                  <Trees className="w-4 h-4 text-forest-700" />
                </div>
                <div>
                  <p className="font-semibold text-charcoal-900">My Plantations</p>
                  <p className="text-[10px] text-charcoal-500">Track verification state</p>
                </div>
              </Link>

              <Link
                to="/rewards"
                className="p-3.5 rounded-xl bg-warm-50/70 border border-warm-200 hover:border-forest-700/40 transition-colors flex items-center gap-3 text-xs text-charcoal-700 hover:text-charcoal-900"
              >
                <div className="w-8 h-8 rounded-lg bg-forest-50 border border-forest-200 text-forest-800 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4 text-forest-700" />
                </div>
                <div>
                  <p className="font-semibold text-charcoal-900">Rewards Ledger</p>
                  <p className="text-[10px] text-charcoal-500">View point transactions</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <RecentActivityCard recentActivities={rewards.recentActivities} />
        </div>
      </div>
    </div>
  );
}
