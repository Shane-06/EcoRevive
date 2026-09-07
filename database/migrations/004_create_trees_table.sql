-- Migration 004: Create trees table
-- Description: Central plantation lifecycle entity with PostGIS Point geometry (SRID 4326), lifecycle status, and contributor foreign key.

CREATE TABLE IF NOT EXISTS trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id VARCHAR(32) DEFAULT NULL,
  species VARCHAR(100) NOT NULL,
  location geometry(Point, 4326) NOT NULL,
  photo_reference TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Under Review', 'Verified', 'Rejected')),
  planted_on DATE NOT NULL,
  contributor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
