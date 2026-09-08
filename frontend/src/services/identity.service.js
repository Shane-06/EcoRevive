import { apiClient } from '../api/client';

/**
 * Service for Public Tree Identity and QR endpoints (M10/M15).
 */
export const identityService = {
  /**
   * Retrieves privacy-safe public profile of a verified tree by Tree ID or UUID.
   * @param {string} treeId - Authoritative Tree ID (e.g. 'ER-PLT-00001') or UUID
   * @returns {Promise<{ tree: object }>}
   */
  async getPublicProfile(treeId) {
    const response = await apiClient.get(`/public/trees/${encodeURIComponent(treeId)}`);
    return response.data;
  },

  /**
   * Retrieves authoritative QR code data URL and profile link for a verified tree.
   * @param {string} treeId - Authoritative Tree ID
   * @returns {Promise<{ treeId: string, profileUrl: string, qrDataUrl: string }>}
   */
  async getPublicQr(treeId) {
    const response = await apiClient.get(`/public/trees/${encodeURIComponent(treeId)}/qr`);
    return response.data;
  },
};

export default identityService;
