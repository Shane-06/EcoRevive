import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Trees, CheckCircle2, Award, HeartPulse, RefreshCw, ArrowRight, ClipboardList } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import PlantationBreakdownCard from '../components/dashboard/PlantationBreakdownCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import dashboardService from '../services/dashboard.service';

/**
 * System-Wide Coordinator/Admin Dashboard Page (M12/M16).
 * Access: Restricted strictly to authenticated admin role.
 */
export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAdminDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getAdminDashboard();
      setMetrics(data || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminDashboard();
  }, [fetchAdminDashboard]);

  if (loading && !metrics) {
    return (
      <div className="max-w-7xl mx-auto py-16 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" message="Aggregating platform-wide environmental metrics..." />
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
    treesWithHealthLogs: 0,
  };

  const rewards = metrics?.rewards || {
    totalPointsIssued: 0,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-warm-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1 font-mono">
              <Shield className="w-3 h-3 text-purple-700" /> System Coordinator View
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-900 font-serif tracking-tight">
            Platform Analytics & Executive Dashboard
          </h1>
          <p className="text-sm text-charcoal-600">
            System-wide statistics on tree registrations, coordinator verification throughput, and reward token circulation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchAdminDashboard}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-charcoal-700 bg-white border border-warm-300 hover:bg-warm-100/80 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/admin/verifications"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-forest-900 hover:bg-forest-800 rounded-lg shadow-sm transition-all"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Verification Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {error && (
        <ErrorAlert
          title="Admin Metrics Sync Failed"
          message={error.message || 'Unable to retrieve system dashboard metrics.'}
          onRetry={fetchAdminDashboard}
        />
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Plantations"
          value={plantations.total}
          icon={Trees}
          accentColor="purple"
          subtitle="All registered trees in system"
          testId="admin-stat-total-plantations"
        />
        <StatCard
          title="Verified Trees"
          value={plantations.verified}
          icon={CheckCircle2}
          accentColor="emerald"
          subtitle="Officially verified & issued IDs"
          testId="admin-stat-verified-trees"
        />
        <StatCard
          title="Trees Monitored"
          value={health.treesWithHealthLogs}
          icon={HeartPulse}
          accentColor="teal"
          subtitle="Trees with active health logs"
          testId="admin-stat-monitored-trees"
        />
        <StatCard
          title="Total Points Issued"
          value={rewards.totalPointsIssued}
          icon={Award}
          accentColor="amber"
          subtitle="50 pts per verified plantation"
          testId="admin-stat-total-points-issued"
        />
      </div>

      {/* Main Grid: Status Breakdown + Operations Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <PlantationBreakdownCard
            plantations={plantations}
            title="System-Wide Plantation Breakdown"
          />
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="p-6 rounded-2xl bg-white border border-warm-200 shadow-card space-y-4">
            <h3 className="text-base font-semibold text-charcoal-900 font-serif">Administrative Actions</h3>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              Direct access to manual verification workflows and coordinator auditing tools.
            </p>

            <div className="space-y-2.5 pt-1">
              <Link
                to="/admin/verifications"
                className="p-3.5 rounded-xl bg-warm-50/70 border border-warm-200 hover:border-purple-300 transition-colors flex items-center justify-between text-xs text-charcoal-700 hover:text-charcoal-900"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-charcoal-900">Verification Queue</p>
                    <p className="text-[10px] text-charcoal-500">
                      {plantations.pending + plantations.underReview} awaiting action
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-charcoal-400" />
              </Link>

              <Link
                to="/map"
                className="p-3.5 rounded-xl bg-warm-50/70 border border-warm-200 hover:border-forest-700/40 transition-colors flex items-center justify-between text-xs text-charcoal-700 hover:text-charcoal-900"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-forest-50 border border-forest-200 text-forest-800 flex items-center justify-center">
                    <Trees className="w-4 h-4 text-forest-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-charcoal-900">Geospatial Explorer</p>
                    <p className="text-[10px] text-charcoal-500">Inspect verified tree pins</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-charcoal-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
