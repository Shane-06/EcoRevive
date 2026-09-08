import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ShieldAlert, Sparkles, Layers, Sun, Droplets, MoveHorizontal, RefreshCw } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';

/**
 * Status style configurations mapping directly to backend SUITABILITY_STATUS.
 */
const STATUS_CONFIGS = {
  suitable: {
    label: 'Suitable',
    bgColor: 'bg-emerald-950/80',
    borderColor: 'border-emerald-500/40',
    textColor: 'text-emerald-400',
    badgeClass: 'bg-emerald-950 border-emerald-500/40 text-emerald-300',
    icon: CheckCircle2,
  },
  moderate: {
    label: 'Moderate',
    bgColor: 'bg-amber-950/80',
    borderColor: 'border-amber-500/40',
    textColor: 'text-amber-400',
    badgeClass: 'bg-amber-950 border-amber-500/40 text-amber-300',
    icon: AlertTriangle,
  },
  unsuitable: {
    label: 'Unsuitable',
    bgColor: 'bg-rose-950/80',
    borderColor: 'border-rose-500/40',
    textColor: 'text-rose-400',
    badgeClass: 'bg-rose-950 border-rose-500/40 text-rose-300',
    icon: XCircle,
  },
  insufficient_data: {
    label: 'Insufficient Data',
    bgColor: 'bg-slate-900/90',
    borderColor: 'border-slate-700/60',
    textColor: 'text-slate-300',
    badgeClass: 'bg-slate-900 border-slate-700 text-slate-300',
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
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center min-h-[300px]">
        <LoadingSpinner size="lg" message="Evaluating deterministic suitability rules..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
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
      <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6 text-emerald-400" />
        </div>
        <h3 className="font-semibold text-slate-200 text-sm">Suitability Ready</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
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
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h2 className="font-bold text-white text-base">Species Suitability Result</h2>
        </div>
        {onAssess && (
          <button
            type="button"
            onClick={onAssess}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Re-evaluate"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Overall Assessment Banner */}
      <div className={`p-5 rounded-2xl ${config.bgColor} border ${config.borderColor} shadow-lg space-y-3`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs text-slate-400">Evaluated Species:</span>
            <h3 className="text-lg font-bold text-white">{species}</h3>
            {location && (
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Location: {location.latitude?.toFixed(4)}°, {location.longitude?.toFixed(4)}°
              </p>
            )}
          </div>
          <div
            data-testid={`overall-status-${statusKey}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${config.badgeClass}`}
          >
            <StatusIcon className="w-4 h-4" />
            <span>{config.label}</span>
          </div>
        </div>

        <div className="text-xs text-slate-200 leading-relaxed border-t border-slate-800/80 pt-2.5">
          {overall?.explanation || 'Evaluation completed based on biological rules.'}
        </div>
      </div>

      {/* Component Checks Breakdown */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
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
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-200">{title}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${checkConfig.badgeClass}`}
                  >
                    <CheckIcon className="w-3 h-3" />
                    {checkConfig.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-normal pl-6">
                  {check?.reason || 'No supporting information provided.'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advisory Legal / Forestry Disclaimers */}
      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-400/80 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-300">V1 Decision-Support Notice: </span>
          <span>
            Deterministic estimates are generated from external APIs (ISRIC SoilGrids and Open-Meteo). This tool does not substitute for on-site physical soil testing, microclimate assessment, or professional forestry certification.
          </span>
        </div>
      </div>
    </div>
  );
}
