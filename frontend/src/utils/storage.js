/**
 * Safe Browser LocalStorage Utility
 */

export const storage = {
  getItem(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    } catch (e) {
      console.warn(`[Storage] Failed to read '${key}' from localStorage:`, e);
      return null;
    }
  },

  setItem(key, value) {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (e) {
      console.warn(`[Storage] Failed to write '${key}' to localStorage:`, e);
    }
  },

  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[Storage] Failed to remove '${key}' from localStorage:`, e);
    }
  },

  clear() {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('[Storage] Failed to clear localStorage:', e);
    }
  },
};
