import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { QrCode, Search, ShieldCheck, MapPin } from 'lucide-react';
import HealthLogForm from '../components/health/HealthLogForm';
import HealthHistoryList from '../components/health/HealthHistoryList';
import healthService from '../services/health.service';
import ErrorAlert from '../components/common/ErrorAlert';

/**
 * Caretaker Health Monitoring Workspace Page (M11/M16).
 * Access: Restricted strictly to authenticated caretakers.
 */
export default function MonitorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTreeId = searchParams.get('treeId') || '';

  const [activeTreeId, setActiveTreeId] = useState(queryTreeId);
  const [inputTreeId, setInputTreeId] = useState(queryTreeId);
  const [healthLogs, setHealthLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const fetchTreeHistory = useCallback(async (treeIdentifier) => {
    if (!treeIdentifier || treeIdentifier.trim() === '') {
      setHealthLogs([]);
      setHistoryError(null);
      return;
    }

    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const data = await healthService.getHealthHistory(treeIdentifier.trim());
      setHealthLogs(data?.healthLogs || []);
    } catch (err) {
      if (err.statusCode === 404) {
        setHealthLogs([]);
      } else {
        setHistoryError(err);
      }
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (queryTreeId) {
      setActiveTreeId(queryTreeId);
      setInputTreeId(queryTreeId);
      fetchTreeHistory(queryTreeId);
    }
  }, [queryTreeId, fetchTreeHistory]);

  const handleSearchTree = (e) => {
    e.preventDefault();
    const trimmed = inputTreeId.trim().toUpperCase();
    setActiveTreeId(trimmed);
    setSearchParams(trimmed ? { treeId: trimmed } : {});
    fetchTreeHistory(trimmed);
  };

  const handleLogCreated = (_newLog) => {
    if (activeTreeId) {
      fetchTreeHistory(activeTreeId);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-warm-300 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
              <QrCode className="w-3 h-3" /> Caretaker Workspace
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal-900 tracking-tight">
            Tree Health Monitoring Hub
          </h1>
          <p className="text-sm text-charcoal-600">
            Conduct on-site inspections, log physical health observations, and maintain the verified tree health registry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/map"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-charcoal-700 bg-warm-200 hover:bg-warm-300 border border-warm-300 rounded-xl transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-forest-700" />
            <span>Interactive Map</span>
          </Link>
        </div>
      </div>

      {/* Tree Selector Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-warm-400 shadow-card">
        <form onSubmit={handleSearchTree} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={inputTreeId}
              onChange={(e) => setInputTreeId(e.target.value)}
              placeholder="Enter verified Tree ID (e.g. ER-PLT-00001) to inspect history..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-warm-50 border border-warm-400 text-charcoal-900 placeholder-charcoal-400 font-mono text-xs sm:text-sm focus:outline-none focus:border-forest-700"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-semibold text-xs shadow-subtle transition-colors shrink-0"
          >
            Load Tree History
          </button>
        </form>
      </div>

      {historyError && (
        <ErrorAlert
          title="Unable to Load Health History"
          message={historyError.message || 'Error occurred while loading tree health observations.'}
          onRetry={() => fetchTreeHistory(activeTreeId)}
        />
      )}

      {/* Main Grid: Health Log Submission (Left) + Observations History (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-4">
          <HealthLogForm
            defaultTreeId={activeTreeId}
            onTreeChange={(val) => {
              setActiveTreeId(val);
              setInputTreeId(val);
            }}
            onSuccess={handleLogCreated}
          />

          {/* Caretaker Guidelines Box */}
          <div className="p-5 rounded-2xl bg-warm-50 border border-warm-300 space-y-2.5 text-xs text-charcoal-600 shadow-subtle">
            <div className="flex items-center gap-2 text-charcoal-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-forest-700" />
              <span>Inspection Standard Protocol</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-charcoal-600 leading-relaxed">
              <li>Observations are permanently linked to the tree&apos;s authoritative identity.</li>
              <li>Server strictly generates immutable timestamps on submission.</li>
              <li>Only trees in <span className="text-forest-800 font-semibold">Verified</span> status are eligible for health logging.</li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-7">
          <HealthHistoryList
            healthLogs={healthLogs}
            loading={loadingHistory}
            treeId={activeTreeId}
            onRefresh={() => fetchTreeHistory(activeTreeId)}
          />
        </div>
      </div>
    </div>
  );
}
