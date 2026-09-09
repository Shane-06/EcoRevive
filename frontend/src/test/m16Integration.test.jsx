import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from '../routes/AppRoutes';
import TreeProfileCard from '../components/trees/TreeProfileCard';
import { useAuth } from '../hooks/useAuth';

vi.mock('../hooks/useAuth');
vi.mock('../services/identity.service');
vi.mock('../services/dashboard.service');
vi.mock('../services/health.service');
vi.mock('../services/tree.service');
vi.mock('../services/verification.service');
vi.mock('../services/reward.service');

describe('Milestone 16 — End-to-End Role Protection & Public Profile Health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Public Tree Profile Health Exposure & Privacy', () => {
    it('renders current health and observation list when present', () => {
      const mockTree = {
        treeId: 'ER-PLT-00001',
        species: 'Neem',
        status: 'Verified',
        plantedOn: '2026-08-30',
        latitude: 28.6139,
        longitude: 77.2090,
        contributor: { displayName: 'John Doe' },
        currentHealth: 'Healthy',
        healthHistory: [
          {
            id: 'hl-1',
            healthStatus: 'Healthy',
            recordedAt: '2026-09-09T00:00:00.000Z',
            notes: 'Vigorous leaves and healthy stem',
          },
        ],
      };

      render(<TreeProfileCard tree={mockTree} />);

      expect(screen.getByTestId('public-current-health-healthy')).toBeInTheDocument();
      expect(screen.getAllByText('Healthy')).toHaveLength(2);
      expect(screen.getByText('Vigorous leaves and healthy stem')).toBeInTheDocument();
    });

    it('renders "No health record yet" when currentHealth is null (CRITICAL: NEVER Dead)', () => {
      const mockTree = {
        treeId: 'ER-PLT-00002',
        species: 'Peepal',
        status: 'Verified',
        plantedOn: '2026-08-30',
        latitude: 28.6139,
        longitude: 77.2090,
        contributor: { displayName: 'Jane Doe' },
        currentHealth: null,
        healthHistory: [],
      };

      render(<TreeProfileCard tree={mockTree} />);

      expect(screen.getByTestId('public-current-health-none')).toBeInTheDocument();
      expect(screen.getByText('No health record yet')).toBeInTheDocument();
      expect(screen.getByTestId('public-no-health-history')).toBeInTheDocument();
      expect(screen.queryByText('Dead')).not.toBeInTheDocument();
    });

    it('strictly does not expose caretaker credentials or private IDs', () => {
      const mockTree = {
        treeId: 'ER-PLT-00003',
        species: 'Banyan',
        status: 'Verified',
        plantedOn: '2026-08-30',
        latitude: 28.6139,
        longitude: 77.2090,
        contributor: { displayName: 'Private Contributor' },
        currentHealth: 'Good',
        healthHistory: [
          {
            id: 'hl-3',
            healthStatus: 'Good',
            recordedAt: '2026-09-09T00:00:00.000Z',
            notes: 'Public note without secrets',
          },
        ],
      };

      const { container } = render(<TreeProfileCard tree={mockTree} />);
      const renderedHtml = container.innerHTML;

      expect(renderedHtml).not.toContain('caretaker_id');
      expect(renderedHtml).not.toContain('jwt');
      expect(renderedHtml).not.toContain('password');
      expect(renderedHtml).not.toContain('submitted_by');
    });
  });

  describe('Route-Level Role Boundaries', () => {
    it('redirects unauthenticated users from /monitor to /login', () => {
      useAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        loading: false,
      });

      render(
        <MemoryRouter initialEntries={['/monitor']}>
          <AppRoutes />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
    });

    it('redirects unauthenticated users from /rewards to /login', () => {
      useAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        loading: false,
      });

      render(
        <MemoryRouter initialEntries={['/rewards']}>
          <AppRoutes />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
    });

    it('redirects contributor to /unauthorized when attempting to access /admin/dashboard', () => {
      useAuth.mockReturnValue({
        isAuthenticated: true,
        user: { name: 'Alice', role: 'contributor' },
        loading: false,
      });

      render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <AppRoutes />
        </MemoryRouter>
      );

      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });

    it('redirects contributor to /unauthorized when attempting to access /monitor', () => {
      useAuth.mockReturnValue({
        isAuthenticated: true,
        user: { name: 'Alice', role: 'contributor' },
        loading: false,
      });

      render(
        <MemoryRouter initialEntries={['/monitor']}>
          <AppRoutes />
        </MemoryRouter>
      );

      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });

    it('allows caretaker to access /monitor', async () => {
      useAuth.mockReturnValue({
        isAuthenticated: true,
        user: { name: 'Bob Caretaker', role: 'caretaker' },
        loading: false,
      });

      render(
        <MemoryRouter initialEntries={['/monitor']}>
          <AppRoutes />
        </MemoryRouter>
      );

      expect(await screen.findByText('Tree Health Monitoring Hub')).toBeInTheDocument();
    });

    it('allows admin to access /admin/dashboard', async () => {
      useAuth.mockReturnValue({
        isAuthenticated: true,
        user: { name: 'Super Admin', role: 'admin' },
        loading: false,
      });

      render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <AppRoutes />
        </MemoryRouter>
      );

      expect(await screen.findByText('Platform Analytics & Executive Dashboard')).toBeInTheDocument();
    });
  });
});
