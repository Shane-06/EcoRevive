import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { PlusCircle, Trees } from 'lucide-react';
import PlantationForm from '../components/trees/PlantationForm';
import PlantationList from '../components/trees/PlantationList';
import treeService from '../services/tree.service';

/**
 * Contributor Plantation Workspace Page (M5/M15).
 * Hosts plantation registration form and personal plantation tracking list.
 */
export default function PlantationPage() {
  const location = useLocation();
  const initialCoords = location.state?.coords || null;

  const [activeTab, setActiveTab] = useState(initialCoords ? 'register' : 'list');
  const [trees, setTrees] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const loadMyPlantations = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await treeService.getMyPlantations({ page, pageSize: 10 });
      setTrees(data?.trees || []);
      setPagination(data?.pagination || null);
      setCurrentPage(page);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyPlantations(1);
  }, [loadMyPlantations]);

  const handleFormSuccess = () => {
    loadMyPlantations(1);
    setActiveTab('list');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-white border border-warm-400 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-forest-50 border border-forest-200 text-forest-800 flex items-center justify-center">
              <Trees className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-charcoal-900">Contributor Plantation Hub</h1>
              <p className="text-xs text-charcoal-600">
                Register new tree plantings and track coordinator verification status in real time.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex rounded-xl bg-warm-200/90 p-1 border border-warm-300 self-start md:self-auto shadow-subtle">
          <button
            type="button"
            data-testid="tab-register-plantation"
            onClick={() => setActiveTab('register')}
            className={`py-2 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'register'
                ? 'bg-white text-forest-900 shadow-subtle'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Register Plantation</span>
          </button>
          <button
            type="button"
            data-testid="tab-my-plantations"
            onClick={() => setActiveTab('list')}
            className={`py-2 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'list'
                ? 'bg-white text-forest-900 shadow-subtle'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            <Trees className="w-3.5 h-3.5" />
            <span>My Plantations ({pagination?.total ?? trees.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {activeTab === 'register' && (
          <div className="max-w-2xl mx-auto">
            <PlantationForm initialCoords={initialCoords} onSuccess={handleFormSuccess} />
          </div>
        )}

        {activeTab === 'list' && (
          <PlantationList
            trees={trees}
            pagination={pagination}
            loading={loading}
            error={error}
            onPageChange={(p) => loadMyPlantations(p)}
            onRefresh={() => loadMyPlantations(currentPage)}
          />
        )}
      </div>
    </div>
  );
}
