import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TreeProfileCard from '../components/trees/TreeProfileCard';
import QrCodeCard from '../components/trees/QrCodeCard';
import PublicTreeProfilePage from '../pages/PublicTreeProfilePage';
import identityService from '../services/identity.service';

describe('Milestone 15 — Public Tree Profile & QR Code Tests', () => {
  const mockTreeProfile = {
    treeId: 'ER-PLT-00042',
    species: 'Banyan',
    plantedOn: '2026-08-30',
    status: 'Verified',
    latitude: 28.6139,
    longitude: 77.2090,
    contributor: {
      displayName: 'Jane Planter',
    },
  };

  const mockQrData = {
    treeId: 'ER-PLT-00042',
    profileUrl: 'http://localhost:5173/tree/ER-PLT-00042',
    qrDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('TreeProfileCard', () => {
    it('should render privacy-safe public verified tree profile', () => {
      render(<TreeProfileCard tree={mockTreeProfile} />);

      expect(screen.getByText('Banyan')).toBeInTheDocument();
      expect(screen.getByText('ER-PLT-00042')).toBeInTheDocument();
      expect(screen.getByText('Jane Planter')).toBeInTheDocument();
      expect(screen.getByText('2026-08-30')).toBeInTheDocument();
      expect(screen.getByText(/28.613900° N/i)).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();

      // Ensure no private auth fields are shown
      expect(screen.queryByText(/password/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/email/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/token/i)).not.toBeInTheDocument();
    });
  });

  describe('QrCodeCard', () => {
    it('should render QR code image, profile link, and copy button', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });

      render(<QrCodeCard qrData={mockQrData} />);

      expect(screen.getByTestId('qr-code-image')).toBeInTheDocument();
      expect(screen.getByText('http://localhost:5173/tree/ER-PLT-00042')).toBeInTheDocument();
      expect(screen.getByTestId('download-qr-link')).toBeInTheDocument();

      const copyBtn = screen.getByTestId('copy-link-button');
      fireEvent.click(copyBtn);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost:5173/tree/ER-PLT-00042');
    });
  });

  describe('PublicTreeProfilePage', () => {
    it('should load and render public tree profile and QR code simultaneously', async () => {
      vi.spyOn(identityService, 'getPublicProfile').mockResolvedValueOnce({ tree: mockTreeProfile });
      vi.spyOn(identityService, 'getPublicQr').mockResolvedValueOnce(mockQrData);

      render(
        <MemoryRouter initialEntries={['/tree/ER-PLT-00042']}>
          <Routes>
            <Route path="/tree/:treeId" element={<PublicTreeProfilePage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(identityService.getPublicProfile).toHaveBeenCalledWith('ER-PLT-00042');
        expect(identityService.getPublicQr).toHaveBeenCalledWith('ER-PLT-00042');
        expect(screen.getByTestId('public-tree-profile-card')).toBeInTheDocument();
        expect(screen.getByTestId('qr-code-card')).toBeInTheDocument();
      });
    });

    it('should handle 404 error when tree is not found or not verified', async () => {
      vi.spyOn(identityService, 'getPublicProfile').mockRejectedValueOnce({
        statusCode: 404,
        message: 'Tree not found',
      });
      vi.spyOn(identityService, 'getPublicQr').mockRejectedValueOnce({
        statusCode: 404,
        message: 'Tree not found',
      });

      render(
        <MemoryRouter initialEntries={['/tree/ER-PLT-99999']}>
          <Routes>
            <Route path="/tree/:treeId" element={<PublicTreeProfilePage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Tree Identity Not Available')).toBeInTheDocument();
        expect(screen.getByText(/Tree record 'ER-PLT-99999' was not found or has not been verified yet/i)).toBeInTheDocument();
      });
    });
  });
});
