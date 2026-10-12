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
      <div className="p-6 rounded-2xl bg-white border border-warm-400 flex flex-col items-center justify-center shadow-card">
        <LoadingSpinner size="md" message="Loading species catalog from database..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-white border border-warm-400 shadow-card">
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
    <div data-testid="species-selector" className="p-5 rounded-2xl bg-white border border-warm-400 space-y-4 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TreePine className="w-4 h-4 text-forest-700" />
          <h3 className="font-serif font-bold text-charcoal-900 text-sm">Select Tree Species</h3>
        </div>
        <span className="text-[11px] text-charcoal-500 font-mono">
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
          className="w-full px-3.5 py-2.5 rounded-xl bg-warm-50 border border-warm-400 text-charcoal-900 text-xs sm:text-sm font-medium focus:outline-none focus:border-forest-700 transition-colors cursor-pointer"
        >
          {speciesList.map((sp) => (
            <option key={sp.name} value={sp.name} className="bg-white text-charcoal-900">
              {sp.name} ({sp.climateRegion})
            </option>
          ))}
        </select>
      </div>

      {/* Selected Species Biological Requirements Card */}
      {activeSpecies && (
        <div className="p-3.5 rounded-xl bg-warm-50 border border-warm-300 space-y-2.5">
          <div className="flex items-center justify-between border-b border-warm-300/80 pb-2">
            <span className="font-bold text-forest-900 text-sm font-serif">{activeSpecies.name}</span>
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-forest-50 border border-forest-200 text-forest-800">
              {activeSpecies.climateRegion}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-charcoal-700">
              <Layers className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
              <span className="text-charcoal-500">Soil:</span>
              <span className="font-medium truncate" title={activeSpecies.soilType}>
                {activeSpecies.soilType}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-charcoal-700">
              <MoveHorizontal className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
              <span className="text-charcoal-500">Min Spacing:</span>
              <span className="font-medium">{activeSpecies.minSpacingMeters}m</span>
            </div>

            <div className="flex items-center gap-1.5 text-charcoal-700">
              <Sun className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
              <span className="text-charcoal-500">Sunlight:</span>
              <span className="font-medium">{activeSpecies.sunlight}</span>
            </div>

            <div className="flex items-center gap-1.5 text-charcoal-700">
              <Droplet className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
              <span className="text-charcoal-500">Water Need:</span>
              <span className="font-medium">{activeSpecies.waterNeed}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
