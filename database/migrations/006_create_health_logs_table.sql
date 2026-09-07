-- Migration 006: Create health_logs table
-- Description: Stores append-oriented tree health monitoring events linked to trees and caretaker users.

CREATE TABLE IF NOT EXISTS health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES trees(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  health_status VARCHAR(50) NOT NULL CHECK (health_status IN ('Healthy', 'Good', 'Needs Attention', 'Dead')),
  photo_reference TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
