const request = require('supertest');
const app = require('../app');
const openMeteoProvider = require('../integrations/openMeteo.provider');
const soilGridsProvider = require('../integrations/soilGrids.provider');

describe('Milestone 7 — Environmental Information Integration Tests', () => {
  // Sample provider responses for deterministic mocking
  const mockWeatherResponse = {
    current: {
      temperature_2m: 29.4,
      relative_humidity_2m: 62,
      precipitation: 0.0,
      wind_speed_10m: 11.8,
      weather_code: 0,
    },
    daily: {
      temperature_2m_max: [34.5],
      temperature_2m_min: [24.0],
      precipitation_sum: [0.0],
    },
  };

  const mockSoilGridsResponse = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [76.78, 30.65] },
    properties: {
      layers: [
        {
          name: 'phh2o',
          depths: [{ range: { top_depth: 0, bottom_depth: 5 }, values: { mean: 72 } }],
        },
        {
          name: 'clay',
          depths: [{ range: { top_depth: 0, bottom_depth: 5 }, values: { mean: 220 } }],
        },
        {
          name: 'sand',
          depths: [{ range: { top_depth: 0, bottom_depth: 5 }, values: { mean: 450 } }],
        },
        {
          name: 'silt',
          depths: [{ range: { top_depth: 0, bottom_depth: 5 }, values: { mean: 330 } }],
        },
        {
          name: 'soc',
          depths: [{ range: { top_depth: 0, bottom_depth: 5 }, values: { mean: 140 } }],
        },
      ],
    },
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Coordinate Validation (SRS-MAP-03, SRS-ENV-01)', () => {
    it('should reject missing lat parameter with 400 Bad Request', async () => {
      const res = await request(app).get('/api/v1/environment?lng=76.78');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MISSING_COORDINATES');
    });

    it('should reject missing lng parameter with 400 Bad Request', async () => {
      const res = await request(app).get('/api/v1/environment?lat=30.65');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MISSING_COORDINATES');
    });

    it('should reject out-of-range latitude with 400 Bad Request', async () => {
      const res = await request(app).get('/api/v1/environment?lat=95.0&lng=76.78');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_COORDINATES');
    });

    it('should reject out-of-range longitude with 400 Bad Request', async () => {
      const res = await request(app).get('/api/v1/environment?lat=30.65&lng=195.0');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_COORDINATES');
    });

    it('should reject non-numeric coordinates with 400 Bad Request', async () => {
      const res = await request(app).get('/api/v1/environment?lat=invalid-lat&lng=76.78');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_COORDINATES');
    });
  });

  describe('Open-Meteo Provider Adapter (SRS-ENV-01, SRS-ENV-03)', () => {
    it('should normalize successful Open-Meteo forecast data', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse,
      });

      const result = await openMeteoProvider.fetchWeather({ latitude: 30.65, longitude: 76.78 });
      expect(result.status).toBe('available');
      expect(result.source).toBe('Open-Meteo');
      expect(result.verifiedAt).toBeDefined();
      expect(result.data.temperature).toBe(29.4);
      expect(result.data.temperatureUnit).toBe('°C');
      expect(result.data.humidity).toBe(62);
      expect(result.data.humidityUnit).toBe('%');
      expect(result.data.condition).toBe('Clear sky');
      expect(result.data.forecast.maxTemp).toBe(34.5);
      expect(result.data.forecast.minTemp).toBe(24.0);
    });

    it('should handle Open-Meteo HTTP error gracefully without throwing', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await openMeteoProvider.fetchWeather({ latitude: 30.65, longitude: 76.78 });
      expect(result.status).toBe('unavailable');
      expect(result.source).toBe('Open-Meteo');
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should handle Open-Meteo network timeout gracefully', async () => {
      const timeoutError = new Error('The operation was aborted');
      timeoutError.name = 'TimeoutError';
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(timeoutError);

      const result = await openMeteoProvider.fetchWeather({ latitude: 30.65, longitude: 76.78 });
      expect(result.status).toBe('unavailable');
      expect(result.data).toBeNull();
      expect(result.error).toContain('timed out');
    });
  });

  describe('ISRIC SoilGrids Provider Adapter (SRS-ENV-01, SRS-ENV-03)', () => {
    it('should normalize successful SoilGrids properties data', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockSoilGridsResponse,
      });

      const result = await soilGridsProvider.fetchSoil({ latitude: 30.65, longitude: 76.78 });
      expect(result.status).toBe('available');
      expect(result.source).toBe('ISRIC SoilGrids');
      expect(result.verifiedAt).toBeDefined();
      expect(result.data.ph).toBe(7.2); // 72 / 10
      expect(result.data.clayPercentage).toBe(22.0); // 220 / 10
      expect(result.data.sandPercentage).toBe(45.0); // 450 / 10
      expect(result.data.siltPercentage).toBe(33.0); // 330 / 10
      expect(result.data.organicCarbon).toBe(14.0); // 140 / 10
      expect(result.data.texture).toBe('Loam');
    });

    it('should handle SoilGrids HTTP error gracefully without throwing', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 502,
      });

      const result = await soilGridsProvider.fetchSoil({ latitude: 30.65, longitude: 76.78 });
      expect(result.status).toBe('unavailable');
      expect(result.source).toBe('ISRIC SoilGrids');
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should handle SoilGrids network timeout gracefully', async () => {
      const timeoutError = new Error('The operation was aborted');
      timeoutError.name = 'TimeoutError';
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(timeoutError);

      const result = await soilGridsProvider.fetchSoil({ latitude: 30.65, longitude: 76.78 });
      expect(result.status).toBe('unavailable');
      expect(result.data).toBeNull();
      expect(result.error).toContain('timed out');
    });
  });

  describe('GET /api/v1/environment (End-to-End API Integration)', () => {
    it('should return full environmental payload when both providers succeed', async () => {
      jest.spyOn(openMeteoProvider, 'fetchWeather').mockResolvedValueOnce({
        status: 'available',
        source: 'Open-Meteo',
        verifiedAt: '2026-09-07T05:00:00.000Z',
        data: {
          temperature: 30.0,
          temperatureUnit: '°C',
          humidity: 60,
          humidityUnit: '%',
          precipitation: 0.0,
          precipitationUnit: 'mm',
          windSpeed: 10.0,
          windSpeedUnit: 'km/h',
          condition: 'Clear sky',
          forecast: { maxTemp: 35.0, minTemp: 25.0, precipitationSum: 0.0 },
        },
      });

      jest.spyOn(soilGridsProvider, 'fetchSoil').mockResolvedValueOnce({
        status: 'available',
        source: 'ISRIC SoilGrids',
        verifiedAt: '2026-09-07T05:00:00.000Z',
        data: {
          ph: 7.0,
          clayPercentage: 20.0,
          sandPercentage: 50.0,
          siltPercentage: 30.0,
          texture: 'Loam',
          organicCarbon: 15.0,
          organicCarbonUnit: 'g/kg',
        },
      });

      const res = await request(app).get('/api/v1/environment?lat=30.65&lng=76.78');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('location');
      expect(res.body.data.location.latitude).toBe(30.65);
      expect(res.body.data.location.longitude).toBe(76.78);

      expect(res.body.data.weather.status).toBe('available');
      expect(res.body.data.weather.source).toBe('Open-Meteo');

      expect(res.body.data.soil.status).toBe('available');
      expect(res.body.data.soil.source).toBe('ISRIC SoilGrids');

      // Placeholders per spec §9.1
      expect(res.body.data.terrain).toEqual({
        status: 'unavailable',
        source: null,
        verifiedAt: null,
        data: null,
      });
      expect(res.body.data.land).toEqual({
        status: 'unavailable',
        source: null,
        verifiedAt: null,
        data: null,
      });
      expect(res.body.data.water).toEqual({
        status: 'unavailable',
        source: null,
        verifiedAt: null,
        data: null,
      });
    });

    it('Partial Failure: should handle weather available and soil unavailable gracefully (200 OK)', async () => {
      jest.spyOn(openMeteoProvider, 'fetchWeather').mockResolvedValueOnce({
        status: 'available',
        source: 'Open-Meteo',
        verifiedAt: '2026-09-07T05:00:00.000Z',
        data: { temperature: 30.0, humidity: 60 },
      });

      jest.spyOn(soilGridsProvider, 'fetchSoil').mockResolvedValueOnce({
        status: 'unavailable',
        source: 'ISRIC SoilGrids',
        verifiedAt: null,
        data: null,
        error: 'SoilGrids service temporarily unavailable',
      });

      const res = await request(app).get('/api/v1/environment?lat=30.65&lng=76.78');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.weather.status).toBe('available');
      expect(res.body.data.soil.status).toBe('unavailable');
    });

    it('Partial Failure: should handle weather unavailable and soil available gracefully (200 OK)', async () => {
      jest.spyOn(openMeteoProvider, 'fetchWeather').mockResolvedValueOnce({
        status: 'unavailable',
        source: 'Open-Meteo',
        verifiedAt: null,
        data: null,
        error: 'Open-Meteo request timed out',
      });

      jest.spyOn(soilGridsProvider, 'fetchSoil').mockResolvedValueOnce({
        status: 'available',
        source: 'ISRIC SoilGrids',
        verifiedAt: '2026-09-07T05:00:00.000Z',
        data: { ph: 6.8, texture: 'Loam' },
      });

      const res = await request(app).get('/api/v1/environment?lat=30.65&lng=76.78');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.weather.status).toBe('unavailable');
      expect(res.body.data.soil.status).toBe('available');
    });

    it('Complete Outage: should return 200 with both providers unavailable without crashing', async () => {
      jest.spyOn(openMeteoProvider, 'fetchWeather').mockResolvedValueOnce({
        status: 'unavailable',
        source: 'Open-Meteo',
        verifiedAt: null,
        data: null,
        error: 'Open-Meteo down',
      });

      jest.spyOn(soilGridsProvider, 'fetchSoil').mockResolvedValueOnce({
        status: 'unavailable',
        source: 'ISRIC SoilGrids',
        verifiedAt: null,
        data: null,
        error: 'SoilGrids down',
      });

      const res = await request(app).get('/api/v1/environment?lat=30.65&lng=76.78');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.weather.status).toBe('unavailable');
      expect(res.body.data.soil.status).toBe('unavailable');
    });
  });

  describe('Security & M8 Boundary Verification', () => {
    it('Public Access: should allow requests without Authorization header', async () => {
      jest.spyOn(openMeteoProvider, 'fetchWeather').mockResolvedValueOnce({
        status: 'available',
        source: 'Open-Meteo',
        verifiedAt: new Date().toISOString(),
        data: {},
      });
      jest.spyOn(soilGridsProvider, 'fetchSoil').mockResolvedValueOnce({
        status: 'available',
        source: 'ISRIC SoilGrids',
        verifiedAt: new Date().toISOString(),
        data: {},
      });

      const res = await request(app).get('/api/v1/environment?lat=30.65&lng=76.78');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('M8 Boundary Check: should not include suitability recommendations or scoring', async () => {
      jest.spyOn(openMeteoProvider, 'fetchWeather').mockResolvedValueOnce({
        status: 'available',
        source: 'Open-Meteo',
        verifiedAt: new Date().toISOString(),
        data: {},
      });
      jest.spyOn(soilGridsProvider, 'fetchSoil').mockResolvedValueOnce({
        status: 'available',
        source: 'ISRIC SoilGrids',
        verifiedAt: new Date().toISOString(),
        data: {},
      });

      const res = await request(app).get('/api/v1/environment?lat=30.65&lng=76.78');
      const jsonStr = JSON.stringify(res.body);

      expect(jsonStr).not.toContain('suitability');
      expect(jsonStr).not.toContain('recommendedSpecies');
      expect(jsonStr).not.toContain('suitabilityScore');
      expect(jsonStr).not.toContain('suitability_rules');
    });

    it('Privacy Check: should never expose internal stack traces or secrets', async () => {
      const res = await request(app).get('/api/v1/environment?lat=invalid&lng=76.78');
      const jsonStr = JSON.stringify(res.body);

      expect(jsonStr).not.toContain('password');
      expect(jsonStr).not.toContain('stack');
      expect(jsonStr).not.toContain('jwt');
      expect(jsonStr).not.toContain('DATABASE_URL');
    });
  });
});
