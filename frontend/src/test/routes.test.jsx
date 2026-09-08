import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import AppRoutes from '../routes/AppRoutes';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';

function renderWithRouter(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Frontend Foundation — Route Guards & Navigation Tests', () => {
  beforeEach(() => {
    storage.clear();
    vi.restoreAllMocks();
  });

  it('should render the public Home page on /', () => {
    renderWithRouter('/');
    expect(screen.getByText(/Transparent Lifecycle Management for/i)).toBeInTheDocument();
  });

  it('should render the public Map page on /map', () => {
    renderWithRouter('/map');
    expect(screen.getByText(/Interactive Plantation Map/i)).toBeInTheDocument();
  });

  it('should block unauthenticated access to /dashboard and redirect to /login', () => {
    renderWithRouter('/dashboard');
    expect(screen.getByText(/Sign In to EcoRevive/i)).toBeInTheDocument();
  });

  it('should allow authenticated contributor to access /dashboard', () => {
    storage.setItem(STORAGE_KEYS.TOKEN, 'mock-jwt-token');
    storage.setItem(STORAGE_KEYS.USER, {
      id: 'c1',
      name: 'Test Contributor',
      email: 'c1@example.com',
      role: 'contributor',
    });

    renderWithRouter('/dashboard');
    expect(screen.getByText(/Contributor Dashboard/i)).toBeInTheDocument();
  });

  it('should redirect contributor attempting to access /admin to /unauthorized', () => {
    storage.setItem(STORAGE_KEYS.TOKEN, 'mock-jwt-token');
    storage.setItem(STORAGE_KEYS.USER, {
      id: 'c1',
      name: 'Test Contributor',
      email: 'c1@example.com',
      role: 'contributor',
    });

    renderWithRouter('/admin');
    expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
  });

  it('should allow authenticated admin to access /admin', () => {
    storage.setItem(STORAGE_KEYS.TOKEN, 'mock-jwt-admin-token');
    storage.setItem(STORAGE_KEYS.USER, {
      id: 'a1',
      name: 'Test Admin',
      email: 'admin@example.com',
      role: 'admin',
    });

    renderWithRouter('/admin');
    expect(screen.getByText(/Coordinator Verification & Administration/i)).toBeInTheDocument();
  });

  it('should render 404 Not Found component on unknown routes', () => {
    renderWithRouter('/non-existent-page-route');
    expect(screen.getByTestId('not-found-state')).toBeInTheDocument();
    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
  });
});
