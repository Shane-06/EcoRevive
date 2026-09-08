const request = require('supertest');
const app = require('../app');
const environmentService = require('../services/environment.service');
const { closePool } = require('../config/db');
const { SUITABILITY_STATUS, TEXTURE_MAPPINGS } = require('../services/suitability.rules');

describe('Milestone 8 — Deterministic Suitability Engine Integration Tests (GET /api/v1/suitability)', () => {
  afterAll(async () => {
    await closePool();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Canonical baseline mock environment response
  const createMockEnvironment = ({
    soilStatus = 'available',
    weatherStatus = 'available',
    ph = 7.2,
    texture = 'Loam',
    humidity = 60,
    precipitation = 0.0,
    weatherCode = 0,
    condition = 'Clear sky',
  } = {}) => ({
    location: { latitude: 30.65, longitude: 76.78 },
    soil: {
      status: soilStatus,
      source: 'ISRIC SoilGrids',
      verifiedAt: soilStatus === 'available' ? '2026-09-08T00:00:00.000Z' : null,
      data:
        soilStatus === 'available'
          ? {
              ph,
              texture,
              clayPercentage: 20.0,
              sandPercentage: 40.0,
              siltPercentage: 40.0,
              organicCarbon: 15.0,
              organicCarbonUnit: 'g/kg',
            }
          : null,
    },
    weather: {
      status: weatherStatus,
      source: 'Open-Meteo',
      verifiedAt: weatherStatus === 'available' ? '2026-09-08T00:00:00.000Z' : null,
      data:
        weatherStatus === 'available'
          ? {
              temperature: 28.5,
              temperatureUnit: '°C',
              humidity,
              humidityUnit: '%',
              precipitation,
              precipitationUnit: 'mm',
              windSpeed: 10.0,
              windSpeedUnit: 'km/h',
              weatherCode,
              condition,
              forecast: {
                maxTemp: 32.0,
                minTemp: 22.0,
                precipitationSum: precipitation,
              },
            }
          : null,
    },
    terrain: { status: 'unavailable', source: null, verifiedAt: null, data: null },
    land: { status: 'unavailable', source: null, verifiedAt: null, data: null },
    water: { status: 'unavailable', source: null, verifiedAt: null, data: null },
  });

  // =========================================================================
  // 1. Parameter Validation & Error Handling
  // =========================================================================
  describe('1. Parameter Validation & Status Codes', () => {
    it('VAL-01: should reject missing lat with 400 Bad Request', async () => {
      const res = await request(app).get('/api/v1/suitability?lng=76.78&species=Neem');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MISSING_COORDINATES');
    });

    it('VAL-02: should reject missing lng with 400 Bad Request', async () => {
      const res = await request(app).get('/api/v1/suitability?lat=30.65&species=Neem');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MISSING_COORDINATES');
    });

    it('VAL-03: should reject out-of-bounds latitude with 400 Bad Request', async () => {
      const res = await request(app).get('/api/v1/suitability?lat=95.0&lng=76.78&species=Neem');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_COORDINATES');
    });

    it('VAL-04: should reject out-of-bounds longitude with 400 Bad Request', async () => {
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=190.0&species=Neem');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_COORDINATES');
    });

    it('VAL-05: should reject non-numeric coordinates with 400 Bad Request', async () => {
      const res = await request(app).get('/api/v1/suitability?lat=abc&lng=xyz&species=Neem');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_COORDINATES');
    });

    it('VAL-06: should reject missing species parameter with 400 Bad Request', async () => {
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MISSING_SPECIES_PARAMETER');
    });

    it('VAL-07: should reject empty species parameter with 400 Bad Request', async () => {
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=  ');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MISSING_SPECIES_PARAMETER');
    });

    it('VAL-08: should return 404 Not Found for unknown species', async () => {
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=UnknownTreeX');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SPECIES_NOT_FOUND');
    });
  });

  // =========================================================================
  // 2. Case-Insensitive Species Retrieval from Real PostgreSQL
  // =========================================================================
  describe('2. Case-Insensitive Species Lookup', () => {
    it('LOOKUP-01: should match lowercase species name "neem"', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(createMockEnvironment());

      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=neem');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.species).toBe('Neem');
    });

    it('LOOKUP-02: should match uppercase species name "PEEPAL"', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(createMockEnvironment());

      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=PEEPAL');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.species).toBe('Peepal');
    });

    it('LOOKUP-03: should match species name with surrounding whitespace "  Banyan  "', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(createMockEnvironment());

      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=%20%20Banyan%20%20');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.species).toBe('Banyan');
    });
  });

  // =========================================================================
  // 3. Soil pH Boundary Testing
  // =========================================================================
  describe('3. Soil pH Thresholds & Boundaries', () => {
    it('PH-01: pH 7.0 (optimal middle) should evaluate to suitable', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ ph: 7.0, texture: 'Loam' })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.SUITABLE);
    });

    it('PH-02: pH 6.0 (suitable lower boundary) should evaluate to suitable', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ ph: 6.0, texture: 'Loam' })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.SUITABLE);
    });

    it('PH-03: pH 7.8 (suitable upper boundary) should evaluate to suitable', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ ph: 7.8, texture: 'Loam' })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.SUITABLE);
    });

    it('PH-04: pH 5.8 (moderate lower band) should evaluate to moderate', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ ph: 5.8, texture: 'Loam' })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.MODERATE);
    });

    it('PH-05: pH 5.5 (moderate lower boundary) should evaluate to moderate', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ ph: 5.5, texture: 'Loam' })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.MODERATE);
    });

    it('PH-06: pH 8.0 (moderate upper band) should evaluate to moderate', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ ph: 8.0, texture: 'Loam' })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.MODERATE);
    });

    it('PH-07: pH 8.5 (moderate upper boundary) should evaluate to moderate', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ ph: 8.5, texture: 'Loam' })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.MODERATE);
    });

    it('PH-08: pH 5.4 (unsuitable acidic) should evaluate to unsuitable', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ ph: 5.4, texture: 'Loam' })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.UNSUITABLE);
    });

    it('PH-09: pH 8.6 (unsuitable alkaline) should evaluate to unsuitable', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ ph: 8.6, texture: 'Loam' })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.UNSUITABLE);
    });

    it('PH-10: pH 3.5 (extreme acid) and pH 10.0 (extreme alkaline) should evaluate to unsuitable', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 3.5, texture: 'Loam' })
      );
      let res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.UNSUITABLE);

      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 10.0, texture: 'Loam' })
      );
      res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.UNSUITABLE);
    });
  });

  // =========================================================================
  // 4. Species-Specific Soil Texture Mapping Validation (All 8 Rules)
  // =========================================================================
  describe('4. Species-Specific Soil Texture Mappings (All 8 Rules)', () => {
    // 1. Well-drained loam (Neem, Amaltas, Ashoka)
    it('TEXT-01: Rule "Well-drained loam" (Neem) matches texture categories', async () => {
      const mapping = TEXTURE_MAPPINGS['Well-drained loam'];
      expect(mapping.suitable).toEqual(['Loam', 'Sandy loam', 'Silt loam', 'Clay loam', 'Sandy clay loam']);
      expect(mapping.moderate).toEqual(['Loamy sand', 'Silty clay loam', 'Silt']);
      expect(mapping.unsuitable).toEqual(['Sand', 'Clay']);

      // Test suitable texture
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Sandy loam' })
      );
      let res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.SUITABLE);

      // Test moderate texture
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Loamy sand' })
      );
      res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.MODERATE);

      // Test unsuitable texture (Clay)
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Clay' })
      );
      res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.UNSUITABLE);
    });

    // 2. Alluvial / loam (Peepal)
    it('TEXT-02: Rule "Alluvial / loam" (Peepal) matches texture categories', async () => {
      // Suitable: Silt
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Silt' })
      );
      let res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Peepal');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.SUITABLE);

      // Moderate: Clay
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Clay' })
      );
      res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Peepal');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.MODERATE);

      // Unsuitable: Sand
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Sand' })
      );
      res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Peepal');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.UNSUITABLE);
    });

    // 3. Well-drained clay-loam (Banyan)
    it('TEXT-03: Rule "Well-drained clay-loam" (Banyan) matches texture categories', async () => {
      // Suitable: Clay loam
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Clay loam' })
      );
      let res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Banyan');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.SUITABLE);

      // Moderate: Clay
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Clay' })
      );
      res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Banyan');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.MODERATE);

      // Unsuitable: Loamy sand
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Loamy sand' })
      );
      res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Banyan');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.UNSUITABLE);
    });

    // 4. Deep loam (Mango)
    it('TEXT-04: Rule "Deep loam" (Mango) matches texture categories', async () => {
      // Suitable: Silt loam
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Silt loam' })
      );
      let res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Mango');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.SUITABLE);

      // Unsuitable: Clay
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Clay' })
      );
      res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Mango');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.UNSUITABLE);
    });

    // 5. Loam / clay, near water (Jamun)
    it('TEXT-05: Rule "Loam / clay, near water" (Jamun) matches texture categories', async () => {
      // Suitable: Clay
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Clay' })
      );
      let res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Jamun');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.SUITABLE);

      // Unsuitable: Sand
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Sand' })
      );
      res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Jamun');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.UNSUITABLE);
    });

    // 6. Sandy loam / alluvial (Shisham)
    it('TEXT-06: Rule "Sandy loam / alluvial" (Shisham) matches texture categories', async () => {
      // Suitable: Loamy sand
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Loamy sand' })
      );
      let res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Shisham');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.SUITABLE);

      // Unsuitable: Clay
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Clay' })
      );
      res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Shisham');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.UNSUITABLE);
    });

    // 7. Sandy loam (Gulmohar)
    it('TEXT-07: Rule "Sandy loam" (Gulmohar) matches texture categories', async () => {
      // Suitable: Sandy loam
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Sandy loam' })
      );
      let res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Gulmohar');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.SUITABLE);

      // Unsuitable: Silty clay loam
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Silty clay loam' })
      );
      res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Gulmohar');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.UNSUITABLE);
    });

    // 8. Riverbank / alluvial loam (Arjun)
    it('TEXT-08: Rule "Riverbank / alluvial loam" (Arjun) matches texture categories', async () => {
      // Suitable: Clay loam
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Clay loam' })
      );
      let res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Arjun');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.SUITABLE);

      // Unsuitable: Sand
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValueOnce(
        createMockEnvironment({ ph: 7.0, texture: 'Sand' })
      );
      res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Arjun');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.UNSUITABLE);
    });
  });

  // =========================================================================
  // 5. Soil Component Intra-Precedence
  // =========================================================================
  describe('5. Soil Component Intra-Precedence (unsuitable > moderate > suitable)', () => {
    it('SOIL-PREC-01: unsuitable pH + suitable texture => soil status unsuitable', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ ph: 4.5, texture: 'Loam' })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.UNSUITABLE);
    });

    it('SOIL-PREC-02: suitable pH + unsuitable texture => soil status unsuitable', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ ph: 7.2, texture: 'Clay' })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.UNSUITABLE);
    });

    it('SOIL-PREC-03: moderate pH + suitable texture => soil status moderate', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ ph: 5.7, texture: 'Loam' })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.MODERATE);
    });

    it('SOIL-PREC-04: suitable pH + moderate texture => soil status moderate', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ ph: 7.2, texture: 'Loamy sand' })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.MODERATE);
    });

    it('SOIL-PREC-05: moderate pH + moderate texture => soil status moderate', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ ph: 8.0, texture: 'Loamy sand' })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.MODERATE);
    });

    it('SOIL-PREC-06: suitable pH + suitable texture => soil status suitable', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ ph: 7.2, texture: 'Loam' })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.SUITABLE);
    });
  });

  // =========================================================================
  // 6. Sunlight Semantics & Disclaimers
  // =========================================================================
  describe('6. Sunlight Semantics & Open-Meteo Integration', () => {
    it('SUN-01: available Open-Meteo evaluates to suitable with indicative disclaimer', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ weatherCode: 1, condition: 'Mainly clear' })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.sunlight.status).toBe(SUITABILITY_STATUS.SUITABLE);
      expect(res.body.data.checks.sunlight.reason).toContain('Mainly clear');
      expect(res.body.data.checks.sunlight.reason).toContain('Indicative V1 assessment');
      expect(res.body.data.checks.sunlight.reason).toContain('long-term solar irradiance');
    });

    it('SUN-02: unavailable Open-Meteo evaluates to insufficient_data', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ weatherStatus: 'unavailable' })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.sunlight.status).toBe(SUITABILITY_STATUS.INSUFFICIENT_DATA);
      expect(res.body.data.checks.sunlight.reason).toContain('unavailable');
    });
  });

  // =========================================================================
  // 7. Water Need Bands & Disclaimers
  // =========================================================================
  describe('7. Water Need Evaluation Bands', () => {
    it('WATER-01: Low water need (Neem) evaluates to suitable with normal humidity', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ humidity: 45, precipitation: 0 })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.water.status).toBe(SUITABILITY_STATUS.SUITABLE);
      expect(res.body.data.checks.water.reason).toContain('Low water requirement');
    });

    it('WATER-02: Low water need (Neem) evaluates to moderate in hyper-arid conditions (<15%)', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ humidity: 10, precipitation: 0 })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.water.status).toBe(SUITABILITY_STATUS.MODERATE);
    });

    it('WATER-03: Moderate water need (Peepal) evaluates to moderate in dry conditions (<35%)', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ humidity: 25, precipitation: 0 })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Peepal');
      expect(res.body.data.checks.water.status).toBe(SUITABILITY_STATUS.MODERATE);
    });

    it('WATER-04: High water need (Arjun) evaluates to moderate under dry conditions (<50% & no rain)', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ humidity: 40, precipitation: 0 })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Arjun');
      expect(res.body.data.checks.water.status).toBe(SUITABILITY_STATUS.MODERATE);
      expect(res.body.data.checks.water.reason).toContain('supplemental irrigation');
    });

    it('WATER-05: High water need (Arjun) evaluates to suitable with high humidity or rainfall', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({ humidity: 70, precipitation: 5.0 })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Arjun');
      expect(res.body.data.checks.water.status).toBe(SUITABILITY_STATUS.SUITABLE);
    });
  });

  // =========================================================================
  // 8. Spacing Advisory Check
  // =========================================================================
  describe('8. Spacing Advisory Assessment', () => {
    it('SPACING-01: should return suitable advisory check with canonical spacing for Neem (6.00m)', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(createMockEnvironment());
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.spacing.status).toBe(SUITABILITY_STATUS.SUITABLE);
      expect(res.body.data.checks.spacing.reason).toContain('6.00 meters');
      expect(res.body.data.checks.spacing.reason).toContain('Physical spacing must be verified on-site');
    });

    it('SPACING-02: should return suitable advisory check with canonical spacing for Banyan (12.00m)', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(createMockEnvironment());
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Banyan');
      expect(res.body.data.checks.spacing.status).toBe(SUITABILITY_STATUS.SUITABLE);
      expect(res.body.data.checks.spacing.reason).toContain('12.00 meters');
    });
  });

  // =========================================================================
  // 9. Missing Data & Partial Provider Failures
  // =========================================================================
  describe('9. Missing Data & Partial Provider Failures', () => {
    it('PARTIAL-01: SoilGrids available + Open-Meteo unavailable => HTTP 200 with partial results and overall insufficient_data', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({
          soilStatus: 'available',
          weatherStatus: 'unavailable',
          ph: 7.2,
          texture: 'Loam',
        })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.SUITABLE);
      expect(res.body.data.checks.sunlight.status).toBe(SUITABILITY_STATUS.INSUFFICIENT_DATA);
      expect(res.body.data.checks.water.status).toBe(SUITABILITY_STATUS.INSUFFICIENT_DATA);
      expect(res.body.data.checks.spacing.status).toBe(SUITABILITY_STATUS.SUITABLE);
      expect(res.body.data.overall.status).toBe(SUITABILITY_STATUS.INSUFFICIENT_DATA);
    });

    it('PARTIAL-02: SoilGrids unavailable + Open-Meteo available => HTTP 200 with soil insufficient_data and overall insufficient_data', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({
          soilStatus: 'unavailable',
          weatherStatus: 'available',
        })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.INSUFFICIENT_DATA);
      expect(res.body.data.checks.sunlight.status).toBe(SUITABILITY_STATUS.SUITABLE);
      expect(res.body.data.checks.water.status).toBe(SUITABILITY_STATUS.SUITABLE);
      expect(res.body.data.overall.status).toBe(SUITABILITY_STATUS.INSUFFICIENT_DATA);
    });

    it('PARTIAL-03: Both providers unavailable => HTTP 200 with environmental checks insufficient_data', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({
          soilStatus: 'unavailable',
          weatherStatus: 'unavailable',
        })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.INSUFFICIENT_DATA);
      expect(res.body.data.checks.sunlight.status).toBe(SUITABILITY_STATUS.INSUFFICIENT_DATA);
      expect(res.body.data.checks.water.status).toBe(SUITABILITY_STATUS.INSUFFICIENT_DATA);
      expect(res.body.data.overall.status).toBe(SUITABILITY_STATUS.INSUFFICIENT_DATA);
    });
  });

  // =========================================================================
  // 10. Overall Aggregation Precedence (unsuitable > insufficient_data > moderate > suitable)
  // =========================================================================
  describe('10. Overall Aggregation Precedence Cascade', () => {
    it('OVERALL-01: unsuitable check takes precedence over insufficient_data check', async () => {
      // Lethal soil pH (unsuitable) + Weather unavailable (insufficient_data) => overall is UNSUITABLE
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({
          soilStatus: 'available',
          ph: 3.5,
          texture: 'Loam',
          weatherStatus: 'unavailable',
        })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.UNSUITABLE);
      expect(res.body.data.checks.sunlight.status).toBe(SUITABILITY_STATUS.INSUFFICIENT_DATA);
      expect(res.body.data.overall.status).toBe(SUITABILITY_STATUS.UNSUITABLE);
    });

    it('OVERALL-02: insufficient_data takes precedence over moderate check', async () => {
      // Moderate soil pH 8.0 + Weather unavailable (insufficient_data) => overall is INSUFFICIENT_DATA
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({
          soilStatus: 'available',
          ph: 8.0,
          texture: 'Loam',
          weatherStatus: 'unavailable',
        })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.MODERATE);
      expect(res.body.data.checks.sunlight.status).toBe(SUITABILITY_STATUS.INSUFFICIENT_DATA);
      expect(res.body.data.overall.status).toBe(SUITABILITY_STATUS.INSUFFICIENT_DATA);
    });

    it('OVERALL-03: moderate check takes precedence over suitable checks', async () => {
      // Moderate soil + Suitable sunlight + Suitable water => overall is MODERATE
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({
          soilStatus: 'available',
          ph: 5.8,
          texture: 'Loam',
          weatherStatus: 'available',
          humidity: 60,
        })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.MODERATE);
      expect(res.body.data.checks.sunlight.status).toBe(SUITABILITY_STATUS.SUITABLE);
      expect(res.body.data.checks.water.status).toBe(SUITABILITY_STATUS.SUITABLE);
      expect(res.body.data.overall.status).toBe(SUITABILITY_STATUS.MODERATE);
    });

    it('OVERALL-04: all checks suitable => overall is SUITABLE', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(
        createMockEnvironment({
          soilStatus: 'available',
          ph: 7.2,
          texture: 'Loam',
          weatherStatus: 'available',
          humidity: 60,
        })
      );
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(res.body.data.checks.soil.status).toBe(SUITABILITY_STATUS.SUITABLE);
      expect(res.body.data.checks.sunlight.status).toBe(SUITABILITY_STATUS.SUITABLE);
      expect(res.body.data.checks.water.status).toBe(SUITABILITY_STATUS.SUITABLE);
      expect(res.body.data.checks.spacing.status).toBe(SUITABILITY_STATUS.SUITABLE);
      expect(res.body.data.overall.status).toBe(SUITABILITY_STATUS.SUITABLE);
    });
  });

  // =========================================================================
  // 11. Determinism & Integrity Safeguards
  // =========================================================================
  describe('11. Determinism, Scoring Absence & Security', () => {
    it('DET-01: repeated requests produce byte-for-byte identical output', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(createMockEnvironment());

      const res1 = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      const res2 = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      const res3 = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');

      expect(res1.body).toEqual(res2.body);
      expect(res2.body).toEqual(res3.body);
    });

    it('DET-02: response must never contain numeric suitability scores or rankings', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(createMockEnvironment());
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      const jsonStr = JSON.stringify(res.body);

      expect(jsonStr).not.toContain('"score"');
      expect(jsonStr).not.toContain('"suitabilityScore"');
      expect(jsonStr).not.toContain('"points"');
      expect(jsonStr).not.toContain('"rank"');
      expect(jsonStr).not.toContain('"ranking"');
      expect(jsonStr).not.toContain('"percent"');
    });

    it('DET-03: all check statuses must strictly belong to the 4-value vocabulary', async () => {
      jest.spyOn(environmentService, 'getLocationEnvironment').mockResolvedValue(createMockEnvironment());
      const res = await request(app).get('/api/v1/suitability?lat=30.65&lng=76.78&species=Neem');
      const validStatuses = [
        SUITABILITY_STATUS.SUITABLE,
        SUITABILITY_STATUS.MODERATE,
        SUITABILITY_STATUS.UNSUITABLE,
        SUITABILITY_STATUS.INSUFFICIENT_DATA,
      ];

      const checks = res.body.data.checks;
      expect(validStatuses).toContain(checks.soil.status);
      expect(validStatuses).toContain(checks.sunlight.status);
      expect(validStatuses).toContain(checks.water.status);
      expect(validStatuses).toContain(checks.spacing.status);
      expect(validStatuses).toContain(res.body.data.overall.status);
    });
  });
});
