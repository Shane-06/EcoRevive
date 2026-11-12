-- Migration 010: Create Environment Cache Table for Persistent Weather and Soil Fallbacks
-- Preserves spatial resolution, provider isolation, and persistent rate-limit tracking.

CREATE TABLE IF NOT EXISTS environment_cache (
    id SERIAL PRIMARY KEY,
    grid_key VARCHAR(128) NOT NULL,
    cache_type VARCHAR(32) NOT NULL, -- 'weather', 'soil_exact', 'soil_regional'
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    source VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'available',
    data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    verified_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_environment_cache_key_type UNIQUE (grid_key, cache_type),
    CONSTRAINT chk_cache_type CHECK (cache_type IN ('weather', 'soil_exact', 'soil_regional')),
    CONSTRAINT chk_cache_status CHECK (status IN ('available', 'regional_baseline'))
);

CREATE INDEX IF NOT EXISTS idx_environment_cache_lookup 
    ON environment_cache (grid_key, cache_type, expires_at);

CREATE INDEX IF NOT EXISTS idx_environment_cache_stale_fallback
    ON environment_cache (grid_key, cache_type, updated_at DESC);

-- Global Provider Cooldown & Outbound Permit Coordination across instances and restarts
CREATE TABLE IF NOT EXISTS provider_cooldowns (
    provider_name VARCHAR(64) PRIMARY KEY,
    cooldown_until TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01 00:00:00+00',
    status_code INT NOT NULL DEFAULT 200,
    retry_after_seconds INT NOT NULL DEFAULT 0,
    permit_holder VARCHAR(128),
    permit_expires_at TIMESTAMPTZ,
    reason TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_provider_cooldowns_active 
    ON provider_cooldowns (provider_name, cooldown_until);
