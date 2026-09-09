import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../api/client';
import { healthService } from '../services/health.service';
import { rewardService } from '../services/reward.service';
import { dashboardService } from '../services/dashboard.service';

describe('Milestone 16 — Services Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('healthService', () => {
    it('should send POST /trees/:treeId/health-logs with JSON payload', async () => {
      const mockResult = {
        success: true,
        data: {
          healthLog: {
            id: 'hl-1',
            treeId: 'ER-PLT-00001',
            healthStatus: 'Healthy',
            notes: 'Strong growth',
            recordedAt: '2026-09-09T03:00:00.000Z',
          },
        },
      };

      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce(mockResult);

      const data = await healthService.createHealthLog('ER-PLT-00001', {
        healthStatus: 'Healthy',
        notes: 'Strong growth',
      });

      expect(postSpy).toHaveBeenCalledWith('/trees/ER-PLT-00001/health-logs', {
        healthStatus: 'Healthy',
        notes: 'Strong growth',
      });
      expect(data.healthLog.healthStatus).toBe('Healthy');
    });

    it('should query GET /trees/:treeId/health-logs with pagination query', async () => {
      const mockResult = {
        success: true,
        data: {
          treeId: 'ER-PLT-00001',
          healthLogs: [
            { id: '1', healthStatus: 'Healthy', recordedAt: '2026-09-09T03:00:00.000Z' },
          ],
          pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
        },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockResult);

      const data = await healthService.getHealthHistory('ER-PLT-00001', { page: 1, pageSize: 20 });
      expect(getSpy).toHaveBeenCalledWith('/trees/ER-PLT-00001/health-logs?page=1&pageSize=20');
      expect(data.healthLogs).toHaveLength(1);
    });

    it('should throw error when tree ID is missing in healthService calls', async () => {
      await expect(healthService.createHealthLog('', { healthStatus: 'Healthy' })).rejects.toThrow(
        'Tree ID is required'
      );
      await expect(healthService.getHealthHistory('')).rejects.toThrow(
        'Tree ID is required'
      );
    });
  });

  describe('rewardService', () => {
    it('should query GET /rewards/me with default and custom pagination', async () => {
      const mockResult = {
        success: true,
        data: {
          totalPoints: 100,
          activities: [
            { id: '1', activity: 'Verified plantation', points: 50, createdAt: '2026-09-01T00:00:00.000Z' },
            { id: '2', activity: 'Verified plantation', points: 50, createdAt: '2026-09-02T00:00:00.000Z' },
          ],
          pagination: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
        },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockResult);

      const data = await rewardService.getMyRewards({ page: 1, pageSize: 20 });
      expect(getSpy).toHaveBeenCalledWith('/rewards/me?page=1&pageSize=20');
      expect(data.totalPoints).toBe(100);
      expect(data.activities).toHaveLength(2);
    });
  });

  describe('dashboardService', () => {
    it('should query GET /dashboard/me for contributor metrics', async () => {
      const mockResult = {
        success: true,
        data: {
          plantations: { total: 2, verified: 1, pending: 1, underReview: 0, rejected: 0 },
          health: { monitoredTrees: 1 },
          rewards: { totalPoints: 50, recentActivities: [] },
        },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockResult);

      const data = await dashboardService.getMyDashboard();
      expect(getSpy).toHaveBeenCalledWith('/dashboard/me');
      expect(data.plantations.total).toBe(2);
      expect(data.rewards.totalPoints).toBe(50);
    });

    it('should query GET /admin/dashboard for platform-wide metrics', async () => {
      const mockResult = {
        success: true,
        data: {
          plantations: { total: 25, verified: 15, pending: 5, underReview: 3, rejected: 2 },
          health: { treesWithHealthLogs: 12 },
          rewards: { totalPointsIssued: 750 },
        },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockResult);

      const data = await dashboardService.getAdminDashboard();
      expect(getSpy).toHaveBeenCalledWith('/admin/dashboard');
      expect(data.plantations.verified).toBe(15);
      expect(data.rewards.totalPointsIssued).toBe(750);
    });
  });
});
