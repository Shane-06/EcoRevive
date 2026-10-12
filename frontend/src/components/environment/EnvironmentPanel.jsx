import { Cloud, Droplets, Wind, Thermometer, Layers, AlertCircle, CheckCircle2, Info, RefreshCw } from 'lucide-react';
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
      <div className="p-8 rounded-2xl bg-white border border-warm-400 flex flex-col items-center justify-center min-h-[300px] shadow-card">
        <LoadingSpinner size="lg" message="Fetching normalized environmental metrics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-white border border-warm-400 p-6 shadow-card">
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
      <div className="p-8 rounded-2xl bg-white border border-warm-400 text-center space-y-3 shadow-card">
        <div className="w-12 h-12 rounded-xl bg-warm-200 text-forest-800 flex items-center justify-center mx-auto">
          <Info className="w-6 h-6" />
        </div>
        <h3 className="font-serif font-bold text-charcoal-900 text-base">No Location Selected</h3>
        <p className="text-xs text-charcoal-600 max-w-xs mx-auto leading-relaxed">
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
          <div className="w-2.5 h-2.5 rounded-full bg-forest-600" />
          <h2 className="font-serif font-bold text-charcoal-900 text-base">Environmental Assessment</h2>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 rounded-lg text-charcoal-500 hover:text-charcoal-900 hover:bg-warm-200 transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {location && (
        <div className="px-3.5 py-1.5 rounded-xl bg-warm-100 border border-warm-300 text-[11px] font-mono text-charcoal-600 flex items-center justify-between">
          <span className="text-charcoal-500 font-sans">Coordinates:</span>
          <span className="font-semibold text-charcoal-900">
            {location.latitude?.toFixed(4)}° N, {location.longitude?.toFixed(4)}° E
          </span>
        </div>
      )}

      {/* Atmospheric Weather Section */}
      <div className="p-5 rounded-2xl bg-white border border-warm-400 space-y-3.5 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-forest-700" />
            <h3 className="font-semibold text-charcoal-900 text-sm">Atmospheric Weather</h3>
          </div>
          {weather?.status === 'available' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-forest-50 border border-forest-200 text-forest-800 text-[10px] font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3 text-forest-600" />
              Available ({weather.source || 'Open-Meteo'})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-warm-200 border border-warm-400 text-charcoal-700 text-[10px] font-semibold uppercase tracking-wider">
              <AlertCircle className="w-3 h-3 text-charcoal-500" />
              Unavailable
            </span>
          )}
        </div>

        {weather?.status === 'available' && weather.data ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-warm-50 border border-warm-300 space-y-1">
                <div className="flex items-center gap-1 text-[11px] text-charcoal-500">
                  <Thermometer className="w-3.5 h-3.5 text-forest-700" />
                  <span>Temperature</span>
                </div>
                <div className="text-sm font-bold font-mono text-charcoal-900">
                  {weather.data.temperature !== null ? `${weather.data.temperature} ${weather.data.temperatureUnit || '°C'}` : 'N/A'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-warm-50 border border-warm-300 space-y-1">
                <div className="flex items-center gap-1 text-[11px] text-charcoal-500">
                  <Droplets className="w-3.5 h-3.5 text-forest-700" />
                  <span>Humidity</span>
                </div>
                <div className="text-sm font-bold font-mono text-charcoal-900">
                  {weather.data.humidity !== null ? `${weather.data.humidity} ${weather.data.humidityUnit || '%'}` : 'N/A'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-warm-50 border border-warm-300 space-y-1">
                <div className="flex items-center gap-1 text-[11px] text-charcoal-500">
                  <Wind className="w-3.5 h-3.5 text-forest-700" />
                  <span>Wind Speed</span>
                </div>
                <div className="text-sm font-bold font-mono text-charcoal-900">
                  {weather.data.windSpeed !== null ? `${weather.data.windSpeed} ${weather.data.windSpeedUnit || 'km/h'}` : 'N/A'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-warm-50 border border-warm-300 space-y-1">
                <div className="flex items-center gap-1 text-[11px] text-charcoal-500">
                  <Cloud className="w-3.5 h-3.5 text-forest-700" />
                  <span>Condition</span>
                </div>
                <div className="text-xs font-semibold text-charcoal-800 truncate" title={weather.data.condition || 'Clear'}>
                  {weather.data.condition || 'Clear'}
                </div>
              </div>
            </div>

            {weather.data.forecast && (
              <div className="px-3.5 py-2 rounded-xl bg-warm-50 border border-warm-300 text-xs text-charcoal-600 flex items-center justify-between">
                <span>Daily Forecast Range:</span>
                <span className="font-semibold text-charcoal-900 font-mono">
                  Min: {weather.data.forecast.minTemp ?? '--'}°C / Max: {weather.data.forecast.maxTemp ?? '--'}°C
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-warm-100 border border-warm-300 text-xs text-charcoal-700 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-charcoal-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-charcoal-900">Weather Provider Unavailable</div>
              <div className="text-charcoal-600 text-[11px] mt-0.5 leading-normal">
                {weather?.error || 'Atmospheric metrics temporarily unavailable from Open-Meteo.'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Soil Properties Section */}
      <div className="p-5 rounded-2xl bg-white border border-warm-400 space-y-3.5 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-forest-700" />
            <h3 className="font-semibold text-charcoal-900 text-sm">Soil Properties (0–5cm)</h3>
          </div>
          {soil?.status === 'available' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-forest-50 border border-forest-200 text-forest-800 text-[10px] font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3 text-forest-600" />
              Available ({soil.source || 'ISRIC SoilGrids'})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-warm-200 border border-warm-400 text-charcoal-700 text-[10px] font-semibold uppercase tracking-wider">
              <AlertCircle className="w-3 h-3 text-charcoal-500" />
              Unavailable
            </span>
          )}
        </div>

        {soil?.status === 'available' && soil.data ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-warm-50 border border-warm-300 space-y-1">
                <div className="text-[11px] text-charcoal-500">Topsoil pH</div>
                <div className="text-sm font-bold font-mono text-forest-800">{soil.data.ph?.toFixed(1) ?? 'N/A'}</div>
              </div>

              <div className="p-3 rounded-xl bg-warm-50 border border-warm-300 space-y-1">
                <div className="text-[11px] text-charcoal-500">Texture Class</div>
                <div className="text-sm font-bold text-charcoal-900 truncate" title={soil.data.texture}>
                  {soil.data.texture || 'N/A'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-warm-50 border border-warm-300 space-y-1">
                <div className="text-[11px] text-charcoal-500">Organic Carbon</div>
                <div className="text-sm font-bold font-mono text-charcoal-900">
                  {soil.data.organicCarbon !== null && soil.data.organicCarbon !== undefined
                    ? `${soil.data.organicCarbon} ${soil.data.organicCarbonUnit || 'g/kg'}`
                    : 'N/A'}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-warm-50 border border-warm-300 text-xs text-charcoal-600 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span>Texture Composition:</span>
                <span className="text-charcoal-800 font-mono">
                  Clay: {soil.data.clayPercentage ?? '--'}% | Sand: {soil.data.sandPercentage ?? '--'}% | Silt: {soil.data.siltPercentage ?? '--'}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-warm-100 border border-warm-300 text-xs text-charcoal-700 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-charcoal-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-charcoal-900">Soil Provider Unavailable</div>
              <div className="text-charcoal-600 text-[11px] mt-0.5 leading-normal">
                {soil?.error || 'Soil properties temporarily unavailable from ISRIC SoilGrids.'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Providers Scope Footnote */}
      <div className="p-3 rounded-xl bg-warm-100 border border-warm-300 text-[11px] text-charcoal-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-charcoal-400" />
          Terrain, Land Cover & Hydrology
        </span>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-warm-200 border border-warm-300 text-charcoal-600">
          V1 External Placeholders
        </span>
      </div>
    </div>
  );
}
