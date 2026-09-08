import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../api/client';
import { treeService } from '../services/tree.service';
import { verificationService } from '../services/verification.service';
import { identityService } from '../services/identity.service';

describe('Milestone 15 — Service Layer Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('treeService', () => {
    it('should send POST /trees with plantation payload', async () => {
      const mockResult = {
        success: true,
        data: {
          tree: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            species: 'Neem',
            latitude: 30.6543,
            longitude: 76.7821,
            plantedOn: '2026-08-31',
            status: 'Pending',
          },
        },
      };

      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce(mockResult);

      const data = await treeService.registerPlantation({
        species: 'Neem',
        latitude: 30.6543,
        longitude: 76.7821,
        plantedOn: '2026-08-31',
      });

      expect(postSpy).toHaveBeenCalledWith('/trees', {
        species: 'Neem',
        latitude: 30.6543,
        longitude: 76.7821,
        plantedOn: '2026-08-31',
      });
      expect(data.tree.status).toBe('Pending');
    });

    it('should query GET /trees/mine with pagination query params', async () => {
      const mockResult = {
        success: true,
        data: {
          trees: [
            { id: '1', species: 'Neem', status: 'Pending' },
            { id: '2', species: 'Peepal', status: 'Verified', treeId: 'ER-PLT-00001' },
          ],
          pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
        },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockResult);

      const data = await treeService.getMyPlantations({ page: 1, pageSize: 20 });
      expect(getSpy).toHaveBeenCalledWith('/trees/mine?page=1&pageSize=20');
      expect(data.trees).toHaveLength(2);
      expect(data.trees[1].treeId).toBe('ER-PLT-00001');
    });
  });

  describe('verificationService', () => {
    it('should query GET /admin/verifications with optional status and pagination', async () => {
      const mockResult = {
        success: true,
        data: {
          trees: [{ id: '1', species: 'Neem', status: 'Pending' }],
          pagination: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
        },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockResult);

      const data = await verificationService.getReviewQueue({ status: 'Pending', page: 1, pageSize: 10 });
      expect(getSpy).toHaveBeenCalledWith('/admin/verifications?page=1&pageSize=10&status=Pending');
      expect(data.trees).toHaveLength(1);
    });

    it('should send PATCH /admin/verifications/:id/start to transition to Under Review', async () => {
      const mockResult = {
        success: true,
        data: {
          tree: { id: 't1', status: 'Under Review' },
        },
      };

      const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce(mockResult);

      const data = await verificationService.startReview('t1');
      expect(patchSpy).toHaveBeenCalledWith('/admin/verifications/t1/start');
      expect(data.tree.status).toBe('Under Review');
    });

    it('should send PATCH /admin/verifications/:id/approve and receive authoritative Tree ID', async () => {
      const mockResult = {
        success: true,
        data: {
          tree: { id: 't1', status: 'Verified', treeId: 'ER-PLT-00005' },
          identity: { treeId: 'ER-PLT-00005' },
        },
      };

      const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce(mockResult);

      const data = await verificationService.approveVerification('t1');
      expect(patchSpy).toHaveBeenCalledWith('/admin/verifications/t1/approve');
      expect(data.identity.treeId).toBe('ER-PLT-00005');
    });

    it('should send PATCH /admin/verifications/:id/reject with mandatory reason payload', async () => {
      const mockResult = {
        success: true,
        data: {
          tree: { id: 't1', status: 'Rejected', reason: 'Blurry photo' },
        },
      };

      const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce(mockResult);

      const data = await verificationService.rejectVerification('t1', { reason: 'Blurry photo' });
      expect(patchSpy).toHaveBeenCalledWith('/admin/verifications/t1/reject', { reason: 'Blurry photo' });
      expect(data.tree.status).toBe('Rejected');
    });
  });

  describe('identityService', () => {
    it('should query GET /public/trees/:treeId for public verified tree profile', async () => {
      const mockResult = {
        success: true,
        data: {
          tree: {
            treeId: 'ER-PLT-00001',
            species: 'Neem',
            status: 'Verified',
            contributor: { displayName: 'John Doe' },
          },
        },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockResult);

      const data = await identityService.getPublicProfile('ER-PLT-00001');
      expect(getSpy).toHaveBeenCalledWith('/public/trees/ER-PLT-00001');
      expect(data.tree.species).toBe('Neem');
    });

    it('should query GET /public/trees/:treeId/qr for QR payload', async () => {
      const mockResult = {
        success: true,
        data: {
          treeId: 'ER-PLT-00001',
          profileUrl: 'http://localhost:5173/tree/ER-PLT-00001',
          qrDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        },
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockResult);

      const data = await identityService.getPublicQr('ER-PLT-00001');
      expect(getSpy).toHaveBeenCalledWith('/public/trees/ER-PLT-00001/qr');
      expect(data.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });
});
