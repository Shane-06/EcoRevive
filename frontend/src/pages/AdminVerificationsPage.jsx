import { useState, useEffect, useCallback } from 'react';
import { Shield } from 'lucide-react';
import VerificationQueue from '../components/admin/VerificationQueue';
import VerificationModal from '../components/admin/VerificationModal';
import verificationService from '../services/verification.service';

/**
 * Admin Verification Workflow Page (M9/M15).
 * Hosts queue management and state transition execution modal.
 */
export default function AdminVerificationsPage() {
  const [trees, setTrees] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTree, setSelectedTree] = useState(null);

  const loadQueue = useCallback(async (filter = activeFilter, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await verificationService.getReviewQueue({
        status: filter,
        page,
        pageSize: 10,
      });
      setTrees(data?.trees || []);
      setPagination(data?.pagination || null);
      setCurrentPage(page);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    loadQueue(activeFilter, 1);
  }, [activeFilter, loadQueue]);

  const handleFilterChange = (newFilter) => {
    setActiveFilter(newFilter);
    loadQueue(newFilter, 1);
  };

  const handleStatusUpdated = () => {
    loadQueue(activeFilter, currentPage);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Coordinator Verification Hub</h1>
            <p className="text-xs text-slate-400">
              Review contributor plantation submissions, verify field evidence, and issue permanent Tree IDs.
            </p>
          </div>
        </div>
      </div>

      {/* Verification Queue Component */}
      <VerificationQueue
        trees={trees}
        pagination={pagination}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        onSelectTree={(tree) => setSelectedTree(tree)}
        loading={loading}
        error={error}
        onPageChange={(p) => loadQueue(activeFilter, p)}
        onRefresh={() => loadQueue(activeFilter, currentPage)}
      />

      {/* Selected Tree Inspection Modal */}
      {selectedTree && (
        <VerificationModal
          tree={selectedTree}
          onClose={() => setSelectedTree(null)}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
}
