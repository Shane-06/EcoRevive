# EcoRevive Database Layer 🗄️

This directory manages the PostgreSQL + PostGIS database migrations and seed scripts for EcoRevive.

## Structure

```
database/
├── migrations/      # SQL migration scripts (PostGIS extension, tables, constraints, indexes)
└── seeds/           # Seed data (10 species deterministic suitability rules, test fixtures)
```

## Strategy

- **Database Engine**: PostgreSQL 14+
- **Spatial Extension**: PostGIS (`CREATE EXTENSION IF NOT EXISTS postgis;`)
- **Spatial Reference System**: WGS84 (SRID 4326)
- **Primary Spatial Data**: `POINT(location, 4326)` on `trees` table with GiST spatial indexing (`idx_trees_location_gist`).

*Note: Live database connectivity and migration execution will be implemented in Milestone 3.*
