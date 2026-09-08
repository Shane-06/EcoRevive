import { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Sparkles, Cloud, TreePine, Navigation, LocateFixed, Search } from 'lucide-react';
import MapView from '../components/map/MapView';
import TreeDetailCard from '../components/map/TreeDetailCard';
import EnvironmentPanel from '../components/environment/EnvironmentPanel';
import SpeciesSelector from '../components/species/SpeciesSelector';
import SuitabilityPanel from '../components/suitability/SuitabilityPanel';
import mapService from '../services/map.service';
import environmentService from '../services/environment.service';
import speciesService from '../services/species.service';
import suitabilityService from '../services/suitability.service';

const DEFAULT_CENTER = { lat: 30.65, lng: 76.78 };

/**
 * Milestone 14: Frontend Map & Environmental Information Experience.
 */
export default function MapPage() {
  // Map and Trees State
  const [trees, setTrees] = useState([]);
  const [selectedTree, setSelectedTree] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_CENTER);
  const [activeTab, setActiveTab] = useState('environment'); // 'environment' | 'suitability' | 'species'

  // Coordinate Search Input State
  const [inputLat, setInputLat] = useState(String(DEFAULT_CENTER.lat));
  const [inputLng, setInputLng] = useState(String(DEFAULT_CENTER.lng));
  const [coordError, setCoordError] = useState(null);

  // Environmental Metrics State
  const [environment, setEnvironment] = useState(null);
  const [envLoading, setEnvLoading] = useState(false);
  const [envError, setEnvError] = useState(null);

  // Species Catalog State
  const [speciesList, setSpeciesList] = useState([]);
  const [selectedSpecies, setSelectedSpecies] = useState('Neem');
  const [speciesLoading, setSpeciesLoading] = useState(false);
  const [speciesError, setSpeciesError] = useState(null);

  // Suitability Evaluation State
  const [suitability, setSuitability] = useState(null);
  const [suitabilityLoading, setSuitabilityLoading] = useState(false);
  const [suitabilityError, setSuitabilityError] = useState(null);

  const lastViewportRef = useRef(null);

  // 1. Fetch Species Catalog on Mount
  const loadSpeciesCatalog = useCallback(async () => {
    setSpeciesLoading(true);
    setSpeciesError(null);
    try {
      const data = await speciesService.getSpeciesCatalog();
      const list = data?.species || [];
      setSpeciesList(list);
      if (list.length > 0 && !selectedSpecies) {
        setSelectedSpecies(list[0].name);
      }
    } catch (err) {
      setSpeciesError(err);
    } finally {
      setSpeciesLoading(false);
    }
  }, [selectedSpecies]);

  useEffect(() => {
    loadSpeciesCatalog();
  }, [loadSpeciesCatalog]);

  // 2. Fetch Environmental Data for Coordinates
  const fetchEnvironment = useCallback(async (coords) => {
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') return;
    setEnvLoading(true);
    setEnvError(null);
    try {
      const data = await environmentService.getEnvironment({ lat: coords.lat, lng: coords.lng });
      setEnvironment(data);
    } catch (err) {
      setEnvError(err);
      setEnvironment(null);
    } finally {
      setEnvLoading(false);
    }
  }, []);

  // 3. Fetch Suitability Evaluation for Coordinates & Species
  const fetchSuitability = useCallback(async (coords, speciesName) => {
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number' || !speciesName) return;
    setSuitabilityLoading(true);
    setSuitabilityError(null);
    try {
      const data = await suitabilityService.assessSuitability({
        lat: coords.lat,
        lng: coords.lng,
        species: speciesName,
      });
      setSuitability(data);
    } catch (err) {
      setSuitabilityError(err);
      setSuitability(null);
    } finally {
      setSuitabilityLoading(false);
    }
  }, []);

  // Run initial environment and suitability query on mount
  useEffect(() => {
    fetchEnvironment(DEFAULT_CENTER);
    fetchSuitability(DEFAULT_CENTER, 'Neem');
  }, [fetchEnvironment, fetchSuitability]);

  // 4. Handle Viewport Change (Fetch verified trees in bounding box)
  const handleViewportChange = useCallback(async (bounds) => {
    lastViewportRef.current = bounds;
    try {
      const data = await mapService.getTreesInViewport({
        minLat: bounds.minLat,
        minLng: bounds.minLng,
        maxLat: bounds.maxLat,
        maxLng: bounds.maxLng,
        page: 1,
        pageSize: 50,
      });
      setTrees(data?.trees || []);
    } catch {
      // In case of error (e.g. invalid bounds or network), silently retain or clear
    }
  }, []);

  // 5. Handle Location Selection on Map
  const handleSelectLocation = useCallback(
    (coords) => {
      setSelectedLocation(coords);
      setSelectedTree(null);
      setInputLat(String(coords.lat));
      setInputLng(String(coords.lng));
      setCoordError(null);

      fetchEnvironment(coords);
      if (selectedSpecies) {
        fetchSuitability(coords, selectedSpecies);
      }
    },
    [fetchEnvironment, fetchSuitability, selectedSpecies]
  );

  // 6. Handle Tree Marker Click
  const handleSelectTree = useCallback(
    (tree) => {
      setSelectedTree(tree);
      const coords = { lat: tree.latitude, lng: tree.longitude };
      setSelectedLocation(coords);
      setInputLat(String(tree.latitude));
      setInputLng(String(tree.longitude));

      fetchEnvironment(coords);
      const speciesName = tree.species || selectedSpecies || 'Neem';
      setSelectedSpecies(speciesName);
      fetchSuitability(coords, speciesName);
    },
    [fetchEnvironment, fetchSuitability, selectedSpecies]
  );

  // 7. Handle Species Change
  const handleSelectSpecies = (speciesName) => {
    setSelectedSpecies(speciesName);
    if (selectedLocation) {
      fetchSuitability(selectedLocation, speciesName);
    }
  };

  // 8. Handle Manual Coordinate Input Submit
  const handleCoordinateSubmit = (e) => {
    e.preventDefault();
    const lat = parseFloat(inputLat.trim());
    const lng = parseFloat(inputLng.trim());

    if (isNaN(lat) || !isFinite(lat) || lat < -90 || lat > 90) {
      setCoordError('Latitude must be a valid number between -90 and 90');
      return;
    }
    if (isNaN(lng) || !isFinite(lng) || lng < -180 || lng > 180) {
      setCoordError('Longitude must be a valid number between -180 and 180');
      return;
    }

    setCoordError(null);
    handleSelectLocation({ lat, lng });
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white">Environmental Map & Information</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Explore verified plantations, inspect atmospheric & soil metrics, and evaluate species suitability.
          </p>
        </div>

        {/* Manual Coordinates Search Form */}
        <form onSubmit={handleCoordinateSubmit} className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Lat (e.g. 30.65)"
              value={inputLat}
              onChange={(e) => setInputLat(e.target.value)}
              className="w-24 sm:w-28 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <input
              type="text"
              placeholder="Lng (e.g. 76.78)"
              value={inputLng}
              onChange={(e) => setInputLng(e.target.value)}
              className="w-24 sm:w-28 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Assess</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectLocation(DEFAULT_CENTER)}
            title="Reset to Chandigarh Baseline"
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        </form>
      </div>

      {coordError && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <span className="font-semibold">Input Error:</span> {coordError}
        </div>
      )}

      {/* Main Grid: Map (Left) + Information Panels (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Map View Column */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="h-[450px] lg:h-[620px] w-full">
            <MapView
              trees={trees}
              selectedLocation={selectedLocation}
              selectedTree={selectedTree}
              onSelectLocation={handleSelectLocation}
              onSelectTree={handleSelectTree}
              onViewportChange={handleViewportChange}
              center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
              zoom={12}
            />
          </div>

          {/* Selected Tree Detail Card (If active) */}
          {selectedTree && (
            <TreeDetailCard
              tree={selectedTree}
              onClose={() => setSelectedTree(null)}
              onAssessLocation={handleSelectLocation}
            />
          )}
        </div>

        {/* Information & Analysis Column */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Navigation Tabs */}
          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('environment')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'environment'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Environment</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('suitability')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'suitability'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Suitability</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('species')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'species'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TreePine className="w-3.5 h-3.5" />
              <span>Species ({speciesList.length})</span>
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="space-y-4">
            {activeTab === 'environment' && (
              <EnvironmentPanel
                environment={environment}
                loading={envLoading}
                error={envError}
                onRefresh={() => fetchEnvironment(selectedLocation)}
              />
            )}

            {activeTab === 'suitability' && (
              <div className="space-y-4">
                {/* Species Selector Mini Header */}
                <SpeciesSelector
                  speciesList={speciesList}
                  selectedSpecies={selectedSpecies}
                  onSelectSpecies={handleSelectSpecies}
                  loading={speciesLoading}
                  error={speciesError}
                  onRetry={loadSpeciesCatalog}
                />

                <SuitabilityPanel
                  suitability={suitability}
                  loading={suitabilityLoading}
                  error={suitabilityError}
                  onAssess={() => fetchSuitability(selectedLocation, selectedSpecies)}
                />
              </div>
            )}

            {activeTab === 'species' && (
              <div className="space-y-4">
                <SpeciesSelector
                  speciesList={speciesList}
                  selectedSpecies={selectedSpecies}
                  onSelectSpecies={handleSelectSpecies}
                  loading={speciesLoading}
                  error={speciesError}
                  onRetry={loadSpeciesCatalog}
                />

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Species Catalog Overview
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    EcoRevive supports 10 canonical native tree species defined in the project baseline. Biological parameters (soil type, minimum spacing, sunlight, water requirements) are authoritatively managed in PostgreSQL rules and evaluated deterministically.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('suitability')}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Run Suitability for {selectedSpecies}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
