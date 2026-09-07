const config = require('../config');

/**
 * Maps WMO Weather interpretation codes to human-readable descriptions.
 * @param {number} code - WMO weather code
 * @returns {string} Weather description
 */
const getWeatherConditionDescription = (code) => {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 71 && code <= 75) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Variable';
};

class OpenMeteoProvider {
  constructor() {
    this.baseUrl = config.providers.openMeteo.baseUrl;
    this.timeoutMs = config.providers.openMeteo.timeoutMs;
  }

  /**
   * Fetches weather information for given coordinates from Open-Meteo.
   * @param {object} coords
   * @param {number} coords.latitude - Latitude coordinate
   * @param {number} coords.longitude - Longitude coordinate
   * @returns {Promise<object>} Normalized weather section
   */
  async fetchWeather({ latitude, longitude }) {
    try {
      const url = new URL(this.baseUrl);
      url.searchParams.set('latitude', latitude.toString());
      url.searchParams.set('longitude', longitude.toString());
      url.searchParams.set(
        'current',
        'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m'
      );
      url.searchParams.set(
        'daily',
        'temperature_2m_max,temperature_2m_min,precipitation_sum'
      );
      url.searchParams.set('timezone', 'auto');

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        return {
          status: 'unavailable',
          source: 'Open-Meteo',
          verifiedAt: null,
          data: null,
          error: `Provider responded with status ${response.status}`,
        };
      }

      const json = await response.json();
      const current = json.current || {};
      const daily = json.daily || {};

      return {
        status: 'available',
        source: 'Open-Meteo',
        verifiedAt: new Date().toISOString(),
        data: {
          temperature: current.temperature_2m !== undefined ? current.temperature_2m : null,
          temperatureUnit: '°C',
          humidity: current.relative_humidity_2m !== undefined ? current.relative_humidity_2m : null,
          humidityUnit: '%',
          precipitation: current.precipitation !== undefined ? current.precipitation : null,
          precipitationUnit: 'mm',
          windSpeed: current.wind_speed_10m !== undefined ? current.wind_speed_10m : null,
          windSpeedUnit: 'km/h',
          weatherCode: current.weather_code !== undefined ? current.weather_code : null,
          condition:
            current.weather_code !== undefined
              ? getWeatherConditionDescription(current.weather_code)
              : 'Unknown',
          forecast: {
            maxTemp:
              Array.isArray(daily.temperature_2m_max) && daily.temperature_2m_max.length > 0
                ? daily.temperature_2m_max[0]
                : null,
            minTemp:
              Array.isArray(daily.temperature_2m_min) && daily.temperature_2m_min.length > 0
                ? daily.temperature_2m_min[0]
                : null,
            precipitationSum:
              Array.isArray(daily.precipitation_sum) && daily.precipitation_sum.length > 0
                ? daily.precipitation_sum[0]
                : null,
          },
        },
      };
    } catch (err) {
      return {
        status: 'unavailable',
        source: 'Open-Meteo',
        verifiedAt: null,
        data: null,
        error: err.name === 'TimeoutError' ? 'Provider request timed out' : 'Provider connection failed',
      };
    }
  }
}

module.exports = new OpenMeteoProvider();
