import { Cloud, Droplets, Wind, Thermometer, Layers, AlertTriangle, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';

/**
 * Environmental Information Panel with Partial Failure Support.
 */
export default function EnvironmentPanel({
  environment,
  loading = false,
  error = null,
  onRefresh,
}) {
  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center min-h-[300px]">
        <LoadingSpinner size="lg" message="Fetching normalized environmental metrics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
        <ErrorAlert
          title="Environmental Service Error"
          message={error.message || 'Unable to retrieve environmental data for this location.'}
          onRetry={onRefresh}
        />
      </div>
    );
  }

  if (!environment) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
          <Info className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-slate-200 text-sm">No Location Selected</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Click anywhere on the map or choose a verified tree marker to inspect real-time weather and soil metrics.
        </p>
      </div>
    );
  }

  const { weather, soil, location } = environment;

  return (
    <div data-testid="environment-panel" className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <h2 className="font-bold text-white text-base">Environmental Assessment</h2>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {location && (
        <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span>Coordinates:</span>
          <span className="text-slate-200">
            {location.latitude?.toFixed(4)}° N, {location.longitude?.toFixed(4)}° E
          </span>
        </div>
      )}

      {/* Weather Section */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-sky-400" />
            <h3 className="font-semibold text-slate-200 text-sm">Atmospheric Weather</h3>
          </div>
          {weather?.status === 'available' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              Available ({weather.source || 'Open-Meteo'})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/30 text-amber-400 text-[10px] font-semibold">
              <AlertTriangle className="w-3 h-3" />
              Unavailable
            </span>
          )}
        </div>

        {weather?.status === 'available' && weather.data ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                  <span>Temperature</span>
                </div>
                <div className="text-sm font-bold text-white">
                  {weather.data.temperature !== null ? `${weather.data.temperature} ${weather.data.temperatureUnit || '°C'}` : 'N/A'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Droplets className="w-3.5 h-3.5 text-sky-400" />
                  <span>Humidity</span>
                </div>
                <div className="text-sm font-bold text-white">
                  {weather.data.humidity !== null ? `${weather.data.humidity} ${weather.data.humidityUnit || '%'}` : 'N/A'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Wind className="w-3.5 h-3.5 text-teal-400" />
                  <span>Wind Speed</span>
                </div>
                <div className="text-sm font-bold text-white">
                  {weather.data.windSpeed !== null ? `${weather.data.windSpeed} ${weather.data.windSpeedUnit || 'km/h'}` : 'N/A'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Cloud className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Condition</span>
                </div>
                <div className="text-xs font-semibold text-slate-200 truncate" title={weather.data.condition || 'Clear'}>
                  {weather.data.condition || 'Clear'}
                </div>
              </div>
            </div>

            {weather.data.forecast && (
              <div className="px-3 py-2 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
                <span>Daily Forecast Range:</span>
                <span className="font-semibold text-slate-300">
                  Min: {weather.data.forecast.minTemp ?? '--'}°C / Max: {weather.data.forecast.maxTemp ?? '--'}°C
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Weather Provider Unavailable</div>
              <div className="text-amber-300/80 text-[11px]">
                {weather?.error || 'Atmospheric metrics temporarily unavailable from Open-Meteo.'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Soil Section */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-slate-200 text-sm">Soil Properties (0–5cm)</h3>
          </div>
          {soil?.status === 'available' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              Available ({soil.source || 'ISRIC SoilGrids'})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/30 text-amber-400 text-[10px] font-semibold">
              <AlertTriangle className="w-3 h-3" />
              Unavailable
            </span>
          )}
        </div>

        {soil?.status === 'available' && soil.data ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="text-[11px] text-slate-400">Topsoil pH</div>
                <div className="text-sm font-bold text-emerald-400">{soil.data.ph?.toFixed(1) ?? 'N/A'}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="text-[11px] text-slate-400">Texture Class</div>
                <div className="text-sm font-bold text-white truncate" title={soil.data.texture}>
                  {soil.data.texture || 'N/A'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="text-[11px] text-slate-400">Organic Carbon</div>
                <div className="text-sm font-bold text-white">
                  {soil.data.organicCarbon !== null && soil.data.organicCarbon !== undefined
                    ? `${soil.data.organicCarbon} ${soil.data.organicCarbonUnit || 'g/kg'}`
                    : 'N/A'}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-400 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span>Texture Composition:</span>
                <span className="text-slate-300">
                  Clay: {soil.data.clayPercentage ?? '--'}% | Sand: {soil.data.sandPercentage ?? '--'}% | Silt: {soil.data.siltPercentage ?? '--'}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Soil Provider Unavailable</div>
              <div className="text-amber-300/80 text-[11px]">
                {soil?.error || 'Soil properties temporarily unavailable from ISRIC SoilGrids.'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Providers Scope Footnote */}
      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          Terrain, Land Cover & Hydrology
        </span>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
          V1 External Placeholders
        </span>
      </div>
    </div>
  );
}
