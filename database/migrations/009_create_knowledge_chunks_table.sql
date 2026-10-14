-- Migration 009: Create knowledge chunks table with tsvector full-text search
-- Description: Establishes the authoritative knowledge_chunks table, GIN full-text search index, and lookup indexes for EcoGuide RAG.

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id VARCHAR(100) NOT NULL,
  document_title VARCHAR(255) NOT NULL,
  document_version VARCHAR(50) NOT NULL,
  section_heading VARCHAR(255) NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  approval_status VARCHAR(30) NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('draft', 'approved', 'deprecated')),
  tsv_content tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(document_title, '') || ' ' || coalesce(section_heading, '') || ' ' || coalesce(content, ''))
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Full-text search GIN index
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_tsv ON knowledge_chunks USING GIN (tsv_content);

-- Composite lookup index for version and approval status filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_lookup ON knowledge_chunks (source_id, document_version, approval_status);

-- Unique constraint ensuring idempotent, duplicate-free ingestion per source, version, and chunk index
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_chunks_unique_chunk ON knowledge_chunks (source_id, document_version, chunk_index);
