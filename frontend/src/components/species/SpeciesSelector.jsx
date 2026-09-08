import { TreePine, Sun, Droplet, MoveHorizontal, Layers } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';

/**
 * Species catalog selector component for deterministic suitability evaluation.
 */
export default function SpeciesSelector({
  speciesList = [],
  selectedSpecies = null,
  onSelectSpecies,
  loading = false,
  error = null,
  onRetry,
}) {
  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center">
        <LoadingSpinner size="md" message="Loading species catalog from database..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <ErrorAlert
          title="Catalog Error"
          message={error.message || 'Unable to load species catalog.'}
          onRetry={onRetry}
        />
      </div>
    );
  }

  const activeSpecies = speciesList.find((s) => s.name === selectedSpecies) || speciesList[0] || null;

  return (
    <div data-testid="species-selector" className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TreePine className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold text-white text-sm">Select Tree Species</h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          {speciesList.length} canonical species
        </span>
      </div>

      {/* Dropdown / Select Input */}
      <div>
        <label htmlFor="species-select" className="sr-only">
          Select Tree Species
        </label>
        <select
          id="species-select"
          data-testid="species-select"
          value={selectedSpecies || activeSpecies?.name || ''}
          onChange={(e) => onSelectSpecies && onSelectSpecies(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all cursor-pointer"
        >
          {speciesList.map((sp) => (
            <option key={sp.name} value={sp.name} className="bg-slate-900 text-slate-100">
              {sp.name} ({sp.climateRegion})
            </option>
          ))}
        </select>
      </div>

      {/* Selected Species Biological Requirements Card */}
      {activeSpecies && (
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="font-bold text-emerald-400 text-sm">{activeSpecies.name}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
              {activeSpecies.climateRegion}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-400">Soil:</span>
              <span className="font-medium truncate" title={activeSpecies.soilType}>
                {activeSpecies.soilType}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <MoveHorizontal className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-slate-400">Min Spacing:</span>
              <span className="font-medium">{activeSpecies.minSpacingMeters}m</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <Sun className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="text-slate-400">Sunlight:</span>
              <span className="font-medium">{activeSpecies.sunlight}</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <Droplet className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-slate-400">Water Need:</span>
              <span className="font-medium">{activeSpecies.waterNeed}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
