const request = require('supertest');
const app = require('../app');
const { closePool } = require('../config/db');

describe('Milestone 8 — Species Catalog Integration Tests (GET /api/v1/species)', () => {
  afterAll(async () => {
    await closePool();
  });

  it('SPEC-01: should retrieve species catalog with HTTP 200 and success: true', async () => {
    const res = await request(app).get('/api/v1/species');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.species)).toBe(true);
  });

  it('SPEC-02: should return all 10 canonical proposal species from PostgreSQL', async () => {
    const res = await request(app).get('/api/v1/species');
    const speciesList = res.body.data.species;
    expect(speciesList.length).toBe(10);

    const names = speciesList.map((s) => s.name);
    const expectedSpecies = [
      'Amaltas',
      'Arjun',
      'Ashoka',
      'Banyan',
      'Gulmohar',
      'Jamun',
      'Mango',
      'Neem',
      'Peepal',
      'Shisham',
    ];

    expect(names.sort()).toEqual(expectedSpecies.sort());
  });

  it('SPEC-03: should conform strictly to the API Specification V1.0 field contract', async () => {
    const res = await request(app).get('/api/v1/species');
    const speciesList = res.body.data.species;

    speciesList.forEach((sp) => {
      expect(typeof sp.name).toBe('string');
      expect(typeof sp.soilType).toBe('string');
      expect(typeof sp.minSpacingMeters).toBe('number');
      expect(sp.minSpacingMeters).toBeGreaterThan(0);
      expect(typeof sp.sunlight).toBe('string');
      expect(typeof sp.waterNeed).toBe('string');
      expect(typeof sp.climateRegion).toBe('string');

      // Ensure no internal database fields leaked
      expect(sp.id).toBeUndefined();
      expect(sp.created_at).toBeUndefined();
      expect(sp.updated_at).toBeUndefined();
      expect(sp.soil_type).toBeUndefined();
      expect(sp.min_spacing_m).toBeUndefined();
      expect(sp.water_need).toBeUndefined();
      expect(sp.climate_region).toBeUndefined();
    });
  });

  it('SPEC-04: should not contain any numeric suitability scores, ranks, or AI metadata', async () => {
    const res = await request(app).get('/api/v1/species');
    const jsonStr = JSON.stringify(res.body);

    expect(jsonStr).not.toContain('score');
    expect(jsonStr).not.toContain('suitabilityScore');
    expect(jsonStr).not.toContain('rank');
    expect(jsonStr).not.toContain('ranking');
    expect(jsonStr).not.toContain('aiModel');
    expect(jsonStr).not.toContain('confidence');
  });

  it('SPEC-05: should verify canonical botanical seed values for Neem and Banyan', async () => {
    const res = await request(app).get('/api/v1/species');
    const speciesList = res.body.data.species;

    const neem = speciesList.find((s) => s.name === 'Neem');
    expect(neem).toBeDefined();
    expect(neem.soilType).toBe('Well-drained loam');
    expect(neem.minSpacingMeters).toBe(6.00);
    expect(neem.sunlight).toBe('Full sun');
    expect(neem.waterNeed).toBe('Low');
    expect(neem.climateRegion).toBe('Tropical / Subtropical');

    const banyan = speciesList.find((s) => s.name === 'Banyan');
    expect(banyan).toBeDefined();
    expect(banyan.soilType).toBe('Well-drained clay-loam');
    expect(banyan.minSpacingMeters).toBe(12.00);
    expect(banyan.sunlight).toBe('Full sun – partial shade');
    expect(banyan.waterNeed).toBe('Moderate');
  });
});
