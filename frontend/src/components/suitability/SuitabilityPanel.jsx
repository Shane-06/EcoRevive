import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ShieldAlert, Sparkles, Layers, Sun, Droplets, MoveHorizontal, RefreshCw } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';

/**
 * Status style configurations mapping directly to backend SUITABILITY_STATUS.
 * Restrained, accessible colors distinguishing unavailable data from unsuitable conditions.
 */
const STATUS_CONFIGS = {
  suitable: {
    label: 'Suitable',
    bgColor: 'bg-[#eef7f0]',
    borderColor: 'border-[#b4dbbe]',
    textColor: 'text-[#1a4b27]',
    badgeClass: 'bg-[#e0f0e3] border-[#a0d2ac] text-[#144220]',
    icon: CheckCircle2,
  },
  moderate: {
    label: 'Moderate',
    bgColor: 'bg-[#fef9ed]',
    borderColor: 'border-[#f0dda2]',
    textColor: 'text-[#78500c]',
    badgeClass: 'bg-[#faeed0] border-[#e7cf8a] text-[#694508]',
    icon: AlertTriangle,
  },
  unsuitable: {
    label: 'Unsuitable',
    bgColor: 'bg-[#fdf2f2]',
    borderColor: 'border-[#f6c6c6]',
    textColor: 'text-[#8c1d1d]',
    badgeClass: 'bg-[#fae2e2] border-[#e8a8a8] text-[#7d1919]',
    icon: XCircle,
  },
  insufficient_data: {
    label: 'Insufficient Data',
    bgColor: 'bg-[#f4f5f6]',
    borderColor: 'border-[#d8dce2]',
    textColor: 'text-[#334155]',
    badgeClass: 'bg-[#e8ecf0] border-[#c7ced8] text-[#1e293b]',
    icon: HelpCircle,
  },
};

/**
 * Pure display component for the Deterministic Suitability Engine results.
 */
export default function SuitabilityPanel({
  suitability = null,
  loading = false,
  error = null,
  onAssess,
}) {
  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-warm-400 flex flex-col items-center justify-center min-h-[300px] shadow-card">
        <LoadingSpinner size="lg" message="Evaluating deterministic suitability rules..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-warm-400 shadow-card">
        <ErrorAlert
          title="Suitability Assessment Error"
          message={error.message || 'Failed to evaluate species suitability.'}
          onRetry={onAssess}
        />
      </div>
    );
  }

  if (!suitability) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-warm-400 text-center space-y-3 shadow-card">
        <div className="w-12 h-12 rounded-xl bg-warm-200 text-forest-800 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="font-serif font-bold text-charcoal-900 text-base">Suitability Ready</h3>
        <p className="text-xs text-charcoal-600 max-w-xs mx-auto leading-relaxed">
          Select a geographic coordinate on the map and choose a species to run the deterministic suitability assessment.
        </p>
      </div>
    );
  }

  const { species, overall, checks, location } = suitability;
  const statusKey = overall?.status || 'insufficient_data';
  const config = STATUS_CONFIGS[statusKey] || STATUS_CONFIGS.insufficient_data;
  const StatusIcon = config.icon;

  const checkItems = [
    {
      key: 'soil',
      title: 'Soil Compatibility',
      icon: Layers,
      check: checks?.soil,
    },
    {
      key: 'sunlight',
      title: 'Sunlight & Canopy',
      icon: Sun,
      check: checks?.sunlight,
    },
    {
      key: 'water',
      title: 'Water & Moisture',
      icon: Droplets,
      check: checks?.water,
    },
    {
      key: 'spacing',
      title: 'Physical Spacing',
      icon: MoveHorizontal,
      check: checks?.spacing,
    },
  ];

  return (
    <div data-testid="suitability-panel" className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-forest-700" />
          <h2 className="font-serif font-bold text-charcoal-900 text-base">Species Suitability Result</h2>
        </div>
        {onAssess && (
          <button
            type="button"
            onClick={onAssess}
            className="p-1.5 rounded-lg text-charcoal-500 hover:text-charcoal-900 hover:bg-warm-200 transition-colors"
            title="Re-evaluate"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Overall Assessment Banner */}
      <div className={`p-5 rounded-2xl ${config.bgColor} border ${config.borderColor} shadow-subtle space-y-3`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs text-charcoal-600 block">Evaluated Species:</span>
            <h3 className="text-xl font-serif font-bold text-charcoal-900 leading-tight">{species}</h3>
            {location && (
              <p className="text-[11px] font-mono text-charcoal-600 mt-0.5">
                Location: {location.latitude?.toFixed(4)}°, {location.longitude?.toFixed(4)}°
              </p>
            )}
          </div>
          <div
            data-testid={`overall-status-${statusKey}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider shadow-subtle ${config.badgeClass}`}
          >
            <StatusIcon className="w-4 h-4" />
            <span>{config.label}</span>
          </div>
        </div>

        <div className="text-xs text-charcoal-800 leading-relaxed border-t border-black/10 pt-2.5">
          {overall?.explanation || 'Evaluation completed based on biological rules.'}
        </div>
      </div>

      {/* Component Checks Breakdown */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider px-1">
          Biological Check Breakdown
        </h4>

        <div className="grid grid-cols-1 gap-2.5">
          {checkItems.map(({ key, title, icon: Icon, check }) => {
            const checkStatus = check?.status || 'insufficient_data';
            const checkConfig = STATUS_CONFIGS[checkStatus] || STATUS_CONFIGS.insufficient_data;
            const CheckIcon = checkConfig.icon;

            return (
              <div
                key={key}
                data-testid={`check-${key}`}
                className="p-3.5 rounded-xl bg-white border border-warm-400 shadow-subtle space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-charcoal-500" />
                    <span className="text-xs font-semibold text-charcoal-900">{title}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${checkConfig.badgeClass}`}
                  >
                    <CheckIcon className="w-3 h-3" />
                    {checkConfig.label}
                  </span>
                </div>
                <p className="text-[11px] text-charcoal-700 leading-normal pl-6">
                  {check?.reason || 'No supporting information provided.'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advisory Legal / Forestry Disclaimers */}
      <div className="p-3.5 rounded-xl bg-warm-100 border border-warm-300 text-[11px] text-charcoal-600 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-charcoal-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-charcoal-900">V1 Decision-Support Notice: </span>
          <span>
            Deterministic estimates are generated from external APIs (ISRIC SoilGrids and Open-Meteo). This tool does not substitute for on-site physical soil testing, microclimate assessment, or professional forestry certification.
          </span>
        </div>
      </div>
    </div>
  );
}
