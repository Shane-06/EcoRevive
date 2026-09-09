/**
 * EcoRevive Frontend Constants
 */

export const ROLES = {
  CONTRIBUTOR: 'contributor',
  CARETAKER: 'caretaker',
  ADMIN: 'admin',
};

export const STORAGE_KEYS = {
  TOKEN: 'ecorevive_token',
  USER: 'ecorevive_user',
};

export const FROZEN_HEALTH_STATUSES = [
  'Healthy',
  'Good',
  'Needs Attention',
  'Dead',
];

export const PLANTATION_STATUSES = [
  'Pending',
  'Under Review',
  'Verified',
  'Rejected',
];

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
  },
  TREES: {
    BASE: '/trees',
    MINE: '/trees/mine',
    MAP: '/trees/map',
    NEARBY: '/trees/nearby',
  },
  SPECIES: {
    BASE: '/species',
  },
  SUITABILITY: {
    BASE: '/suitability',
  },
  ENVIRONMENT: {
    LOOKUP: '/environment/lookup',
  },
  REWARDS: {
    ME: '/rewards/me',
  },
  DASHBOARD: {
    ME: '/dashboard/me',
    ADMIN: '/admin/dashboard',
  },
  ADMIN: {
    VERIFICATIONS: '/admin/verifications',
    DASHBOARD: '/admin/dashboard',
  },
  PUBLIC: {
    TREE: '/public/trees',
  },
  HEALTH: {
    STATUS: '/health',
  },
};
