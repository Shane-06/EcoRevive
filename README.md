# EcoRevive 🌿

**Urban Reforestation & Verified Canopy Growth Platform**

EcoRevive is an open-source, full-stack environmental management platform designed to record, assess, verify, identify, monitor, and track urban and rural tree plantation initiatives. Combining geospatial mapping (PostGIS), deterministic environmental analysis (weather and soil profiles), coordinator verification workflows, authoritative QR-linked digital identities, chronological caretaker health logs, and an offline-first knowledge and live-data assistant (**EcoGuide**), EcoRevive transforms traditional tree planting into a transparent, accountable, and auditable digital lifecycle.

---

## Table of Contents

- [1. Executive Overview](#1-executive-overview)
  - [The Problem](#the-problem)
  - [The EcoRevive Solution](#the-ecorevive-solution)
  - [The 9-Stage Plantation Lifecycle](#the-9-stage-plantation-lifecycle)
- [2. System Architecture](#2-system-architecture)
  - [High-Level Architecture Diagram](#high-level-architecture-diagram)
  - [Request-Response Flow](#request-response-flow)
  - [Technology Stack](#technology-stack)
- [3. Core Features & Capabilities](#3-core-features--capabilities)
  - [Authentication & Role-Based Access Control](#authentication--role-based-access-control)
  - [Plantation Registration & Geospatial Mapping](#plantation-registration--geospatial-mapping)
  - [Environmental Suitability Assessment](#environmental-suitability-assessment)
  - [Coordinator Verification & Identity Issuance](#coordinator-verification--identity-issuance)
  - [Public Tree Profiles & Field QR Codes](#public-tree-profiles--field-qr-codes)
  - [Caretaker Health Monitoring](#caretaker-health-monitoring)
  - [Contributor Rewards Ledger & Dashboards](#contributor-rewards-ledger--dashboards)
- [4. EcoGuide — Grounded Knowledge & Data Assistant](#4-ecoguide--grounded-knowledge--data-assistant)
  - [Architecture & Information Sources](#architecture--information-sources)
  - [Zero-Billing & Offline-First Design](#zero-billing--offline-first-design)
  - [PostgreSQL Full-Text Search (RAG)](#postgresql-full-text-search-rag)
  - [Authorized Read-Only Live Data Tools](#authorized-read-only-live-data-tools)
  - [Unified Multi-Source Orchestration](#unified-multi-source-orchestration)
  - [Prompt Defense & Data Minimization](#prompt-defense--data-minimization)
- [5. Tree Health Intelligence Engine](#5-tree-health-intelligence-engine)
  - [Deterministic Health Severity Model](#deterministic-health-severity-model)
  - [Monotonic Health Trend Calculation](#monotonic-health-trend-calculation)
  - [30-Day Monitoring Freshness Evaluation](#30-day-monitoring-freshness-evaluation)
  - [Explainable Rules-Based Recommendations](#explainable-rules-based-recommendations)
- [6. Security, Reliability & Compliance](#6-security-reliability--compliance)
- [7. Database Architecture & Data Model](#7-database-architecture--data-model)
  - [Database Schema & Entity Relationship Diagram](#database-schema--entity-relationship-diagram)
  - [Spatial & Full-Text Search Indexes](#spatial--full-text-search-indexes)
- [8. Development Journey & Verified Milestones](#8-development-journey--verified-milestones)
  - [V1 Implementation (M1–M16)](#v1-implementation-m1m16)
  - [V2 Implementation (V2-M0–V2-M6)](#v2-implementation-v2-m0v2-m6)
  - [Verified Test & Quality Metrics](#verified-test--quality-metrics)
- [9. Project Structure](#9-project-structure)
- [10. Installation & Local Setup Guide](#10-installation--local-setup-guide)
  - [Prerequisites](#prerequisites)
  - [Step-by-Step Setup](#step-by-step-setup)
  - [Database Migrations, Seeds & Ingestion](#database-migrations-seeds--ingestion)
  - [Running Tests & Build](#running-tests--build)
- [11. Environment Variables Reference](#11-environment-variables-reference)
- [12. API Reference](#12-api-reference)
- [13. Limitations & Future Scope](#13-limitations--future-scope)
- [14. Documentation & References](#14-documentation--references)

---

## 1. Executive Overview

### The Problem

Urban reforestation and ecological restoration initiatives often suffer from systemic transparency and monitoring deficits:
- **Quantity over Longevity:** Drives emphasize the raw count of saplings planted rather than post-planting survival, ongoing care, or canopy maturation.
- **Verification Gaps:** Remote programs struggle to physically verify that a sapling was planted at genuine coordinates with photographic proof.
- **Monitoring Decay:** Without structured reminders and observation protocols, trees suffer from neglect, dehydration, and pests without timely intervention.
- **Identity Fragmentation:** Planted trees lack durable digital identifiers, preventing field inspectors and the public from inspecting historical care records.
- **Steward Disengagement:** Community participants lack verifiable records of their contributions, impact metrics, or stewardship rewards.

### The EcoRevive Solution

EcoRevive introduces a unified, auditable digital platform connecting **Contributors** (citizens planting trees), **Caretakers** (field monitors inspecting health), **Administrators** (verification coordinators), and the **Public** (citizens scanning physical QR codes and browsing urban canopies). Plantation initiatives follow the platform's end-to-end nine-stage plantation lifecycle:

```mermaid
flowchart LR
    A[DISCOVER] --> B[ASSESS]
    B --> C[PLANT]
    C --> D[PROVE]
    D --> E[VERIFY]
    E --> F[IDENTIFY]
    F --> G[MONITOR]
    G --> H[REWARD]
    H --> I[TRACK]
```

### The Nine-Stage Plantation Lifecycle

While database state transitions strictly govern the four-state verification lifecycle on individual plantation records (`Pending` → `Under Review` → `Verified` / `Rejected`), the wider platform orchestrates the following nine stages across discovery, monitoring, and public engagement:

1. **DISCOVER:** Contributors explore interactive GIS maps (Leaflet + PostGIS) to find prospective planting zones and inspect existing canopy coverage.
2. **ASSESS:** Before planting, contributors evaluate atmospheric weather (Open-Meteo) and topsoil characteristics (ISRIC SoilGrids) evaluated by a deterministic suitability engine for native species.
3. **PLANT:** The contributor plants a native seedling conforming to recommended soil pH, moisture, and biological spacing rules.
4. **PROVE:** The contributor registers the plantation by submitting GPS coordinates, species selection, plantation date, and photographic evidence.
5. **VERIFY:** Administrative coordinators audit the photographic proof and coordinates in a dedicated verification queue (`Pending` → `Under Review` → `Verified` / `Rejected`).
6. **IDENTIFY:** Upon approval, PostgreSQL atomically generates an authoritative sequential Tree ID (`ER-PLT-XXXXX`) and generates a canonical QR code linking to a privacy-safe public profile.
7. **MONITOR:** Caretakers conduct recurring field inspections (30-day schedule), logging standardized health observations (`Healthy`, `Good`, `Needs Attention`, `Dead`) with server-authoritative timestamps.
8. **REWARD:** The platform credits a 50-point stewardship reward to the contributor's ledger upon verification approval.
9. **TRACK:** Contributors, administrators, and the public track canopy survival rates, growth trends, environmental impact, and long-term health intelligence over time.

---

## 2. System Architecture

EcoRevive is built as a **modular monolith** with clear layer separation across routing, controllers, business services, repositories, and integration providers.

### High-Level Architecture Diagram

```mermaid
graph TD
    subgraph Client Layer
        WebClient["React 18 SPA<br/>(Vite 5 + Tailwind CSS + Leaflet)"]
        PublicUser["Public Citizens<br/>(QR Code Scanners & Map Explorers)"]
        AuthUser["Authenticated Stewards<br/>(Contributor, Caretaker, Admin)"]
    end

    subgraph API Gateway & Security Layer
        ExpressApp["Express.js 4.21 Gateway (/api/v1)"]
        RateLimiter["Sliding-Window Rate Limiter<br/>(Public: 60/min IP | AI: 20/min User)"]
        AuthMiddleware["JWT Authentication Middleware<br/>(Bearer Token, 7d expiration)"]
        RBACMiddleware["Role-Based Access Control<br/>(Contributor / Caretaker / Admin)"]
    end

    subgraph Business Service Layer
        TreeService["Plantation & Tree Service"]
        GISService["Spatial & Suitability Engine"]
        VerifyService["Verification Workflow Service"]
        HealthIntel["Deterministic Health Intelligence Engine"]
        EcoGuide["Unified EcoGuide Orchestrator"]
    end

    subgraph Persistence & External Integrations
        PostgreSQL[("PostgreSQL 15+ & PostGIS<br/>(Spatial GiST, Full-Text GIN)")]
        OpenMeteo["Open-Meteo Weather API"]
        SoilGrids["ISRIC SoilGrids 2.0 API"]
        MockAI["MockAiProvider<br/>(Default Offline, $0.00)"]
        GeminiAI["Google AI Studio Free Tier<br/>(gemini-3.8-flash, Optional)"]
    end

    PublicUser -->|Scan Field QR / View Map| WebClient
    AuthUser -->|Register / Review / Monitor / Chat| WebClient
    WebClient -->|REST API Requests| ExpressApp

    ExpressApp --> RateLimiter
    RateLimiter --> AuthMiddleware
    AuthMiddleware --> RBACMiddleware

    RBACMiddleware --> TreeService
    RBACMiddleware --> GISService
    RBACMiddleware --> VerifyService
    RBACMiddleware --> HealthIntel
    RBACMiddleware --> EcoGuide

    TreeService --> PostgreSQL
    GISService --> PostgreSQL
    GISService --> OpenMeteo
    GISService --> SoilGrids
    VerifyService --> PostgreSQL
    HealthIntel --> PostgreSQL

    EcoGuide --> PostgreSQL
    EcoGuide --> HealthIntel
    EcoGuide -.->|AI_PROVIDER=mock| MockAI
    EcoGuide -.->|AI_PROVIDER=gemini| GeminiAI
```

### Request-Response Flow

1. **Client Request:** The React Single Page Application (SPA) sends an HTTP request using a centralized API client with automatic JWT token injection.
2. **Rate Limiting & Security Filters:** The request passes through an in-memory sliding-window rate limiter, CORS origin verification, and payload bounding (10MB).
3. **Authentication & Authorization:** JWT tokens are verified; authenticated user identity (`id`, `role`) is attached to `req.user`. Route-level RBAC enforces exact role permissions (`requireRole`).
4. **Service & Transaction Layer:** Business logic executes within domain services. Relational and spatial operations run parameterized queries via connection pools, utilizing atomic transactions (`withTransaction`) for multi-step mutations (e.g., verification approval, Tree ID generation, and reward allocation).
5. **Sanitized Error Handling:** Centralized error middleware catches domain exceptions, masks internal database errors in production, and emits standardized JSON response envelopes.

### Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | React | 18.3.1 | Component-driven Single Page Application |
| **Build Tool & Bundler** | Vite | 5.4.21 | Rapid local development HMR and production bundling |
| **Routing** | React Router | 6.28.0 | Client-side declarative routing and protected routes |
| **Styling** | Tailwind CSS | 3.4.16 | Utility-first responsive UI styling |
| **Icons** | Lucide React | 0.468.0 | Consistent iconography |
| **Mapping Engine** | Leaflet / React-Leaflet | 1.9.4 | Interactive geospatial canopy maps and markers |
| **QR Generation & Scanning** | qrcode / html5-qrcode | 1.5.4 / 2.3.8 | QR code data URLs, SVG generation, and camera scanning |
| **Backend Framework** | Node.js / Express.js | 4.21.2 | Modular monolith REST API |
| **Database** | PostgreSQL | 15+ | Relational persistence, constraints, and Full-Text Search |
| **Spatial Engine** | PostGIS | 3.3+ | Geospatial calculations (`geometry(Point, 4326)` and GiST indexing) |
| **Authentication** | jsonwebtoken / bcryptjs | 9.0.2 / 3.0.2 | JWT issuance/verification and 10-round salted password hashing |
| **External Weather API** | Open-Meteo | v1 REST | Real-time atmospheric metrics (backend-mediated) |
| **External Soil API** | ISRIC SoilGrids | 2.0 REST | Topsoil properties and texture classes (backend-mediated) |
| **AI Integration** | Mock / Google AI Studio | Free Tier | Contextual assistant with zero-billing design |
| **Testing Harness** | Jest & Supertest (Backend)<br/>Vitest & RTL (Frontend) | 29.7.0 / 7.0.0<br/>2.1.8 / 14.3.1 | Comprehensive unit, integration, and E2E regression testing |

---

## 3. Core Features & Capabilities

### Authentication & Role-Based Access Control
- **Secure Registration & Login:** Email/password authentication using bcrypt password hashing (10 salt rounds) and signed JSON Web Tokens (7-day default expiry).
- **Three Core User Roles:**
  - `contributor`: Registers plantations, views personal submission statuses, accesses the contributor dashboard, and earns reward points.
  - `caretaker`: Accesses assigned field trees, scans QR codes, and records chronological health observation logs.
  - `admin`: Audits verification queues, approves/rejects submissions, inspects platform metrics, and oversees platform integrity.
- **Public Citizens:** Can browse the interactive map, inspect verified tree profiles, and scan QR codes without creating an account.

### Plantation Registration & Geospatial Mapping
- **Interactive Map Experience:** Leaflet-based map rendering verified tree markers across geographic coordinates with viewport bounding-box queries (`ST_MakeEnvelope`) and proximity search (`ST_DWithin`).
- **Precision Coordinate Capture:** Plantation submissions validate geographic latitude (`-90` to `90`) and longitude (`-180` to `180`), storing locations in PostGIS `geometry(Point, 4326)` indexed with spatial GiST indexes.
- **Evidence Documentation:** Supports photo uploads and date recording to establish physical provenance before review.

### Environmental Suitability Assessment
- **Backend-Mediated Environmental Ingestion:** Prevents client-side API key exposure by mediating all third-party requests through backend endpoints:
  - Atmospheric weather via Open-Meteo (temperature, relative humidity, precipitation, wind speed).
  - Soil physical and chemical properties via ISRIC SoilGrids (topsoil pH 0–5cm, soil texture class, organic carbon density, clay/sand/silt percentages).
- **Deterministic 4-State Suitability Engine:** Evaluates native species requirements against local conditions:
  - `Suitable`: pH, temperature, and physical spacing meet species criteria.
  - `Moderate`: Mild deviations in temperature or pH that do not inhibit survival.
  - `Unsuitable`: Critical biological incompatibilities (e.g., highly acidic soil or extreme temperatures).
  - `Insufficient Data`: Incomplete atmospheric or topsoil readings.

### Coordinator Verification & Identity Issuance
- **Four-State Verification Workflow:** Enforces an atomic review lifecycle across four distinct statuses: `Pending` → `Under Review` → `Verified` or `Rejected`.
- **Mandatory Rejection Auditing:** Administrative rejections require a recorded reason preserved in the audit `verifications` table.
- **Authoritative Permanent Tree ID:** Upon verification approval, PostgreSQL atomically generates a sequential, unique Tree ID adhering to the format `ER-PLT-XXXXX` (e.g., `ER-PLT-00001`). Tree IDs cannot be modified or forged, serving as uniquely generated, server-authoritative identifiers.

### Public Tree Profiles & Field QR Codes
- **Canonical QR Generation:** Generates SVG and PNG data URLs linking to `https://<domain>/tree/<treeId>`.
- **Privacy-Safe Public Profile:** Publicly accessible view showing tree species, plantation date, health status, and care history. Internal database UUIDs, contributor emails, passwords, and private notes are strictly redacted.

### Caretaker Health Monitoring
- **Standardized Health Status Vocabulary:** Observations use four frozen statuses:
  - `Healthy` (Severity 0): Vigorous foliage, strong growth, pest-free.
  - `Good` (Severity 1): Normal vitality with minor blemishes or slight wilting.
  - `Needs Attention` (Severity 2): Significant dehydration, breakage, or pest signs.
  - `Dead` (Severity 3): Complete desiccation or fatal structural loss.
- **Server-Authoritative Audit Timestamps:** Inspection timestamps (`recorded_at`) are created by PostgreSQL, preventing client clock manipulation.
- **Safe Default State:** Trees without recorded inspections display *"No health records yet"*, never inferring *"Dead"*.

### Contributor Rewards Ledger & Dashboards
- **Deterministic Impact Points:** Exactly 50 impact points are atomically credited to the contributor's ledger upon verification approval. Health monitoring and administrative actions award 0 points.
- **Role-Tailored Dashboards:**
  - *Contributor Dashboard:* Personal plantation counts by status, points balance, and recent activities.
  - *Admin Dashboard:* System-wide aggregates (total registered trees, verified canopy count, pending reviews, active caretakers).

---

## 4. EcoGuide — Grounded Knowledge & Data Assistant

**EcoGuide** is an intelligent assistant integrated into EcoRevive to answer questions about platform workflows, environmental guidelines, authorized live records, and tree health intelligence.

```mermaid
flowchart TD
    UserQuery["User Message: 'Why is ER-PLT-00001 overdue and what is recommended?'"] --> Router["EcoGuide Unified Orchestrator"]

    subgraph Source A: Approved Knowledge
        Router --> FTS["PostgreSQL Full-Text Search (plainto_tsquery)"]
        FTS --> GINIndex["GIN Index on knowledge_chunks(tsv_content)"]
        GINIndex --> Chunks["Approved Domain Chunks (Lifecycle, Rules, Protocols)"]
    end

    subgraph Source B: Authorized Platform Tools
        Router --> ToolGate{"Model Tool Call & Role Gate"}
        ToolGate -->|Authorized| ToolExec["Tool Executor (3,000ms Timeout / Max 2,000 chars)"]
        ToolExec --> TreeData["Live Database Query (Scoped to req.user)"]
    end

    subgraph Source C: Health Intelligence
        ToolExec --> HealthService["Deterministic Tree Health Intelligence Service"]
        HealthService --> MathCalc["Computed Trend + 30-Day Freshness + Rules Engine"]
    end

    Chunks --> Synthesizer["Prompt Builder & Sanitizer (XML Framing, Zero PII)"]
    TreeData --> Synthesizer
    MathCalc --> Synthesizer

    Synthesizer --> Provider["AI Provider (MockAiProvider or Gemini Free Tier)"]
    Provider --> FinalAnswer["Grounded Response + Categorized Source Citations"]
```

### Architecture & Information Sources

EcoGuide orchestrates three distinct information sources:
1. **Source A — Approved Knowledge:** 8 curated, version-controlled knowledge chunks ingested into PostgreSQL. Covers lifecycle stages, verification protocols, soil parameters, and monitoring schedules.
2. **Source B — Authorized Live Platform Data:** Five server-controlled read-only tools executed only after strict server-side role validation:
   - `getUserPlantationsSummary` (Contributor): Scoped summary of personal plantations.
   - `getVerifiedTreeStatus` (All roles): Verification and public metadata for a verified tree.
   - `getTreeHealthSummary` (All roles): Recent health logs for a verified tree.
   - `getPlatformVerificationSummary` (Admin only): Platform-wide verification statistics.
   - `getTreeHealthInsight` (All roles): Deterministic health trends, freshness, and suggestions.
3. **Source C — Deterministic Tree Health Intelligence:** Pure mathematical calculations and rule evaluations computed by backend services. The LLM explains computed results but cannot calculate, alter, or override them.

### Zero-Billing & Offline-First Design

EcoRevive implements a deliberate **Zero-Billing Architecture**:
- **Offline Mock Mode (Default & Invariant):** When `AI_PROVIDER=mock`, the assistant operates completely offline, requires zero API keys, makes zero external network requests, and incurs zero financial cost. It returns schema-valid canned responses for local development, automated test suites, and CI pipelines.
- **Optional Google AI Studio Free Tier:** When `AI_PROVIDER=gemini`, the system connects to Google AI Studio's Free Tier using officially approved free-of-charge models:
  - *Primary Model:* `gemini-3.8-flash` (Google AI Studio Free Tier)
  - *Fallback Model:* `gemini-3.5-flash-lite` (Google AI Studio Free Tier)
- **External Free-Tier Terms & Availability:** Optional live Gemini usage is subject to Google's free-tier availability, rate limits, quotas, and service terms (under which Google may log prompts and use data to improve products). Third-party free-tier services are external and are not guaranteed to remain free or unchanged indefinitely.
- **Zero Paid-Tier Failover:** No paid-tier provider fallback is configured. Paid models and unapproved providers are rejected at startup.
- **Graceful Degradation:** If Google AI Studio Free Tier quotas are exhausted (HTTP 429) or the 25,000 ms request deadline expires, EcoGuide falls back to an explicit 503 `PROVIDER_UNAVAILABLE` error envelope with `costIncurred: "$0.00"`, ensuring no unexpected charges are incurred.
- **Core Platform Independence:** Core platform operations (planting, verifying, monitoring, geospatial mapping, and deterministic health calculations) operate 100% independently of external LLM availability.

### PostgreSQL Full-Text Search (RAG)
- **Database-Native Search:** Knowledge retrieval operates directly inside PostgreSQL without external vector databases.
- **Generated `tsvector`:** The `knowledge_chunks` table includes a stored generated column:
  ```sql
  tsv_content tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(document_title, '') || ' ' || coalesce(section_heading, '') || ' ' || coalesce(content, ''))
  ) STORED;
  ```
- **GIN Indexing:** Indexed with `idx_knowledge_chunks_tsv USING GIN(tsv_content)` for efficient full-text keyword and phrase queries without sequential table scans.
- **Idempotent Ingestion:** Chunks are ingested via `database/ingestKnowledge.js` using `ON CONFLICT (source_id, document_version, chunk_index) DO UPDATE` to ensure duplicate-free repeatability.

### Authorized Read-Only Live Data Tools
- **Server-Side Allowlist:** Only allowlisted tools in `toolRegistry.js` can be executed. Model-invented function names are rejected.
- **Role Verification:** Even if the model requests a tool call, execution aborts with `UNAUTHORIZED_TOOL` if the authenticated user's role lacks permission.
- **Resource Bounds:** Execution is bounded by a 3,000 ms timeout and a 2,000 character output cap.
- **UUID Redaction:** Internal database primary keys (UUIDs) are stripped from tool outputs, exposing only public identifiers (`ER-PLT-XXXXX`).

### Unified Multi-Source Orchestration
- **Single-Turn & Combined Queries:** Seamlessly responds to questions spanning documentation and live records (e.g., *"Why is my tree ER-PLT-00001 overdue, and what are the platform guidelines?"*).
- **Multi-Turn Context Resolution:** Resolves tree identifiers mentioned in previous turns across conversation history.
- **Categorized Attribution Badges:** Returns distinct, color-coded source citations:
  - `knowledge`: Approved documentation (Document title, section, version).
  - `live_data`: Authorized platform records (Tool name, public Tree ID).
  - `health_intelligence`: Deterministic insights (Health trend, monitoring status).
- **Access Restriction Alerts:** If a user queries a tree they do not own or lack permission to inspect, EcoGuide emits an explicit `unauthorized` status badge in the chat interface.

### Prompt Defense & Data Minimization
- **XML Tag Delimitation:** External inputs are framed in explicit XML tags (`<approved_knowledge>`, `<authorized_platform_data>`, `<user_question>`). System instructions mandate that data tags cannot alter operational rules.
- **Zero-PII Policy:** User names, emails, passwords, JWT tokens, and internal UUIDs are strictly stripped prior to prompt compilation.

---

## 5. Tree Health Intelligence Engine

Tree Health Intelligence is a **100% deterministic, explainable analytical engine** operating locally within the backend. It does not employ probabilistic machine learning, black-box neural networks, or LLM-based diagnoses.

### Deterministic Health Severity Model

Observations map to discrete ordinal severities:

$$\text{Severity}(\text{Healthy}) = 0, \quad \text{Severity}(\text{Good}) = 1, \quad \text{Severity}(\text{Needs Attention}) = 2, \quad \text{Severity}(\text{Dead}) = 3$$

### Monotonic Health Trend Calculation

Health trends are calculated deterministically from chronological observations sorted oldest to newest ($O_1, O_2, \dots$):

- **When 3 observations are available ($O_1, O_2, O_3$):**
  - **Worsening (`worsening`):** Two consecutive severity increases ($\Delta_1 = s_2 - s_1 > 0$ and $\Delta_2 = s_3 - s_2 > 0$). E.g., $\text{Healthy (0)} \to \text{Good (1)} \to \text{Needs Attention (2)}$.
  - **Improving (`improving`):** Two consecutive severity decreases ($\Delta_1 = s_2 - s_1 < 0$ and $\Delta_2 = s_3 - s_2 < 0$). E.g., $\text{Needs Attention (2)} \to \text{Good (1)} \to \text{Healthy (0)}$.
  - **Stable (`stable`):** All three consecutive observations have equal severity ($s_1 = s_2 = s_3$). E.g., $\text{Good (1)} \to \text{Good (1)} \to \text{Good (1)}$.
  - **Mixed (`mixed`):** Otherwise; fluctuating severity without uniform progression (e.g., $\text{Good (1)} \to \text{Healthy (0)} \to \text{Good (1)}$).

- **When 2 observations are available ($O_1, O_2$):**
  - **Worsening (`worsening`):** Severity increased ($s_2 > s_1$).
  - **Improving (`improving`):** Severity decreased ($s_2 < s_1$).
  - **Stable (`stable`):** Severity unchanged ($s_2 = s_1$).

- **Insufficient History (`insufficient_history`):** Exactly 1 usable observation is recorded (at least 2 observations are required to determine a directional trend).
- **No Record (`no_record`):** Zero usable health observations exist for the tree.

### 30-Day Monitoring Freshness Evaluation

Freshness evaluates elapsed time in UTC milliseconds against a 30-day window (720 hours = 2,592,000,000 ms):
- **Up to Date (`up_to_date`):** Elapsed time $\le 720 \text{ hours}$.
- **Overdue (`overdue`):** Elapsed time $> 720 \text{ hours}$.
- **No Record (`no_record`):** Zero observations recorded.

### Explainable Rules-Based Recommendations

Follow-up suggestions are generated through an explicit decision matrix:
- If tree is `Dead`: Recommend administrative verification and dead tree recording.
- If status is `Needs Attention` and trend is `worsening`: High-priority recommendation for immediate on-site moisture and pest inspection.
- If monitoring is `overdue`: Recommend scheduling an on-site caretaker inspection.
- If status is `Healthy` and trend is `stable`: Standard maintenance protocol recommendation.

---

## 6. Security, Reliability & Compliance

| Security Dimension | Implemented Mechanism | Code Location |
|---|---|---|
| **Authentication** | Bearer JWT verification, 7-day expiration, secret validation | `backend/src/middleware/auth.middleware.js` |
| **Password Hashing** | Salted bcrypt hashing with 10 salt rounds | `backend/src/utils/password.js` |
| **Role Authorization** | Declarative route-level RBAC (`requireRole`) | `backend/src/middleware/rbac.middleware.js` |
| **Data Isolation** | Parameterized queries scoped to authenticated `user.id` | `backend/src/repositories/*` |
| **SQL Injection Defense** | Parameterized queries ($1, $2, ...) for data inputs via `pg.Pool` | `backend/src/config/db.js` |
| **Public Rate Limiting** | 60 requests/minute per client IP on public tree routes | `backend/src/middleware/rateLimit.middleware.js` |
| **AI Rate Limiting** | 20 requests/minute per authenticated user on EcoGuide chat | `backend/src/middleware/rateLimit.middleware.js` |
| **Error Masking** | Internal database errors & stack traces masked in production | `backend/src/middleware/error.middleware.js` |
| **CORS Policy** | Whitelisted origin support (single URL or comma-separated list) | `backend/src/config/index.js` |
| **Reverse Proxy Security** | Express `trust proxy` disabled by default (`false`) to prevent spoofing | `backend/src/app.js` |
| **Zero-PII to AI** | Prompt sanitizer strips emails, passwords, and database UUIDs | `backend/src/services/ai/promptBuilder.service.js` |

---

## 7. Database Architecture & Data Model

### Database Schema & Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ trees : "registers"
    users ||--o{ verifications : "reviews"
    users ||--o{ health_logs : "records"
    users ||--o{ rewards : "earns"
    trees ||--o{ verifications : "audited by"
    trees ||--o{ health_logs : "monitored by"
    trees ||--o{ rewards : "generates"

    users {
        uuid id PK
        varchar name
        varchar email UK
        varchar password_hash
        varchar role
        timestamptz created_at
        timestamptz updated_at
    }

    suitability_rules {
        uuid id PK
        varchar species_name UK
        numeric min_ph
        numeric max_ph
        numeric min_temperature
        numeric max_temperature
        numeric min_spacing_meters
        varchar sunlight_requirement
        int watering_frequency_days
        text notes
    }

    trees {
        uuid id PK
        varchar tree_id UK
        varchar species
        geometry location
        varchar photo_reference
        varchar status
        date planted_on
        uuid contributor_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    verifications {
        uuid id PK
        uuid tree_id FK
        uuid reviewer_id FK
        varchar previous_status
        varchar new_status
        text rejection_reason
        timestamptz timestamp
    }

    health_logs {
        uuid id PK
        uuid tree_id FK
        uuid submitted_by FK
        varchar health_status
        text notes
        varchar photo_reference
        timestamptz recorded_at
    }

    rewards {
        uuid id PK
        uuid user_id FK
        int points
        varchar reason
        uuid tree_id FK
        timestamptz created_at
    }

    knowledge_chunks {
        uuid id PK
        varchar source_id
        varchar document_title
        varchar document_version
        varchar section_heading
        int chunk_index
        text content
        varchar approval_status
        tsvector tsv_content
        timestamptz created_at
        timestamptz updated_at
    }

    schema_migrations {
        serial id PK
        varchar filename UK
        timestamptz applied_at
    }
```

### Spatial & Full-Text Search Indexes

1. **`idx_trees_location_gist`**: PostGIS GiST spatial index on `trees(location)` for bounding-box and distance queries.
2. **`uq_trees_tree_id`**: Partial unique index on `trees(tree_id) WHERE tree_id IS NOT NULL` allowing multiple `NULL` values for pending trees.
3. **`idx_knowledge_chunks_tsv`**: GIN inverted full-text search index on `knowledge_chunks(tsv_content)` for fast, index-accelerated RAG document matching.
4. **`idx_knowledge_chunks_unique_chunk`**: Unique composite constraint on `(source_id, document_version, chunk_index)` ensuring idempotent ingestion.
5. **Relational B-Tree Indexes**: Created on `trees(contributor_id)`, `trees(status)`, `verifications(tree_id)`, `health_logs(tree_id)`, and `rewards(user_id)`.

---

## 8. Development Journey & Verified Milestones

EcoRevive was developed across two major releases adhering to strict architecture freeze records:

### V1 Implementation (M1–M16)
- **M1–M4:** Express backend foundation, PostgreSQL + PostGIS integration, JWT authentication, and RBAC middleware.
- **M5–M8:** Plantation registration, spatial bounding box queries, Open-Meteo & SoilGrids integrations, and deterministic suitability assessment.
- **M9–M12:** Four-state verification workflow (`Pending`, `Under Review`, `Verified`, `Rejected`), sequential Tree ID issuance (`ER-PLT-XXXXX`), QR generation, caretaker health logging, rewards ledger, and dashboard aggregation.
- **M13–M16:** React SPA foundation, Leaflet map experience, verification review modals, public profile view, and full E2E user flows.

### V2 Implementation (V2-M0–V2-M6)
- **V2-M0:** Architecture Freeze & Zero-Billing Specification Record.
- **V2-M1:** AI Provider Abstraction (`AiProvider`, `MockAiProvider`, `GeminiAiProvider`, circuit breaker, deadline gate, zero-billing enforcement).
- **V2-M2:** EcoGuide Knowledge Assistant (PostgreSQL FTS, GIN indexing, approved corpus, prompt injection defense with XML tags).
- **V2-M3:** Authorized Live-Data Tools (5 server-side allowlisted read-only tools, role gate, UUID redaction, resource bounding).
- **V2-M4:** Deterministic Tree Health Intelligence (Severity model, monotonic trend calculation, 30-day freshness evaluation, rules-based follow-ups).
- **V2-M5:** Unified EcoGuide Orchestration (Multi-source knowledge + live data + health intelligence synthesis, tree ID context resolution, categorized source attribution badges).
- **V2-M6:** Release Readiness & Security Hardening (Public endpoint rate limiting, multi-origin CORS, reverse-proxy security, comprehensive regression validation).

### Verified Test & Quality Metrics

Automated integration test suites execute against real PostgreSQL 15+ and PostGIS database instances to validate schemas, spatial constraints, and transactional consistency. Focused unit test suites (such as AI foundation error handling and external weather/soil clients) utilize targeted Jest mocks to isolate external API boundaries deterministically.

#### 1. Historical Milestone Baselines
- **V1 Baseline (M16 Completion):** 18 backend suites (257 tests passed), 20 frontend files (107 tests passed), totaling 364 automated tests.
- **V2-M0 Architecture Freeze Baseline:** 18 backend suites (257 tests passed), 21 frontend files (111 tests passed), totaling 368 tests.
- **V2-M5 Integration Baseline:** 26 backend suites (405 tests passed), 22 frontend files (125 tests passed), totaling 530 tests.

#### 2. Newly Re-Verified Full-Stack Validation Results (Current Turn Execution)
The complete regression test suite, static analysis linters, database tools, and production bundler were directly executed and re-verified:

| Layer / Test Suite | Executed Command | Passed / Total | Pass Rate | Execution Duration | Status |
|---|---|:---:|:---:|:---:|:---:|
| **Backend Test Suite (Serial)** | `cd backend; npx jest --runInBand` | **409 / 409 tests** (26 suites) | **100%** | 14.01s | **PASS** |
| **Frontend Test Suite** | `npm --prefix frontend test` | **125 / 125 tests** (22 files) | **100%** | 15.50s | **PASS** |
| **Total Automated Tests** | *Full Stack Regression* | **534 / 534 tests** | **100%** | — | **PASS** |
| **Backend Static Analysis** | `npm --prefix backend run lint` | **0 errors, 0 warnings** | **100%** | ~2.8s | **PASS** |
| **Frontend Static Analysis** | `npm --prefix frontend run lint` | **0 errors, 0 warnings** | **100%** | ~3.2s | **PASS** |
| **Frontend Production Build** | `npm --prefix frontend run build` | **Clean Build** (Vite 5.4.21) | **100%** | 4.68s | **PASS** |
| **Database Migrations** | `npm --prefix backend run db:migrate` | **9 / 9 migrations applied** | **100%** | 0.5s | **PASS** |
| **Knowledge Corpus Ingestion** | `npm --prefix backend run db:ingest` | **8 / 8 chunks ingested** | **100%** | 0.4s | **PASS** |

---

## 9. Project Structure

```
EcoRevive/
├── backend/                              # Express.js REST API Backend
│   ├── src/
│   │   ├── config/                       # Database pool and environment configuration
│   │   │   ├── db.js                     # pg.Pool management & withTransaction helper
│   │   │   └── index.js                  # Centralized configuration loader
│   │   ├── controllers/                  # HTTP route controllers
│   │   │   ├── ai.controller.js          # EcoGuide chat endpoints
│   │   │   ├── auth.controller.js        # User auth (register, login, me)
│   │   │   ├── dashboard.controller.js   # Contributor & admin metrics
│   │   │   ├── environment.controller.js # Weather & soil endpoints
│   │   │   ├── health.controller.js      # Liveness health check
│   │   │   ├── healthIntelligence.controller.js # Tree health intelligence endpoints
│   │   │   ├── identity.controller.js    # Tree ID issuance & public profiles
│   │   │   ├── reward.controller.js      # Contributor points & ledger
│   │   │   ├── species.controller.js     # Species catalog
│   │   │   ├── suitability.controller.js # Suitability assessment
│   │   │   ├── tree.controller.js        # Plantation CRUD & spatial queries
│   │   │   ├── treeHealth.controller.js  # Caretaker health logs
│   │   │   └── verification.controller.js# Coordinator review workflow
│   │   ├── integrations/                 # External service clients & AI providers
│   │   │   ├── ai/                       # AI provider abstraction layer
│   │   │   │   ├── ai.factory.js         # Factory resolver (Mock vs Gemini)
│   │   │   │   ├── ai.interface.js       # Base AiProvider abstract class
│   │   │   │   ├── clientDisconnect.js   # Request cancellation listener
│   │   │   │   ├── gemini.provider.js    # Google AI Studio Free Tier adapter
│   │   │   │   └── mockAi.provider.js    # Offline deterministic mock provider
│   │   │   ├── openMeteo.provider.js     # Open-Meteo weather client
│   │   │   └── soilGrids.provider.js     # ISRIC SoilGrids client
│   │   ├── middleware/                   # Express middleware
│   │   │   ├── auth.middleware.js        # JWT Bearer verification
│   │   │   ├── error.middleware.js       # Centralized error handler & masking
│   │   │   ├── notFound.middleware.js    # 404 handler
│   │   │   ├── rateLimit.middleware.js   # Sliding-window rate limiters
│   │   │   ├── rbac.middleware.js        # Role-Based Access Control
│   │   │   └── upload.middleware.js      # Multer file upload handling
│   │   ├── repositories/                 # Parameterized SQL data access
│   │   │   ├── knowledge.repository.js   # PostgreSQL Full-Text Search (tsvector)
│   │   │   ├── healthIntelligence.repository.js # Tree observations & scoped queries
│   │   │   └── ...                       # Domain repositories
│   │   ├── routes/                       # Express route definitions
│   │   │   ├── ai.routes.js              # /api/v1/ai routes
│   │   │   ├── healthIntelligence.routes.js # /api/v1/health-intelligence routes
│   │   │   ├── public.routes.js          # /api/v1/public rate-limited routes
│   │   │   ├── v1.routes.js              # API v1 aggregator
│   │   │   └── index.js                  # Main API router
│   │   ├── services/                     # Business logic layer
│   │   │   ├── ai/                       # EcoGuide orchestration services
│   │   │   │   ├── ecoGuide.service.js   # Multi-source RAG orchestrator
│   │   │   │   ├── promptBuilder.service.js # XML framing & sanitization
│   │   │   │   ├── toolExecutor.service.js  # Tool dispatcher & boundary enforcement
│   │   │   │   └── toolRegistry.js       # Tool schemas & role gates
│   │   │   ├── healthIntelligence/       # Deterministic health intelligence
│   │   │   │   ├── followUp.service.js   # Rules-based recommendations
│   │   │   │   ├── healthIntelligence.service.js # Orchestration & scoping
│   │   │   │   ├── healthTrend.service.js# Monotonic trend calculation
│   │   │   │   └── monitoringStatus.service.js # 30-day freshness evaluation
│   │   │   └── ...                       # Domain business services
│   │   ├── tests/                        # 26 automated backend Jest test suites
│   │   ├── utils/                        # Response helpers, errors, JWT, QR
│   │   ├── app.js                        # Express app configuration
│   │   └── server.js                     # HTTP server listener & graceful shutdown
│   ├── .env.example                      # Backend environment template
│   └── package.json                      # Backend dependencies & npm scripts
├── frontend/                             # React 18 + Vite SPA
│   ├── src/
│   │   ├── api/                          # Axios / Fetch HTTP client wrapper
│   │   ├── components/                   # Modular UI components
│   │   │   ├── admin/                    # Verification queue & review modal
│   │   │   ├── common/                   # Spinners, alerts, 404
│   │   │   ├── dashboard/                # Metric cards & breakdown charts
│   │   │   ├── environment/              # Weather & soil metric panels
│   │   │   ├── health/                   # Health log form & history list
│   │   │   ├── home/                     # Lifecycle animation
│   │   │   ├── map/                      # Leaflet map & tree detail card
│   │   │   ├── navigation/               # Navbar & footer
│   │   │   ├── rewards/                  # Points card & activity ledger
│   │   │   ├── species/                  # Species selector dropdown
│   │   │   ├── suitability/              # Suitability score panel
│   │   │   └── trees/                    # Plantation form, list, QR card
│   │   ├── context/                      # React AuthContext provider
│   │   ├── pages/                        # Page-level route views
│   │   │   ├── AdminDashboardPage.jsx    # Admin metrics dashboard
│   │   │   ├── AdminVerificationsPage.jsx# Coordinator review queue
│   │   │   ├── DashboardPage.jsx         # Contributor personal dashboard
│   │   │   ├── EcoGuidePage.jsx          # Conversational assistant UI
│   │   │   ├── HomePage.jsx              # Landing & overview
│   │   │   ├── MapPage.jsx               # Interactive GIS canopy map
│   │   │   ├── MonitorPage.jsx           # Caretaker inspection interface
│   │   │   ├── PlantationPage.jsx        # Tree registration & list
│   │   │   ├── PublicTreeProfilePage.jsx # Unauthenticated public profile
│   │   │   └── RewardsPage.jsx           # Contributor rewards ledger
│   │   ├── routes/                       # AppRoutes, ProtectedRoute, RoleRoute
│   │   ├── services/                     # Frontend API client services
│   │   ├── test/                         # 22 frontend Vitest test files
│   │   ├── App.jsx                       # Root application component
│   │   ├── index.css                     # Tailwind CSS entry
│   │   └── main.jsx                      # DOM mount point
│   ├── .env.example                      # Frontend environment template
│   ├── package.json                      # Frontend dependencies & npm scripts
│   └── vite.config.js                    # Vite bundler configuration
├── database/                             # Database Migrations, Seeds & Ingestion
│   ├── knowledge/
│   │   └── corpus.js                     # Curated 8-chunk knowledge corpus
│   ├── migrations/                       # 9 sequential SQL migration scripts
│   │   ├── 001_enable_postgis.sql        # PostGIS extension initialization
│   │   ├── ...                           # Relational entity tables
│   │   ├── 008_create_spatial_and_relational_indexes.sql # GiST & B-tree indexes
│   │   └── 009_create_knowledge_chunks_table.sql # tsvector & GIN index
│   ├── seeds/
│   │   └── 001_suitability_rules_seed.sql# Native species suitability rules
│   ├── ingestKnowledge.js                # Repeatable knowledge ingestion script
│   ├── migrate.js                        # Transactional migration runner
│   └── seed.js                           # Seed runner script
├── docs/                                 # Architectural specifications & release reports
│   ├── EcoRevive_PRD_V2.0.md             # Product Requirements Document V2.0
│   ├── V2_M0_Architecture_Freeze_Record.md # Architecture Freeze Baseline
│   ├── EcoRevive_V2_Release_Readiness_Report.md # V2-M6 Final Handover Report
│   └── ...                               # Domain design documents
├── .env.example                          # Root environment template
└── README.md                             # Project Documentation
```

---

## 10. Installation & Local Setup Guide

### Prerequisites
- **Node.js:** `v18.0.0` or higher (tested on Node v20/v24).
- **npm:** `v9.0.0` or higher.
- **PostgreSQL:** `v15` or higher with the **PostGIS** extension pre-installed.
- **Git:** Standard Git CLI.

### Step-by-Step Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/Shane-06/EcoRevive.git
cd EcoRevive
```

#### 2. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

#### 3. Configure Environment Variables
Copy the `.env.example` templates in both `backend` and `frontend`:
```bash
# Backend environment configuration
cp backend/.env.example backend/.env

# Frontend environment configuration
cp frontend/.env.example frontend/.env
```

Review `backend/.env` and update the database connection string and secrets:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecorevive
JWT_SECRET=super_secret_development_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
AI_PROVIDER=mock
HEALTH_MONITORING_INTERVAL_DAYS=30
```

Review `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### Database Migrations, Seeds & Ingestion

#### 1. Create PostgreSQL Database
Create a PostgreSQL database named `ecorevive`:
```sql
CREATE DATABASE ecorevive;
```

#### 2. Run Database Migrations
Executes all 9 migrations sequentially inside transactions with tracking in `schema_migrations`:
```bash
npm --prefix backend run db:migrate
```

#### 3. Seed Species Suitability Rules
Seeds biological requirements for native species into `suitability_rules`:
```bash
npm --prefix backend run db:seed
```

#### 4. Ingest EcoGuide Knowledge Corpus
Ingests the 8 curated domain chunks into `knowledge_chunks` with stored `tsvector` generation:
```bash
npm --prefix backend run db:ingest
```

### Starting the Application

#### Start Backend in Development Mode
```bash
npm --prefix backend run dev
# Server listens on http://localhost:5000
# Health check available at http://localhost:5000/api/health
```

#### Start Frontend in Development Mode
```bash
npm --prefix frontend run dev
# Vite dev server runs at http://localhost:5173
```

### Running Tests & Build

```bash
# Run backend test suite (in-band to avoid parallel database races)
cd backend && npx jest --runInBand

# Run frontend test suite
cd ../frontend && npm test

# Run backend and frontend linters
npm --prefix backend run lint
npm --prefix frontend run lint

# Build frontend for production
npm --prefix frontend run build
```

---

## 11. Environment Variables Reference

### Backend Configuration (`backend/.env`)

| Variable Name | Type | Default Value | Description |
|---|---|---|---|
| `PORT` | Integer | `5000` | Port on which Express server listens |
| `NODE_ENV` | String | `development` | Runtime environment (`development`, `production`, `test`) |
| `DATABASE_URL` | String | `postgresql://...` | Connection URI for PostgreSQL with PostGIS enabled |
| `DB_POOL_MAX` | Integer | `20` | Maximum number of concurrent connections in PostgreSQL pool |
| `JWT_SECRET` | String | *(Required)* | Secret key used for signing and verifying Bearer JWT tokens |
| `JWT_EXPIRES_IN` | String | `7d` | Lifetime of signed authentication tokens (e.g., `7d`, `24h`) |
| `CORS_ORIGIN` | String | `http://localhost:5173` | Allowed CORS origins (single URL or comma-separated list) |
| `AI_PROVIDER` | String | `mock` | EcoGuide provider (`mock` for 100% offline, `gemini` for live) |
| `GEMINI_API_KEY` | String | `""` | Google AI Studio Free Tier API key (required only if `AI_PROVIDER=gemini`) |
| `AI_TIMEOUT_MS` | Integer | `10000` | Timeout per attempt in milliseconds for AI requests |
| `AI_OVERALL_DEADLINE_MS` | Integer | `25000` | Overall deadline gate across all AI retry and fallback attempts |
| `HEALTH_MONITORING_INTERVAL_DAYS` | Integer | `30` | Cadence in days before a tree observation becomes Overdue |

### Frontend Configuration (`frontend/.env`)

| Variable Name | Type | Default Value | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | String | `http://localhost:5000/api/v1` | Base URL prefix for backend REST API endpoints |

---

## 12. API Reference

All API routes (except system liveness checks) are namespaced under `/api/v1`.

### 1. Health & Discovery
- `GET /` — API service discovery and version metadata (Public).
- `GET /api/health` — System liveness, uptime, and database connectivity check (Public).

### 2. Authentication & Profile
- `POST /api/v1/auth/register` — Register a new contributor account (Public).
- `POST /api/v1/auth/login` — Authenticate credentials and receive Bearer JWT (Public).
- `GET /api/v1/auth/me` — Retrieve current authenticated user profile (Protected: Any authenticated role).

### 3. Plantations & Geospatial Trees
- `POST /api/v1/trees` — Submit a plantation record with GPS coordinates and evidence (Private: Contributor).
- `GET /api/v1/trees/mine` — List personal plantations registered by the user (Private: Contributor).
- `GET /api/v1/trees/map` — Retrieve verified trees inside a map bounding box viewport (Public).
- `GET /api/v1/trees/nearby` — Retrieve verified trees within a geographic radius (Public).
- `GET /api/v1/trees/:treeId/location` — Retrieve latitude/longitude of a verified tree (Public).

### 4. Environmental Ingestion & Suitability
- `GET /api/v1/environment` — Retrieve atmospheric weather and soil properties for coordinates (Public).
- `GET /api/v1/species` — Retrieve canonical catalog of native tree species (Public).
- `GET /api/v1/suitability` — Compute deterministic 4-state suitability assessment for coordinates (Public).

### 5. Verification Workflow
- `GET /api/v1/admin/verifications` — List plantation verification queue with status filters (Private: Admin).
- `PATCH /api/v1/admin/verifications/:treeId/start` — Start review (`Pending` → `Under Review`) (Private: Admin).
- `PATCH /api/v1/admin/verifications/:treeId/approve` — Approve plantation (`Under Review` → `Verified`, issues Tree ID) (Private: Admin).
- `PATCH /api/v1/admin/verifications/:treeId/reject` — Reject plantation with mandatory reason (Private: Admin).

### 6. Public Registry & QR Codes
- `GET /api/v1/public/trees/:treeId` — Retrieve sanitized public profile for a verified tree (Public, rate-limited: 60/min).
- `GET /api/v1/public/trees/:treeId/qr` — Retrieve public QR code payload and profile URL (Public, rate-limited: 60/min).

### 7. Health Observations & Tree Health Intelligence
- `POST /api/v1/trees/:treeId/health-logs` — Record a caretaker health observation on a verified tree (Private: Caretaker).
- `GET /api/v1/trees/:treeId/health-logs` — Retrieve chronological health observation history (Public).
- `GET /api/v1/health-intelligence` — Retrieve paginated health intelligence insights scoped to user (Private: Contributor, Caretaker, Admin).
- `GET /api/v1/health-intelligence/trees/:treeId` — Retrieve deterministic health trend, freshness, and suggestions for a single verified tree (Private: Scoped).

### 8. Rewards & Dashboards
- `GET /api/v1/rewards/me` — Retrieve contributor points balance and activity transaction history (Private: All roles).
- `GET /api/v1/dashboard/me` — Retrieve contributor dashboard summary and status breakdown (Private: Contributor).
- `GET /api/v1/admin/dashboard` — Retrieve platform-wide aggregate KPIs and review counts (Private: Admin).

### 9. EcoGuide Conversational Assistant
- `POST /api/v1/ai/chat` — Send a conversational query to EcoGuide with grounded RAG and tool execution (Private: Contributor, Caretaker, Admin, rate-limited: 20/min).

---

## 13. Limitations & Future Scope

To maintain rigorous engineering honesty, current operational boundaries and future scope are documented:

### Current Limitations
1. **In-Memory Rate Limiting:** The sliding-window rate limiters store request timestamps in Node.js process memory. In a multi-node horizontal deployment behind a load balancer, rate limits apply per container rather than across a shared cluster.
2. **Reverse-Proxy Configuration Dependency:** Express `trust proxy` is intentionally disabled by default (`false`) to prevent IP spoofing in unknown environments. Operators deploying behind reverse proxies (Nginx, AWS ALB, Cloudflare) must explicitly configure the trusted hop count or proxy CIDR blocks.
3. **Frontend Chunk Size:** The minified frontend bundle currently measures 534 kB (gzipped: 142 kB) due to bundling Leaflet GIS and QR rendering engines in the primary chunk.
4. **Offline Mobile Experience:** While the web interface is fully responsive on mobile devices, offline caching of photos in rural areas without cellular reception is not yet implemented.

### Future Scope (V3 Roadmap)
- **Distributed Rate Limiting:** Transition from in-memory sliding windows to Redis-backed distributed token buckets.
- **Dynamic Imports & Code Splitting:** Leverage React `lazy()` and Vite `manualChunks` to split mapping and QR scanner libraries into on-demand asynchronous bundles.
- **Offline Progressive Web App (PWA):** Service worker caching and background synchronization for field caretakers operating in remote forest zones.
- **Dense Vector Embeddings (`pgvector`):** Complement PostgreSQL full-text keyword search with semantic embedding retrieval via PostgreSQL `pgvector`.
- **Drone & Aerial Imagery Verification:** Integrate high-resolution orthomosaics and multispectral vegetation index layers (NDVI) into the interactive map view.

---

## 14. Documentation & References

### Architecture & Design Documents
- [EcoRevive PRD V2.0](docs/EcoRevive_PRD_V2.0.md) — Comprehensive product requirements and operational constraints.
- [V2-M0 Architecture Freeze Record](docs/V2_M0_Architecture_Freeze_Record.md) — Technical baseline, zero-billing design, and model freeze specifications.
- [V2-M3 Authorized Live-Data Tools Design](docs/V2_M3_Authorized_Live_Data_Tools_Design.md) — Tool schemas, role permissions, and boundary enforcement rules.
- [V2-M5 Unified EcoGuide Integration](docs/V2_M5_EcoGuide_Integration_Validation.md) — Multi-source orchestration and validation reports.
- [EcoRevive V2 Release Readiness Report](docs/EcoRevive_V2_Release_Readiness_Report.md) — Complete 18-section audit and operational runbook.

### Open-Source Technologies & External Services
- [PostgreSQL](https://www.postgresql.org/) & [PostGIS](https://postgis.net/)
- [React](https://react.dev/) & [Vite](https://vitejs.dev/)
- [Express.js](https://expressjs.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Leaflet](https://leafletjs.com/) & [OpenStreetMap](https://www.openstreetmap.org/)
- [Open-Meteo Weather API](https://open-meteo.com/)
- [ISRIC SoilGrids 2.0 API](https://www.isric.org/explore/soilgrids)
- [Google AI Studio](https://ai.google.dev/) (Free Tier)
