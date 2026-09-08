import { createContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { API_ENDPOINTS, STORAGE_KEYS } from '../utils/constants';
import { storage } from '../utils/storage';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from storage on mount
  useEffect(() => {
    try {
      const storedToken = storage.getItem(STORAGE_KEYS.TOKEN);
      const storedUser = storage.getItem(STORAGE_KEYS.USER);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
    } catch (err) {
      console.error('[AuthContext] Failed to initialize auth state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Authenticates user with credentials and updates auth state.
   * @param {object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   * @returns {Promise<object>} Authenticated user object
   */
  const login = useCallback(async ({ email, password }) => {
    const res = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
    const { user: userData, token: jwtToken } = res.data;

    storage.setItem(STORAGE_KEYS.TOKEN, jwtToken);
    storage.setItem(STORAGE_KEYS.USER, userData);

    setToken(jwtToken);
    setUser(userData);

    return userData;
  }, []);

  /**
   * Registers a new contributor user and updates auth state.
   * @param {object} data
   * @param {string} data.name
   * @param {string} data.email
   * @param {string} data.password
   * @param {string} [data.role]
   * @returns {Promise<object>} Created user object
   */
  const register = useCallback(async ({ name, email, password, role }) => {
    const res = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, { name, email, password, role });
    const { user: userData, token: jwtToken } = res.data;

    storage.setItem(STORAGE_KEYS.TOKEN, jwtToken);
    storage.setItem(STORAGE_KEYS.USER, userData);

    setToken(jwtToken);
    setUser(userData);

    return userData;
  }, []);

  /**
   * Logs out the user and clears stored authentication tokens.
   */
  const logout = useCallback(() => {
    storage.removeItem(STORAGE_KEYS.TOKEN);
    storage.removeItem(STORAGE_KEYS.USER);

    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
