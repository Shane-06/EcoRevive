import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from '../context/AuthContext';
import AppRoutes from '../routes/AppRoutes';
import LoginPage from '../pages/LoginPage';
import { storage } from '../utils/storage';
import { STORAGE_KEYS, ROLES } from '../utils/constants';
import {
  getRoleLandingRoute,
  isRouteAllowedForRole,
  resolvePostLoginRedirect,
} from '../utils/navigation';
import { apiClient } from '../api/client';
import dashboardService from '../services/dashboard.service';
import healthService from '../services/health.service';
import verificationService from '../services/verification.service';

vi.mock('../services/dashboard.service');
vi.mock('../services/health.service');
vi.mock('../services/verification.service');

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="current-location">{location.pathname}</div>;
}

function renderWithAppRoutes(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <LocationDisplay />
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Role-Based Default Landing Page & Navigation Suite', () => {
  beforeEach(() => {
    storage.clear();
    vi.restoreAllMocks();

    dashboardService.getMyDashboard.mockResolvedValue({
      plantations: { total: 0, verified: 0, pending: 0, underReview: 0, rejected: 0 },
      health: { monitoredTrees: 0 },
      rewards: { totalPoints: 0, recentActivities: [] },
    });

    dashboardService.getAdminDashboard.mockResolvedValue({
      plantations: { total: 0, verified: 0, pending: 0, underReview: 0, rejected: 0 },
      health: { treesWithHealthLogs: 0 },
      rewards: { totalPointsIssued: 0 },
    });

    healthService.getHealthHistory.mockResolvedValue({ healthLogs: [] });
    verificationService.getReviewQueue.mockResolvedValue({ trees: [], pagination: {} });
  });

  // =========================================================================
  // 1. Navigation Utilities Unit Tests
  // =========================================================================
  describe('1. Centralized Navigation Utilities (navigation.js)', () => {
    it('getRoleLandingRoute returns correct workspace for all roles', () => {
      expect(getRoleLandingRoute(ROLES.CONTRIBUTOR)).toBe('/dashboard');
      expect(getRoleLandingRoute(ROLES.CARETAKER)).toBe('/monitor');
      expect(getRoleLandingRoute(ROLES.ADMIN)).toBe('/admin/dashboard');
      expect(getRoleLandingRoute(null)).toBe('/dashboard');
      expect(getRoleLandingRoute(undefined)).toBe('/dashboard');
      expect(getRoleLandingRoute('unknown_role')).toBe('/dashboard');
    });

    it('isRouteAllowedForRole strictly validates role route permissions', () => {
      // Disallowed system routes
      expect(isRouteAllowedForRole('/', ROLES.CONTRIBUTOR)).toBe(false);
      expect(isRouteAllowedForRole('/login', ROLES.ADMIN)).toBe(false);
      expect(isRouteAllowedForRole('/unauthorized', ROLES.CARETAKER)).toBe(false);

      // Admin routes
      expect(isRouteAllowedForRole('/admin', ROLES.ADMIN)).toBe(true);
      expect(isRouteAllowedForRole('/admin/dashboard', ROLES.ADMIN)).toBe(true);
      expect(isRouteAllowedForRole('/admin/verifications', ROLES.ADMIN)).toBe(true);
      expect(isRouteAllowedForRole('/admin/dashboard', ROLES.CONTRIBUTOR)).toBe(false);
      expect(isRouteAllowedForRole('/admin/dashboard', ROLES.CARETAKER)).toBe(false);

      // Caretaker routes
      expect(isRouteAllowedForRole('/monitor', ROLES.CARETAKER)).toBe(true);
      expect(isRouteAllowedForRole('/monitor?treeId=ER-PLT-00001', ROLES.CARETAKER)).toBe(true);
      expect(isRouteAllowedForRole('/monitor', ROLES.ADMIN)).toBe(true);
      expect(isRouteAllowedForRole('/monitor', ROLES.CONTRIBUTOR)).toBe(false);

      // Contributor routes
      expect(isRouteAllowedForRole('/trees', ROLES.CONTRIBUTOR)).toBe(true);
      expect(isRouteAllowedForRole('/trees', ROLES.ADMIN)).toBe(true);
      expect(isRouteAllowedForRole('/trees', ROLES.CARETAKER)).toBe(false);
      expect(isRouteAllowedForRole('/dashboard', ROLES.CONTRIBUTOR)).toBe(true);
      expect(isRouteAllowedForRole('/dashboard', ROLES.CARETAKER)).toBe(false);
      expect(isRouteAllowedForRole('/dashboard', ROLES.ADMIN)).toBe(false);

      // Shared routes
      expect(isRouteAllowedForRole('/rewards', ROLES.CONTRIBUTOR)).toBe(true);
      expect(isRouteAllowedForRole('/rewards', ROLES.CARETAKER)).toBe(true);
      expect(isRouteAllowedForRole('/rewards', ROLES.ADMIN)).toBe(true);
      expect(isRouteAllowedForRole('/ecoguide', ROLES.CARETAKER)).toBe(true);
    });

    it('resolvePostLoginRedirect resolves authorized destinations or falls back to landing workspace', () => {
      // Direct login with no prior destination
      expect(resolvePostLoginRedirect(ROLES.CONTRIBUTOR, undefined)).toBe('/dashboard');
      expect(resolvePostLoginRedirect(ROLES.CARETAKER, undefined)).toBe('/monitor');
      expect(resolvePostLoginRedirect(ROLES.ADMIN, undefined)).toBe('/admin/dashboard');

      // Prior destination allowed for role
      expect(resolvePostLoginRedirect(ROLES.ADMIN, '/admin/verifications')).toBe('/admin/verifications');
      expect(resolvePostLoginRedirect(ROLES.CARETAKER, '/monitor?treeId=ER-01')).toBe('/monitor?treeId=ER-01');
      expect(resolvePostLoginRedirect(ROLES.CONTRIBUTOR, '/rewards')).toBe('/rewards');

      // Prior destination NOT allowed for role -> safe fallback
      expect(resolvePostLoginRedirect(ROLES.CARETAKER, '/admin/dashboard')).toBe('/monitor');
      expect(resolvePostLoginRedirect(ROLES.CONTRIBUTOR, '/admin/verifications')).toBe('/dashboard');
      expect(resolvePostLoginRedirect(ROLES.CARETAKER, '/dashboard')).toBe('/monitor');
      expect(resolvePostLoginRedirect(ROLES.ADMIN, '/dashboard')).toBe('/admin/dashboard');
      expect(resolvePostLoginRedirect(ROLES.CARETAKER, '/unauthorized')).toBe('/monitor');
    });
  });

  // =========================================================================
  // 2. Successful Login Redirection Tests
  // =========================================================================
  describe('2. Post-Login Navigation by Role', () => {
    it('Contributor login -> redirects directly to Contributor Dashboard', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        success: true,
        data: {
          user: { id: 'c1', name: 'Carol Contributor', email: 'carol@ecorevive.org', role: ROLES.CONTRIBUTOR },
          token: 'jwt-contributor-token',
        },
      });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <LocationDisplay />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<div>Contributor Workspace Content</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'carol@ecorevive.org' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      expect(await screen.findByText('Contributor Workspace Content')).toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/dashboard');
    });

    it('Caretaker login -> redirects directly to Monitor Workspace (never Access Restricted)', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        success: true,
        data: {
          user: { id: 'ct1', name: 'Chris Caretaker', email: 'chris@ecorevive.org', role: ROLES.CARETAKER },
          token: 'jwt-caretaker-token',
        },
      });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <LocationDisplay />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/monitor" element={<div>Tree Health Monitoring Hub Content</div>} />
              <Route path="/unauthorized" element={<div>Access Restricted</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'chris@ecorevive.org' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      expect(await screen.findByText('Tree Health Monitoring Hub Content')).toBeInTheDocument();
      expect(screen.queryByText('Access Restricted')).not.toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/monitor');
    });

    it('Admin login -> redirects directly to Admin Dashboard (never Contributor Workspace)', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        success: true,
        data: {
          user: { id: 'a1', name: 'Alice Admin', email: 'admin@ecorevive.org', role: ROLES.ADMIN },
          token: 'jwt-admin-token',
        },
      });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <LocationDisplay />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin/dashboard" element={<div>Admin Executive Dashboard Content</div>} />
              <Route path="/dashboard" element={<div>Contributor Workspace</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'admin@ecorevive.org' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      expect(await screen.findByText('Admin Executive Dashboard Content')).toBeInTheDocument();
      expect(screen.queryByText('Contributor Workspace')).not.toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/admin/dashboard');
    });

    it('Caretaker logging in after visiting an admin route safely lands on /monitor', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        success: true,
        data: {
          user: { id: 'ct1', name: 'Chris Caretaker', email: 'chris@ecorevive.org', role: ROLES.CARETAKER },
          token: 'jwt-caretaker-token',
        },
      });

      render(
        <MemoryRouter
          initialEntries={[
            { pathname: '/login', state: { from: { pathname: '/admin/dashboard' } } },
          ]}
        >
          <AuthProvider>
            <LocationDisplay />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/monitor" element={<div>Caretaker Workspace</div>} />
              <Route path="/unauthorized" element={<div>Access Restricted</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'chris@ecorevive.org' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      expect(await screen.findByText('Caretaker Workspace')).toBeInTheDocument();
      expect(screen.queryByText('Access Restricted')).not.toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/monitor');
    });
  });

  // =========================================================================
  // 3. Root Route (/) and Default Authenticated Route Resolution
  // =========================================================================
  describe('3. Root Route (/) and Default /dashboard Resolution', () => {
    it('Unauthenticated user opening / sees public HomePage', () => {
      renderWithAppRoutes('/');
      expect(screen.getByText(/Transparent Lifecycle Management for/i)).toBeInTheDocument();
      expect(screen.getByText(/The 9-Stage Plantation Lifecycle/i)).toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/');
    });

    it('Authenticated Contributor opening / resolves to /dashboard', async () => {
      storage.setItem(STORAGE_KEYS.TOKEN, 'mock-contributor-jwt');
      storage.setItem(STORAGE_KEYS.USER, { id: 'c1', name: 'Joe Contributor', role: ROLES.CONTRIBUTOR });

      renderWithAppRoutes('/');
      expect(await screen.findByText(/Contributor Workspace/i)).toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/dashboard');
    });

    it('Authenticated Caretaker opening / resolves to /monitor', async () => {
      storage.setItem(STORAGE_KEYS.TOKEN, 'mock-caretaker-jwt');
      storage.setItem(STORAGE_KEYS.USER, { id: 'ct1', name: 'Sam Caretaker', role: ROLES.CARETAKER });

      renderWithAppRoutes('/');
      expect(await screen.findByText(/Tree Health Monitoring Hub/i)).toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/monitor');
    });

    it('Authenticated Admin opening / resolves to /admin/dashboard', async () => {
      storage.setItem(STORAGE_KEYS.TOKEN, 'mock-admin-jwt');
      storage.setItem(STORAGE_KEYS.USER, { id: 'a1', name: 'Sarah Admin', role: ROLES.ADMIN });

      renderWithAppRoutes('/');
      expect(await screen.findByText(/Platform Analytics & Executive Dashboard/i)).toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/admin/dashboard');
    });

    it('Caretaker accessing /dashboard is redirected to /monitor (never Access Restricted)', async () => {
      storage.setItem(STORAGE_KEYS.TOKEN, 'mock-caretaker-jwt');
      storage.setItem(STORAGE_KEYS.USER, { id: 'ct1', name: 'Sam Caretaker', role: ROLES.CARETAKER });

      renderWithAppRoutes('/dashboard');
      expect(await screen.findByText(/Tree Health Monitoring Hub/i)).toBeInTheDocument();
      expect(screen.queryByText(/Access Restricted/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/monitor');
    });

    it('Admin accessing /dashboard is redirected to /admin/dashboard (never Contributor Workspace)', async () => {
      storage.setItem(STORAGE_KEYS.TOKEN, 'mock-admin-jwt');
      storage.setItem(STORAGE_KEYS.USER, { id: 'a1', name: 'Sarah Admin', role: ROLES.ADMIN });

      renderWithAppRoutes('/dashboard');
      expect(await screen.findByText(/Platform Analytics & Executive Dashboard/i)).toBeInTheDocument();
      expect(screen.queryByText(/Contributor Workspace/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/admin/dashboard');
    });
  });

  // =========================================================================
  // 4. Role-Based Access Restrictions & Unauthenticated Protection
  // =========================================================================
  describe('4. RBAC Guard Enforcement & Unauthenticated Redirects', () => {
    it('Caretaker attempting to access Admin Dashboard -> Access Restricted', async () => {
      storage.setItem(STORAGE_KEYS.TOKEN, 'mock-caretaker-jwt');
      storage.setItem(STORAGE_KEYS.USER, { id: 'ct1', name: 'Sam Caretaker', role: ROLES.CARETAKER });

      renderWithAppRoutes('/admin/dashboard');
      expect(await screen.findByText('Access Restricted')).toBeInTheDocument();
      expect(screen.getByText(/You do not have the required role permissions to view this resource/i)).toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/unauthorized');
    });

    it('Contributor attempting to access Admin Dashboard -> Access Restricted', async () => {
      storage.setItem(STORAGE_KEYS.TOKEN, 'mock-contributor-jwt');
      storage.setItem(STORAGE_KEYS.USER, { id: 'c1', name: 'Joe Contributor', role: ROLES.CONTRIBUTOR });

      renderWithAppRoutes('/admin/dashboard');
      expect(await screen.findByText('Access Restricted')).toBeInTheDocument();
      expect(screen.getByText(/You do not have the required role permissions to view this resource/i)).toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/unauthorized');
    });

    it('Unauthenticated user accessing /admin/dashboard -> redirected to /login', () => {
      renderWithAppRoutes('/admin/dashboard');
      expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/login');
    });

    it('Unauthenticated user accessing /monitor -> redirected to /login', () => {
      renderWithAppRoutes('/monitor');
      expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/login');
    });

    it('Unauthenticated user accessing /dashboard -> redirected to /login', () => {
      renderWithAppRoutes('/dashboard');
      expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/login');
    });
  });

  // =========================================================================
  // 5. Browser Refresh on Role-Specific Routes
  // =========================================================================
  describe('5. Page Refresh on Role-Specific Routes', () => {
    it('Refreshing on /monitor with caretaker in storage remains on /monitor', async () => {
      storage.setItem(STORAGE_KEYS.TOKEN, 'mock-caretaker-jwt');
      storage.setItem(STORAGE_KEYS.USER, { id: 'ct1', name: 'Sam Caretaker', role: ROLES.CARETAKER });

      renderWithAppRoutes('/monitor');
      expect(await screen.findByText(/Tree Health Monitoring Hub/i)).toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/monitor');
    });

    it('Refreshing on /admin/dashboard with admin in storage remains on /admin/dashboard', async () => {
      storage.setItem(STORAGE_KEYS.TOKEN, 'mock-admin-jwt');
      storage.setItem(STORAGE_KEYS.USER, { id: 'a1', name: 'Sarah Admin', role: ROLES.ADMIN });

      renderWithAppRoutes('/admin/dashboard');
      expect(await screen.findByText(/Platform Analytics & Executive Dashboard/i)).toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/admin/dashboard');
    });

    it('Refreshing on /dashboard with contributor in storage remains on /dashboard', async () => {
      storage.setItem(STORAGE_KEYS.TOKEN, 'mock-contributor-jwt');
      storage.setItem(STORAGE_KEYS.USER, { id: 'c1', name: 'Joe Contributor', role: ROLES.CONTRIBUTOR });

      renderWithAppRoutes('/dashboard');
      expect(await screen.findByText(/Contributor Workspace/i)).toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toHaveTextContent('/dashboard');
    });
  });

  // =========================================================================
  // 6. Role Hydration and Loading States
  // =========================================================================
  describe('6. Role Hydration & Loading Gate', () => {
    it('Displays loading spinner while authentication hydrates and never shows premature Access Restricted', () => {
      const mockLoadingAuth = {
        isAuthenticated: false,
        user: null,
        loading: true,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      };

      render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <AuthContext.Provider value={mockLoadingAuth}>
            <AppRoutes />
          </AuthContext.Provider>
        </MemoryRouter>
      );

      // Must show loading spinner, never premature Access Restricted or Sign In screen
      expect(screen.getByText(/Checking authentication session...|Authorizing user permissions.../i)).toBeInTheDocument();
      expect(screen.queryByText('Access Restricted')).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /Sign In/i })).not.toBeInTheDocument();
    });

    it('Displays loading spinner on root / while hydrating and does not render HomePage prematurely', () => {
      const mockLoadingAuth = {
        isAuthenticated: false,
        user: null,
        loading: true,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      };

      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthContext.Provider value={mockLoadingAuth}>
            <AppRoutes />
          </AuthContext.Provider>
        </MemoryRouter>
      );

      expect(screen.getByText(/Checking authentication session.../i)).toBeInTheDocument();
      expect(screen.queryByText(/Transparent Lifecycle Management for/i)).not.toBeInTheDocument();
    });
  });
});

