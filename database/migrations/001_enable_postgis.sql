-- Migration 001: Enable PostGIS Spatial Extension
-- Description: Enables PostGIS extension for spatial geometry storage, spatial indexing, and spatial calculation functions.

CREATE EXTENSION IF NOT EXISTS postgis;
