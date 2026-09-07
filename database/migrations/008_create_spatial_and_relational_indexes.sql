-- Migration 008: Create spatial and relational indexes
-- Description: Establishes the authoritative PostGIS GiST spatial index, unique Tree ID index, and relational B-tree performance indexes.

-- 1. Spatial GiST index for PostGIS location queries
CREATE INDEX IF NOT EXISTS idx_trees_location_gist ON trees USING GIST (location);

-- 2. Unique index on non-null Tree IDs (allows multiple NULLs for Pending trees)
CREATE UNIQUE INDEX IF NOT EXISTS uq_trees_tree_id ON trees(tree_id) WHERE tree_id IS NOT NULL;

-- 3. Relational B-tree indexes for trees
CREATE INDEX IF NOT EXISTS idx_trees_contributor_id ON trees(contributor_id);
CREATE INDEX IF NOT EXISTS idx_trees_status ON trees(status);
CREATE INDEX IF NOT EXISTS idx_trees_created_at ON trees(created_at);

-- 4. Relational B-tree indexes for verifications
CREATE INDEX IF NOT EXISTS idx_verifications_tree_id ON verifications(tree_id);
CREATE INDEX IF NOT EXISTS idx_verifications_reviewer_id ON verifications(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_verifications_timestamp ON verifications(timestamp);

-- 5. Relational B-tree indexes for health_logs
CREATE INDEX IF NOT EXISTS idx_health_logs_tree_id ON health_logs(tree_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_submitted_by ON health_logs(submitted_by);
CREATE INDEX IF NOT EXISTS idx_health_logs_recorded_at ON health_logs(recorded_at);

-- 6. Relational B-tree indexes for rewards
CREATE INDEX IF NOT EXISTS idx_rewards_user_id ON rewards(user_id);
