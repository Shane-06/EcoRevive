# EcoRevive 🌿

EcoRevive is a full-stack plantation lifecycle platform that helps record, verify, identify, monitor, and track planted trees using geospatial coordinates, backend-mediated environmental data, coordinator verification workflows, authoritative Tree IDs, QR-based public profiles, caretaker health logs, and deterministic impact rewards.

`React • Node.js • Express • PostgreSQL • PostGIS • Leaflet • Tailwind CSS`

---

## 1. Problem

Traditional plantation initiatives frequently emphasize the quantity of saplings planted rather than maintaining verifiable, long-term records of tree survival and ongoing care. Without a structured digital record, tracking ownership, verifying physical existence, observing post-planting health, and validating environmental outcomes becomes difficult and unreliable.

EcoRevive addresses this challenge by providing a structured digital lifecycle for each tree—from pre-planting environmental assessment to manual coordinator verification, authoritative identity issuance, continuous health monitoring, and transparent impact tracking.

---

## 2. Solution

- **Geospatial & Environmental Assessment**: Pinpoint prospective planting locations on an interactive map and evaluate local soil and weather conditions against native species requirements.
- **Plantation Registration**: Capture plantation records, geographic coordinates, planting dates, and photo evidence.
- **Coordinator Verification**: Enable manual administrative review workflows with audit logging and mandatory rejection reasons.
- **Authoritative Identity & QR**: Issue sequential, backend-generated Tree IDs (`ER-PLT-XXXXX`) and QR codes linking to privacy-safe public tree profiles upon verification approval.
- **Caretaker Health Monitoring**: Allow designated caretakers to perform on-site inspections and log physical health observations over time with server-authoritative timestamps.
- **Deterministic Rewards**: Automatically credit an immutable 50-point reward to contributors upon successful verification.

---

## 3. How EcoRevive Works

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

1. **DISCOVER**: Explore interactive map layers and find suitable planting sites.
2. **ASSESS**: Review atmospheric weather (Open-Meteo) and topsoil properties (ISRIC SoilGrids) evaluated by a deterministic suitability engine.
3. **PLANT**: Plant saplings in suitable locations adhering to spacing and biological constraints.
4. **PROVE**: Submit plantation details, coordinates, planting dates, and evidence photos.
5. **VERIFY**: Coordinators audit submissions in a dedicated verification queue (`Pending` → `Under Review` → `Verified`/`Rejected`).
6. **IDENTIFY**: The backend generates an authoritative Tree ID and QR code linking to a public verified tree profile.
7. **MONITOR**: Caretakers conduct on-site health inspections and submit chronological observations (`Healthy`, `Good`, `Needs Attention`, `Dead`).
8. **REWARD**: The backend issues exactly 50 impact points to the contributor upon verification approval.
9. **TRACK**: Contributors and administrators review performance metrics, plantation statuses, and audit histories across role-based dashboards.

---

## 4. Complete System Flow

```mermaid
flowchart TD
    Client[User / Browser] --> Frontend[React 18 + Vite Frontend]
    Frontend -->|HTTP / REST API| Backend[Express.js Modular Monolith API]

    subgraph Backend Services
        Backend --> Auth[Auth & RBAC Middleware]
        Backend --> Trees[Plantation & Tree Service]
        Backend --> Verify[Verification Service]
        Backend --> EnvService[Environmental Service]
        Backend --> SuitService[Suitability Engine]
        Backend --> Identity[Identity & QR Service]
        Backend --> Health[Health Monitoring Service]
        Backend --> Rewards[Reward Service]
        Backend --> Dashboards[Dashboard Aggregation Service]
    end

    subgraph External Integrations
        EnvService -->|REST API| OpenMeteo[Open-Meteo Weather API]
        EnvService -->|REST API| SoilGrids[ISRIC SoilGrids Soil API]
    end

    subgraph Persistence Layer
        Backend --> Database[(PostgreSQL 14+ / PostGIS)]
    end
```

> **Note**: External environmental providers (Open-Meteo and ISRIC SoilGrids) are accessed strictly through backend-mediated endpoints. The frontend never makes direct client-side calls to third-party APIs.

---

## 5. Key Features

### 🌍 Environmental & Map Experience
- **Interactive Map**: Pan, zoom, and explore verified trees across geospatial coordinates using Leaflet and OpenStreetMap.
- **Environmental Lookup**: Real-time atmospheric metrics (temperature, humidity, wind, daily min/max) and topsoil data (pH, texture, organic carbon, clay/sand/silt percentages).
- **Species Catalog**: Canonical biological requirements for 10 native tree species.
- **Deterministic Suitability**: 4-state rule-based evaluation (`Suitable`, `Moderate`, `Unsuitable`, `Insufficient Data`) based on soil pH, moisture, sunlight, and spatial spacing.

### 🌱 Plantation Management
- **Registration Form**: Client-side coordinate validation (`-90` to `90` lat, `-180` to `180` lng), species selection, planting dates, and photo evidence upload.
- **My Plantations**: Contributor workspace tracking submission states (`Pending`, `Under Review`, `Verified`, `Rejected`).

### 🔎 Manual Verification
- **Verification Queue**: Coordinator workspace filterable by status.
- **State Machine**: Strict lifecycle state transitions (`Pending` → `Under Review` → `Verified` or `Rejected`).
- **Audit Logging**: Captures reviewer ID, timestamp, transition state, and mandatory rejection reason.

### 🌳 Tree Identity & Public Profiles
- **Authoritative Tree ID**: Sequential identifier (`ER-PLT-XXXXX`) generated solely by the backend upon approval.
- **QR Identity**: Backend-generated QR data URL for field identification and direct public profile access.
- **Public Profile**: Privacy-safe profile displaying species, coordinates, plantation date, current health, and inspection history without leaking private credentials.

### 🌿 Health Monitoring
- **Caretaker Log Submission**: Field inspections restricted to verified trees using 4 frozen statuses: `Healthy`, `Good`, `Needs Attention`, `Dead`.
- **Chronological History**: Newest-first inspection logs with server-generated audit timestamps.
- **No Health Logs Default**: Displays *"No health record yet"* when observations are absent (never inferring *"Dead"*).

### 🏆 Rewards
- **Authoritative Points**: Exactly 50 points credited per verified plantation; health logs and administrative actions award 0 points.
- **Ledger & Pagination**: Paginated transaction history table (`/rewards`).

### 📊 Dashboards
- **Contributor Dashboard**: Personal KPI stat cards, plantation status breakdown, and recent reward activities.
- **Admin Dashboard**: Platform-wide aggregate metrics (total plantations by status, monitored trees, and points issued).

---

## 6. User Roles

| Role | Access Scope & Responsibilities |
| :--- | :--- |
| **Contributor** | Register plantations, track personal submission statuses, access contributor dashboard, and view earned reward points. |
| **Caretaker** | Conduct physical tree inspections and submit health logs on verified trees with permanent Tree IDs. |
| **Admin / Coordinator** | Review verification queue, start reviews, approve/reject plantation submissions, inspect audit trails, and view platform-wide analytics. |
| **Public (Unauthenticated)** | Browse interactive map, view verified tree markers, access public tree profiles, and view QR codes. |

---

## 7. Environmental Data & Suitability

EcoRevive V1 uses a transparent, deterministic suitability assessment engine based on environmental requirements for 10 native species:

- **Atmospheric Weather**: Retrieved on demand via Open-Meteo (temperature, relative humidity, wind speed, daily forecasts).
- **Soil Properties**: Retrieved via ISRIC SoilGrids REST API (topsoil pH 0–5cm, soil texture class, organic carbon density, sand/silt/clay fractions).
- **Geospatial Storage**: Tree coordinates stored as PostGIS `geometry(Point, 4326)` with spatial GiST indexing.
- **Deterministic Suitability Rules**:

```mermaid
flowchart TD
    Coords[Coordinates lat, lng + Species] --> FetchEnv[Backend Fetches Weather & Soil]
    FetchEnv --> RuleEngine[Deterministic Rule Engine]
    RuleEngine --> CheckSoil{Soil pH Compatible?}
    CheckSoil -->|No| Unsuitable[Unsuitable]
    CheckSoil -->|Yes| CheckTemp{Temperature Compatible?}
    CheckTemp -->|No| Moderate[Moderate]
    CheckTemp -->|Yes| CheckSpacing{Meets Minimum Spacing?}
    CheckSpacing -->|Yes| Suitable[Suitable]
    CheckSpacing -->|Missing Data| Insufficient[Insufficient Data]
```

> **Important**: EcoRevive V1 does **not** use AI/ML, probabilistic ranking, or artificial suitability scores. All evaluations are rule-based and provide clear informational notices indicating they do not replace on-site physical soil tests.

---

## 8. Verification & Identity Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending: Contributor Submits Plantation
    Pending --> Under_Review: Admin Starts Review
    Under_Review --> Rejected: Admin Rejects (Reason Required)
    Under_Review --> Verified: Admin Approves
    
    state Verified {
        [*] --> Generate_Tree_ID: Backend Atomic Transaction
        Generate_Tree_ID --> Issue_QR: Authoritative Identity Created
        Issue_QR --> Public_Profile: Available on Public Registry
    }
```

- **Tree ID Authority**: The permanent Tree ID is generated strictly by the backend PostgreSQL transaction during approval. The frontend never synthesizes, fabricates, or predicts Tree IDs.
- **Rejection Integrity**: Rejections require a mandatory explanation recorded in the verification audit table.

---

## 9. Health Monitoring & Rewards Flow

```mermaid
flowchart TD
    subgraph Health Workflow
        VTree[Verified Tree] --> CLog[Caretaker Submits Health Log]
        CLog --> HHistory[Chronological Health History Updated]
        HHistory --> PProfile[Public Profile Displays Latest Health]
    end

    subgraph Reward Workflow
        Approve[Plantation Verified by Admin] --> RewTx[Atomic Reward Event Created]
        RewTx --> Pts[+50 Points Issued to Contributor]
        Pts --> ContribDash[Reflected on Contributor Dashboard & Ledger]
    end
```

- **Server-Authoritative Timestamps**: Health log inspection timestamps (`recorded_at`) are created by the database server, not client browser clocks.
- **Zero Points for Health Logs**: Health monitoring is an observational responsibility; rewards are reserved strictly for approved plantations in V1.

---

## 10. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 | UI component rendering |
| **Build Tool** | Vite 5 | Fast development server & production bundler |
| **Language** | JavaScript (ESModules) | Application logic across frontend and backend |
| **Styling** | Tailwind CSS 3 | Utility-first responsive styling and themes |
| **Routing** | React Router 6 | Client-side routing with `ProtectedRoute` and `RoleRoute` |
| **Mapping** | Leaflet 1.9 + OpenStreetMap | Interactive geospatial map and viewport marker rendering |
| **Backend API** | Node.js + Express 4 | Modular monolith REST API |
| **Authentication** | JWT + bcryptjs | Token-based authentication and password hashing |
| **Database** | PostgreSQL 14+ | Relational persistence |
| **Spatial Engine** | PostGIS 3+ | Spatial geometry types, spatial indexing, and bounding queries |
| **Weather API** | Open-Meteo | Backend-mediated atmospheric data |
| **Soil API** | ISRIC SoilGrids 2.0 | Backend-mediated topsoil properties |
| **Testing** | Vitest, React Testing Library, Jest, Supertest | Automated frontend and backend unit/integration tests |
| **Code Quality** | ESLint | Static code analysis and linting |

---

## 11. Backend Architecture

The backend is structured as a modular monolith where each domain maintains clear separation of concerns (routes, controllers, services, and repositories):

```
backend/src/
├── config/              # Environment, DB pool, and integration configuration
├── controllers/         # HTTP request/response handlers
├── integrations/        # External provider clients (Open-Meteo, SoilGrids)
├── middleware/          # Auth (JWT), RBAC, error, not-found, and upload middlewares
├── repositories/        # Parameterized PostgreSQL & PostGIS queries
├── routes/              # Express API route modules (/api/v1/...)
├── services/            # Core business logic, suitability rules, and QR generator
├── utils/               # Custom error classes, response formatters, JWT helpers
├── app.js               # Express application configuration
└── server.js            # Server listener and graceful shutdown
```

---

## 12. Database Design

EcoRevive uses PostgreSQL with the PostGIS extension enabled:

- **Spatial Column**: `location geometry(Point, 4326)` on the `trees` table storing WGS84 longitude (X) and latitude (Y).
- **Spatial Index**: `idx_trees_location_gist` GiST index for fast bounding-box viewport and proximity queries (`ST_MakeEnvelope`, `ST_DWithin`).
- **Core Relational Tables**:
  - `users`: User profiles, hashed passwords, and roles (`contributor`, `caretaker`, `admin`).
  - `trees`: Plantation records, species, status, planting dates, contributor foreign key, and authoritative `tree_id`.
  - `verifications`: Audit log recording verification transitions, reviewer ID, timestamps, and rejection reasons.
  - `health_logs`: Chronological observations recorded by caretakers with frozen statuses.
  - `rewards`: Immutable impact points ledger linking awarded points to user IDs.
  - `suitability_rules`: Species biological requirements used by the deterministic rule engine.
  - `schema_migrations`: Version-tracked migration history.

---

## 13. Project Structure

```
EcoRevive/
├── backend/                  # Express.js REST API backend
│   ├── src/                  # Source code (routes, controllers, services, repositories)
│   ├── .env.example          # Backend environment variable template
│   └── package.json          # Backend dependencies and scripts
├── frontend/                 # React + Vite frontend application
│   ├── src/                  # Components, pages, hooks, services, context, routes
│   ├── .env.example          # Frontend environment variable template
│   └── package.json          # Frontend dependencies and scripts
├── database/                 # Database schema and seed management
│   ├── migrations/           # Sequential SQL migration files
│   ├── seeds/                # Initial species suitability rules seed data
│   ├── migrate.js            # Migration execution script
│   └── seed.js               # Seed execution script
├── docs/                     # Architecture, requirements, and design specifications
├── .env.example              # Root environment template
└── README.md                 # Project documentation
```

---

## 14. Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher (tested on Node v20/v24)
- **npm**: `v9.0.0` or higher
- **PostgreSQL**: `v14` or higher with **PostGIS** extension installed

### 1. Environment Configuration
Copy the environment template files in backend and frontend:

```bash
# In backend/
cp .env.example .env

# In frontend/
cp .env.example .env
```

Ensure your `backend/.env` contains your PostgreSQL connection details:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecorevive
JWT_SECRET=your_secure_development_jwt_secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

> **Note**: Open-Meteo and ISRIC SoilGrids APIs do not require API keys in EcoRevive V1.

### 2. Database Setup & Migrations
Create the database in PostgreSQL:
```sql
CREATE DATABASE ecorevive;
```

Run migrations and seed the native species rules:
```bash
cd backend
npm run db:migrate
npm run db:seed
```

### 3. Running the Application Locally

**Start the Backend**:
```bash
cd backend
npm run dev
# Backend starts on http://localhost:5000
```

**Start the Frontend**:
```bash
cd frontend
npm run dev
# Frontend starts on http://localhost:5173
```

Verify backend health at: [http://localhost:5000/api/health](http://localhost:5000/api/health)  
Access the web platform at: [http://localhost:5173](http://localhost:5173)

---

## 15. API Overview

| Route Group | Base Path | Key Operations |
| :--- | :--- | :--- |
| **System Health** | `GET /api/health`, `GET /api/v1/health` | Service uptime and database connectivity health check |
| **Authentication** | `/api/v1/auth` | User registration (`/register`), login (`/login`), profile (`/me`) |
| **Trees & Plantations** | `/api/v1/trees` | Create plantation (`POST /`), contributor list (`GET /mine`), map viewport (`GET /map`), nearby trees (`GET /nearby`) |
| **Environment** | `/api/v1/environment` | Query atmospheric weather and soil properties (`GET /?lat=...&lng=...`) |
| **Species & Suitability** | `/api/v1/species`, `/api/v1/suitability` | Species catalog (`GET /species`), deterministic evaluation (`GET /suitability`) |
| **Admin Verification** | `/api/v1/admin/verifications` | Review queue (`GET /`), start review (`PATCH /:id/start`), approve (`PATCH /:id/approve`), reject (`PATCH /:id/reject`) |
| **Public Tree Identity** | `/api/v1/public/trees` | Public profile (`GET /:treeId`), public QR payload (`GET /:treeId/qr`) |
| **Health Monitoring** | `/api/v1/trees/:treeId/health-logs` | Caretaker submission (`POST /`), chronological history (`GET /`) |
| **Rewards** | `/api/v1/rewards` | Contributor points balance & activity ledger (`GET /me`) |
| **Dashboards** | `/api/v1/dashboard`, `/api/v1/admin/dashboard` | User dashboard (`GET /dashboard/me`), admin dashboard (`GET /admin/dashboard`) |

---

## 16. Testing & Quality Assurance

EcoRevive V1 has been validated through automated test suites, static code analysis, and production build checks:

- **Frontend Tests**: **20 suites**, **107 tests passed** (Vitest + React Testing Library)
- **Backend Tests**: **18 suites**, **257 tests passed** (Jest + Supertest)
- **Code Linting**: **0 errors**, **0 warnings** across frontend and backend (`npm run lint`)
- **Production Build**: Clean production bundle generated via Vite (`npm run build`)

To run tests:
```bash
# Run backend test suite
cd backend && npm test

# Run frontend test suite
cd frontend && npm test
```

---

## 17. V1 Milestone Roadmap

| Milestone | Scope | Status |
| :---: | :--- | :---: |
| **M1** | Repository & Architecture Foundation | ✅ Complete |
| **M2** | Express Backend Foundation | ✅ Complete |
| **M3** | PostgreSQL + PostGIS Foundation | ✅ Complete |
| **M4** | Authentication & RBAC | ✅ Complete |
| **M5** | Tree & Plantation Registration Backend | ✅ Complete |
| **M6** | Map & Geospatial Backend | ✅ Complete |
| **M7** | Environmental Information Integration | ✅ Complete |
| **M8** | Deterministic Suitability Engine | ✅ Complete |
| **M9** | Manual Verification Workflow Backend | ✅ Complete |
| **M10** | Tree ID, QR & Public Profile Backend | ✅ Complete |
| **M11** | Health Monitoring Backend | ✅ Complete |
| **M12** | Rewards & Dashboard Backend | ✅ Complete |
| **M13** | Frontend Foundation & Auth Routing | ✅ Complete |
| **M14** | Frontend Map & Information Experience | ✅ Complete |
| **M15** | Frontend Plantation, Verification & Tree Identity Flow | ✅ Complete |
| **M16** | Health Monitoring UI + Final E2E Integration | ✅ Complete |

> *All planned V1 implementation milestones are complete.*

---

## 18. V1 Scope & Design Principles

- **Deterministic Logic**: V1 uses deterministic rule sets for species suitability and strictly avoids unverified AI/ML predictions.
- **Backend-Authoritative Identity**: The backend is the sole generator of authoritative Tree IDs, verification state transitions, and reward allocations.
- **Server Timestamps**: Audits and health log dates rely on database server clocks to prevent client-side timestamp spoofing.
- **Backend-Mediated APIs**: Third-party environmental data is fetched and normalized by the backend to prevent API key exposure and ensure data consistency.
- **Role-Based Boundaries**: Access control is enforced at both the React route layer (for user experience) and the Express middleware layer (for authoritative security).

---

## 19. Future Scope (V2)

The following areas are identified for potential future milestones beyond V1:

- Machine learning models for predictive tree growth and climate risk forecasting.
- Automated satellite or drone imagery analysis for canopy verification.
- Offline-first progressive web app (PWA) capabilities for remote field inspections.
- Native mobile applications (React Native / Android / iOS).
- Caretaker incentive structures and community recognition badges.

---

## 20. Documentation

Detailed technical specifications and design records are maintained in the [`docs/`](./docs) directory:

- [Product Requirements Document (PRD V1.0)](./docs/PRD_V1.0.md)
- [Software Requirements Specification (SRS V1.0)](./docs/SRS_V1.0.md)
- [System Architecture Specification V1.0](./docs/System_Architecture_V1.0.md)
- [Database Design Specification V1.0](./docs/Database_Design_V1.0.md)
- [API Specification V1.0](./docs/API_Specification_V1.0.md)
- [M8 Frozen Decision Record](./docs/M8_Frozen_Decision_Record.md)

---

## 21. Project Status

**EcoRevive V1 — Implementation Complete**

- All 16 planned milestones (M1–M16) implemented and verified.
- Complete full-stack test suites passing (364 total automated tests).
- Production build verified.
- Full local development stack operational.
