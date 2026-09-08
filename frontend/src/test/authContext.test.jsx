import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, AuthContext } from '../context/AuthContext';
import { useContext } from 'react';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';
import { apiClient } from '../api/client';

function TestConsumer() {
  const { user, isAuthenticated, loading, login, logout, register } = useContext(AuthContext);

  if (loading) return <div>Loading Auth...</div>;

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Unauthenticated'}</div>
      <div data-testid="user-name">{user?.name || 'No User'}</div>
      <div data-testid="user-role">{user?.role || 'No Role'}</div>
      <button
        type="button"
        onClick={() => login({ email: 'user@example.com', password: 'password123' })}
      >
        Login Button
      </button>
      <button
        type="button"
        onClick={() => register({ name: 'New User', email: 'new@example.com', password: 'password123' })}
      >
        Register Button
      </button>
      <button type="button" onClick={logout}>
        Logout Button
      </button>
    </div>
  );
}

describe('Frontend Foundation — AuthContext & State Tests', () => {
  beforeEach(() => {
    storage.clear();
    vi.restoreAllMocks();
  });

  it('should initialize unauthenticated when storage is empty', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Unauthenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
  });

  it('should initialize authenticated state from persisted localStorage tokens', () => {
    const mockUser = { id: 'u1', name: 'Persisted User', email: 'u1@example.com', role: 'contributor' };
    storage.setItem(STORAGE_KEYS.TOKEN, 'persisted-jwt-token');
    storage.setItem(STORAGE_KEYS.USER, mockUser);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Persisted User');
    expect(screen.getByTestId('user-role')).toHaveTextContent('contributor');
  });

  it('should update state and storage upon successful login', async () => {
    const mockResponse = {
      success: true,
      data: {
        user: { id: 'u2', name: 'Logged In User', email: 'user@example.com', role: 'contributor' },
        token: 'new-jwt-token',
      },
    };

    vi.spyOn(apiClient, 'post').mockResolvedValue(mockResponse);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Login Button').click();
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Logged In User');
    expect(storage.getItem(STORAGE_KEYS.TOKEN)).toBe('new-jwt-token');
    expect(storage.getItem(STORAGE_KEYS.USER)).toEqual(mockResponse.data.user);
  });

  it('should update state and storage upon successful registration', async () => {
    const mockResponse = {
      success: true,
      data: {
        user: { id: 'u3', name: 'New User', email: 'new@example.com', role: 'contributor' },
        token: 'register-jwt-token',
      },
    };

    vi.spyOn(apiClient, 'post').mockResolvedValue(mockResponse);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Register Button').click();
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('New User');
    expect(storage.getItem(STORAGE_KEYS.TOKEN)).toBe('register-jwt-token');
  });

  it('should clear state and storage upon logout', async () => {
    storage.setItem(STORAGE_KEYS.TOKEN, 'token-to-clear');
    storage.setItem(STORAGE_KEYS.USER, { id: 'u4', name: 'User to Logout', role: 'contributor' });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');

    act(() => {
      screen.getByText('Logout Button').click();
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Unauthenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
    expect(storage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
    expect(storage.getItem(STORAGE_KEYS.USER)).toBeNull();
  });
});
