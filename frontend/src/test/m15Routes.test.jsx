import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AppRoutes from '../routes/AppRoutes';
import { AuthProvider } from '../context/AuthContext';
import { storage } from '../utils/storage';
import { STORAGE_KEYS, ROLES } from '../utils/constants';
import treeService from '../services/tree.service';
import verificationService from '../services/verification.service';
import identityService from '../services/identity.service';

describe('Milestone 15 — Route Guards & Access Control Tests', () => {
  beforeEach(() => {
    storage.clear();
    vi.restoreAllMocks();
  });

  const renderWithRouter = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('Public Route: should allow unauthenticated access to /tree/:treeId', async () => {
    vi.spyOn(identityService, 'getPublicProfile').mockResolvedValueOnce({
      tree: {
        treeId: 'ER-PLT-00001',
        species: 'Neem',
        status: 'Verified',
        plantedOn: '2026-08-30',
        latitude: 30.65,
        longitude: 76.78,
      },
    });
    vi.spyOn(identityService, 'getPublicQr').mockResolvedValueOnce({
      treeId: 'ER-PLT-00001',
      profileUrl: 'http://localhost:5173/tree/ER-PLT-00001',
      qrDataUrl: 'data:image/png;base64,sample',
    });

    renderWithRouter('/tree/ER-PLT-00001');

    expect(await screen.findByText('Public Registry View')).toBeInTheDocument();
  });

  it('Protected Contributor Route: should block unauthenticated access to /trees and redirect to /login', () => {
    renderWithRouter('/trees');
    expect(screen.getByText(/Sign In to EcoRevive/i)).toBeInTheDocument();
  });

  it('Protected Contributor Route: should allow authenticated contributor to access /trees', async () => {
    storage.setItem(STORAGE_KEYS.TOKEN, 'mock-contributor-jwt');
    storage.setItem(STORAGE_KEYS.USER, {
      id: 'c1',
      name: 'Contributor Joe',
      email: 'c1@ecorevive.test',
      role: ROLES.CONTRIBUTOR,
    });

    vi.spyOn(treeService, 'getMyPlantations').mockResolvedValueOnce({
      trees: [],
      pagination: { total: 0, page: 1, pageSize: 10, totalPages: 1 },
    });

    renderWithRouter('/trees');

    expect(await screen.findByText('Contributor Plantation Hub')).toBeInTheDocument();
  });

  it('Protected Admin Route: should block unauthenticated access to /admin and redirect to /login', () => {
    renderWithRouter('/admin');
    expect(screen.getByText(/Sign In to EcoRevive/i)).toBeInTheDocument();
  });

  it('Protected Admin Route: should block contributor from accessing /admin/verifications (403)', () => {
    storage.setItem(STORAGE_KEYS.TOKEN, 'mock-contributor-jwt');
    storage.setItem(STORAGE_KEYS.USER, {
      id: 'c1',
      name: 'Contributor Joe',
      email: 'c1@ecorevive.test',
      role: ROLES.CONTRIBUTOR,
    });

    renderWithRouter('/admin/verifications');

    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(screen.getByText(/You do not have the required role permissions to view this resource/i)).toBeInTheDocument();
  });

  it('Protected Admin Route: should allow authenticated admin to access /admin/verifications', async () => {
    storage.setItem(STORAGE_KEYS.TOKEN, 'mock-admin-jwt');
    storage.setItem(STORAGE_KEYS.USER, {
      id: 'a1',
      name: 'Admin Sarah',
      email: 'admin@ecorevive.test',
      role: ROLES.ADMIN,
    });

    vi.spyOn(verificationService, 'getReviewQueue').mockResolvedValueOnce({
      trees: [],
      pagination: { total: 0, page: 1, pageSize: 10, totalPages: 1 },
    });

    renderWithRouter('/admin/verifications');

    expect(await screen.findByText('Coordinator Verification Hub')).toBeInTheDocument();
  });
});
