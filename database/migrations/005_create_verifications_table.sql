-- Migration 005: Create verifications table
-- Description: Stores manual review and verification audit records linked to trees and coordinator users.

CREATE TABLE IF NOT EXISTS verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES trees(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  decision VARCHAR(30) NOT NULL CHECK (decision IN ('UNDER_REVIEW', 'VERIFIED', 'REJECTED')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason TEXT
);
