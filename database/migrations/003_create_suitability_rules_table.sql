-- Migration 003: Create suitability_rules table
-- Description: Stores deterministic species suitability rules for plantation assessment.

CREATE TABLE IF NOT EXISTS suitability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species VARCHAR(100) NOT NULL UNIQUE,
  soil_type TEXT NOT NULL,
  min_spacing_m NUMERIC(6,2) NOT NULL,
  sunlight TEXT NOT NULL,
  water_need TEXT NOT NULL,
  climate_region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
