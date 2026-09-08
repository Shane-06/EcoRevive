import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../api/client';
import { mapService } from '../services/map.service';
import { environmentService } from '../services/environment.service';
import { speciesService } from '../services/species.service';
import { suitabilityService } from '../services/suitability.service';

describe('Milestone 14 — Frontend Service Layer Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('mapService', () => {
    it('should query /trees/map with viewport bounding box query parameters', async () => {
      const mockResult = {
        success: true,
        data: {
          trees: [
            { treeId: 'TRE-2026-00001', species: 'Neem', latitude: 30.65, longitude: 76.78, status: 'Verified' },
          ],
          pagination: { total: 1, page: 1, pageSize: 50, totalPages: 1 },
        },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockResult);

      const data = await mapService.getTreesInViewport({
        minLat: 30.60,
        minLng: 76.70,
        maxLat: 30.70,
        maxLng: 76.85,
        page: 1,
        pageSize: 50,
      });

      expect(getSpy).toHaveBeenCalledWith(
        '/trees/map?minLat=30.6&minLng=76.7&maxLat=30.7&maxLng=76.85&page=1&pageSize=50'
      );
      expect(data.trees).toHaveLength(1);
      expect(data.trees[0].species).toBe('Neem');
    });

    it('should query /trees/:treeId/location for a single tree', async () => {
      const mockResult = {
        success: true,
        data: {
          treeId: 'TRE-2026-00001',
          latitude: 30.65,
          longitude: 76.78,
          species: 'Neem',
        },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockResult);

      const data = await mapService.getTreeLocation('TRE-2026-00001');
      expect(getSpy).toHaveBeenCalledWith('/trees/TRE-2026-00001/location');
      expect(data.treeId).toBe('TRE-2026-00001');
    });
  });

  describe('environmentService', () => {
    it('should query /environment with lat and lng coordinates', async () => {
      const mockResult = {
        success: true,
        data: {
          location: { latitude: 30.65, longitude: 76.78 },
          weather: { status: 'available', source: 'Open-Meteo', data: { temperature: 28.5 } },
          soil: { status: 'available', source: 'ISRIC SoilGrids', data: { ph: 7.2 } },
        },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockResult);

      const data = await environmentService.getEnvironment({ lat: 30.65, lng: 76.78 });
      expect(getSpy).toHaveBeenCalledWith('/environment?lat=30.65&lng=76.78');
      expect(data.weather.status).toBe('available');
      expect(data.soil.data.ph).toBe(7.2);
    });
  });

  describe('speciesService', () => {
    it('should query /species to retrieve canonical catalog', async () => {
      const mockResult = {
        success: true,
        data: {
          species: [
            { name: 'Neem', soilType: 'Well-drained loam', minSpacingMeters: 5 },
            { name: 'Peepal', soilType: 'Deep loam', minSpacingMeters: 8 },
          ],
        },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockResult);

      const data = await speciesService.getSpeciesCatalog();
      expect(getSpy).toHaveBeenCalledWith('/species');
      expect(data.species).toHaveLength(2);
    });
  });

  describe('suitabilityService', () => {
    it('should query /suitability with lat, lng, and species parameters', async () => {
      const mockResult = {
        success: true,
        data: {
          species: 'Neem',
          overall: { status: 'suitable', explanation: 'All criteria met.' },
          checks: {
            soil: { status: 'suitable', reason: 'pH 7.0 is optimal' },
            sunlight: { status: 'suitable', reason: 'Open canopy' },
            water: { status: 'suitable', reason: 'Supported humidity' },
            spacing: { status: 'suitable', reason: '5m spacing' },
          },
        },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockResult);

      const data = await suitabilityService.assessSuitability({
        lat: 30.65,
        lng: 76.78,
        species: 'Neem',
      });

      expect(getSpy).toHaveBeenCalledWith('/suitability?lat=30.65&lng=76.78&species=Neem');
      expect(data.overall.status).toBe('suitable');
      expect(data.checks.soil.status).toBe('suitable');
    });
  });
});
