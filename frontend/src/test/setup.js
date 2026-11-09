import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Ensure localStorage mock is initialized
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Provide a default mock for window.scrollTo in jsdom test environments
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn();
}
