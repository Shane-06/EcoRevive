EcoRevive — System Architecture Specification
V1 Architecture Blueprint • August 2026
Purpose: freeze the architectural boundaries, module responsibilities, data flows, integration boundaries, security model, and deployment structure so implementation models do not redesign the system while coding.
1. Document Control
Field
Value
System
EcoRevive
Document
System Architecture Specification
Version
V1.0
Scope
Semester V1
Primary references
EcoRevive PRD V1.0; EcoRevive SRS V1.0; EcoRevive Project Proposal, August 2026
Architecture style
Three-tier web architecture with modular monolithic backend
Frontend
JavaScript + React.js + Vite + Tailwind CSS
Backend
JavaScript + Node.js + Express.js
Database
PostgreSQL + PostGIS
2. Architectural Authority
EcoRevive V1 shall use the architecture defined in this document unless the project owner explicitly approves an architectural change.
Backend shall remain a modular monolith; microservices are not part of V1.
Frontend shall communicate with the EcoRevive backend through REST APIs.
Frontend shall not directly call external environmental APIs.
PostgreSQL + PostGIS is the authoritative persistence layer for application data and tree spatial data.
Tree ID issuance is a backend/database responsibility and occurs after successful verification.
AI/ML is not an architectural dependency of V1.
If implementation details are unspecified, choose the simplest compatible implementation without changing externally visible behavior; if behavior changes, request approval.
3. Architectural Goals
Provide a reliable, maintainable full-stack architecture for a semester-scale pilot.
Keep business logic centralized and testable in the backend.
Make spatial data a first-class capability through PostGIS.
Provide a clean abstraction around external environmental data providers.
Separate authentication/authorization from business modules.
Keep verification auditable.
Keep Tree identity stable and privacy-safe.
Allow the frontend to evolve without coupling it directly to third-party APIs.
Support repeatable testing, CI, and staging deployment.
4. High-Level Architecture
                         ECOREVIVE V1 ┌─────────────────────────────────────────────────────────────┐ │                     CLIENT / FRONTEND                       │ │                                                             │ │ React + Vite + Tailwind CSS + React Router + JavaScript    │ │                                                             │ │ Map UI | Registration | Verification UI | QR | Dashboard   │ └─────────────────────────────┬───────────────────────────────┘                               │                         HTTPS / REST / JSON                               │                               ▼ ┌─────────────────────────────────────────────────────────────┐ │                  NODE.JS / EXPRESS BACKEND                  │ │                  MODULAR MONOLITH                            │ │                                                             │ │ API Routes → Controllers → Services → Repositories          │ │                                                             │ │ Auth/RBAC | Trees | Verification | Spatial/Map              │ │ Suitability | Environmental Integrations | Health           │ │ Rewards/Dashboard | Validation/Error Handling                │ └───────────────┬─────────────────────────────┬───────────────┘                 │                             │                 │ SQL / PostGIS               │ HTTPS                 ▼                             ▼ ┌───────────────────────────┐      ┌──────────────────────────┐ │ PostgreSQL + PostGIS      │      │ External Data Providers  │ │                           │      │                          │ │ Users | Trees | Verify    │      │ Weather | Soil | Terrain │ │ Rules | Health | Rewards  │      │ Land/Water where valid   │ │ Spatial indexes           │      └──────────────────────────┘ └───────────────────────────┘
5. Three-Tier Responsibility Model
Tier
Responsibilities
Must Not Do
Frontend / Presentation
Render UI, collect user input, map interaction, camera/QR interaction, call EcoRevive REST APIs, display normalized data.
Directly call external environmental APIs; own database logic; decide authorization; generate authoritative Tree IDs.
Backend / Application
Authentication, RBAC, validation, business rules, verification workflow, Tree ID lifecycle, spatial queries, external integrations, normalization, health/reward logic.
Delegate authorization to frontend; trust client-generated Tree IDs; fabricate external data.
Database / Persistence
Persistent application data, relationships, constraints, Tree location geometry, spatial indexes, history, uniqueness guarantees.
Contain provider-specific API behavior or UI concerns.
6. Frontend Architecture
6.1 Frontend Stack
JavaScript only; no TypeScript dependency.
React.js with Vite.
Tailwind CSS for styling.
React Router for application routing.
Leaflet for interactive mapping.
OpenStreetMap-based map data for map visualization.
Browser camera APIs for QR scanning.
A JavaScript QR library for QR generation/scanning.
6.2 Frontend Responsibilities
Area
Responsibility
Authentication UI
Login/registration forms and authenticated application state.
Map
Render Leaflet map, accept location selection, display backend-provided markers, request information for selected coordinates.
Registration
Collect plantation data and evidence, submit to backend, display validation/status.
Verification UI
Provide coordinator interface using backend verification APIs; frontend does not decide verification authority.
Tree profile
Display privacy-safe public tree information.
QR
Use browser camera to scan and navigate/resolve a tree identity; display generated QR where authorized.
Health
Allow authorized caretaker to submit health updates and view history where permitted.
Dashboard
Display backend-derived aggregate metrics.
7. Backend Architecture
7.1 Backend Style
The backend is a modular monolith: one deployable Node.js/Express application containing independently organized domain modules. Modules share the same application process and database but keep responsibilities separated.
backend/├── server.js├── config/├── middleware/├── routes/├── controllers/├── services/├── repositories/├── integrations/├── models/              (if used by selected DB approach)├── utils/└── tests/
7.2 Module Responsibilities
Module
Primary Responsibility
Auth
Registration, login, password hashing integration, JWT handling.
RBAC / Authorization
Server-side role checks and protected-operation enforcement.
Tree / Plantation
Plantation creation, retrieval, status, tree data orchestration.
Verification
Review queue, state transitions, audit records.
Tree Identity
Post-verification Tree ID generation, uniqueness coordination, QR identity.
Spatial / Map
Coordinate validation, PostGIS queries, nearby search, viewport/map-area retrieval.
Environmental Integration
Provider adapters, external calls, normalization, source metadata, failure handling.
Suitability
Deterministic species-rule comparison and explainable result construction.
Health
QR-resolved tree monitoring, health-log creation and history.
Rewards / Dashboard
Verified activity points and aggregate reporting.
Infrastructure
Configuration, database connection, middleware, logging/error handling.
7.3 Layer Responsibilities
Layer
Responsibility
Example
Route
HTTP method/path and middleware composition.
POST plantation registration
Controller
Translate HTTP request into application operation and response.
Validate request context; call Tree service
Service
Business rules and orchestration.
Verification transition; Tree ID lifecycle
Repository
Database persistence/query operations.
Spatial query; tree lookup
Integration Adapter
Provider-specific external API communication.
Open-Meteo adapter
Normalizer
Convert provider-specific response to EcoRevive format.
Weather response normalization
Middleware
Cross-cutting HTTP concerns.
JWT authentication, RBAC, validation, error handling
8. Database Architecture
8.1 Database Technology
PostgreSQL is the primary relational database.
PostGIS extension must be enabled.
Tree location is represented as spatial point geometry.
Spatial indexes should use GiST where appropriate.
Database constraints must protect identity and relationship integrity.
Detailed schema is frozen separately in the Database Design document.
8.2 Core Data Domains
Users  │  ├───────────────┐  │               │  ▼               ▼Trees ───────► Verification  │  └──────────► HealthLogsSuitabilityRules ──► Suitability ServiceUsers ──► RewardsTrees + Verification + HealthLogs + Rewards ──► Dashboard
8.3 Spatial Data Model
Tree records contain a geographic point representing plantation location.
The database must use a documented, consistent SRID.
Application-level APIs should expose normalized latitude/longitude rather than forcing frontend clients to understand database geometry syntax.
Spatial distance/containment/viewport operations should execute in PostGIS rather than application-side loops.
Representative spatial queries must be covered by automated tests.
9. External Integration Architecture
React Frontend     │     │ coordinates / request     ▼EcoRevive Express API     │     ▼Environmental Integration Service     │     ├── Weather adapter     ├── Soil adapter     ├── Terrain adapter     ├── Land-use adapter (if verified source available)     └── Water adapter (if verified source available)     │     ▼Provider response     │     ▼Normalizer + source metadata     │     ▼Application-level response     │     ▼React Frontend
Provider-specific URLs, parameters, response formats, and credentials belong inside integration adapters/configuration.
Frontend must not call providers directly.
Integration failures must return controlled unavailable/limited-data states.
Provider responses must be normalized before reaching the frontend.
Source and verification date should be preserved where applicable.
Do not invent values when a provider cannot supply a reliable value.
10. Core Request/Data Flows
10.1 Interactive Map Flow
User opens map     ↓React initializes Leaflet     ↓Frontend requests map markers / area data     ↓Express route     ↓Spatial controller     ↓Tree/Spatial service     ↓PostGIS viewport query     ↓Normalized marker response     ↓Leaflet renders markers
10.2 Location Assessment Flow
User selects map location     ↓Frontend sends coordinates to backend     ↓Coordinate validation     ↓Environmental integration service     ↓Weather / Soil / Terrain / available land-water data     ↓Normalization + source metadata     ↓Suitability service     ↓Species-rule comparison     ↓Explainable assessment response     ↓Frontend information panel
10.3 Plantation Registration Flow
Contributor    ↓Registration form    ↓Frontend validation    ↓POST to backend    ↓Authentication + authorization    ↓Input + coordinate validation    ↓Tree/Plantation service    ↓Database    ↓Status = Pending    ↓Response to contributor
10.4 Verification Flow
Pending  ↓Coordinator opens review  ↓Under Review  ↓Manual evidence/information review  ├───────────────┐  ▼               ▼Verified        Rejected  │               │  │               └── reason + audit record  ▼Tree identity eligible
10.5 Tree ID / QR Flow
Verified tree     ↓Tree Identity Service     ↓Generate unique Tree ID     ↓Database uniqueness protection     ↓Associate ID with tree     ↓Generate/serve QR identity     ↓Public Tree Profile
The architecture does not permit a frontend-generated permanent Tree ID.
10.6 QR Health Flow
Caretaker opens scanner     ↓Browser camera + QR library     ↓Tree ID / public identifier     ↓Backend tree resolution     ↓Authentication + caretaker authorization     ↓Health submission     ↓Health service     ↓Append HealthLog     ↓Tree health history
11. Authentication and Authorization Architecture
Client  │ JWT  ▼Authentication Middleware  │  ├── valid? ── no ──► reject  │  ▼Authenticated User Context  │  ▼RBAC Middleware  │  ├── allowed? ── no ──► reject  │  ▼Controller / Service
Authentication uses JWT as specified by the SRS.
Backend is authoritative for role enforcement.
Frontend role state is for UI behavior only and must not be trusted for security.
Admin/coordinator verification actions require server-side authorization.
Caretaker health actions require the appropriate authorization.
Public profile access is intentionally separate from private account access.
12. Tree Identity Architecture
Concern
Architectural Rule
Creation trigger
Successful verification.
Authority
Backend service + database uniqueness constraints.
Uniqueness
Database-backed uniqueness guarantee.
Stability
Tree ID does not change during normal lifecycle.
QR payload
Tree ID or public profile URL/identifier only.
Privacy
No email, phone, password, JWT, or private account data.
Public lookup
Public profile may resolve through safe identifier.
13. Verification State Machine
                 ┌────────────────┐                 │     Pending    │                 └───────┬────────┘                         │ coordinator starts review                         ▼                 ┌────────────────┐                 │  Under Review  │                 └───────┬────────┘                         │              ┌──────────┴──────────┐              ▼                     ▼       ┌────────────┐        ┌────────────┐       │  Verified  │        │  Rejected  │       └────────────┘        └────────────┘              │              ▼        Tree ID eligible
Only authorized coordinators can perform state transitions.
Every decision creates auditable reviewer/timestamp information.
Rejection reason is retained.
Resubmission/re-review behavior is not defined by this architecture and requires a separate approved decision.
14. Suitability Architecture
Location coordinates      ↓Environmental data      ↓Normalized environmental model      +SpeciesRule data      ↓Suitability Service      ↓Component checks      ↓Explainable result
Suitability service is deterministic.
No machine-learning model is required.
Missing environmental input is represented as unavailable/insufficient rather than fabricated.
The service must not grant legal plantation permission.
15. Health Monitoring Architecture
HealthLog is append-oriented so previous monitoring events remain available.
Health status is associated with a specific Tree ID/tree record.
Photo is stored through a media reference rather than embedding large binary content directly in the relational record unless the approved database design explicitly chooses otherwise.
Monitoring history is queryable in chronological order.
Missing health records do not imply death.
16. Media / Photo Architecture
Frontend   ↓ multipart/upload requestBackend   ↓Media validation / storage adapter   ↓Object/media storage   ↓Stored media reference   ↓Tree / HealthLog record
The exact object-storage provider is intentionally not frozen by this architecture because the project SRS identifies storage as an implementation decision.
Storage credentials must remain server-side.
Database records should retain references/URLs/keys rather than unnecessarily storing large image binaries.
Accepted file types, size limits, image processing, and exact storage provider must be frozen in the API/implementation specification before coding that feature.
17. Error Handling Architecture
Request  ↓Route  ↓Validation / Auth / RBAC  ↓Controller  ↓Service  ↓Repository / Integration  ↓Error  ↓Central error handler  ↓Safe normalized API error
Errors should have stable application-level categories.
Production responses must not expose stack traces, secrets, database credentials, or unnecessary internal details.
External-provider failure must not crash unrelated application modules.
Validation errors should identify the affected input where appropriate.
18. API Boundary Architecture
Boundary
Rule
Frontend → Backend
REST/JSON over HTTPS; authentication as required.
Backend → PostgreSQL
Database driver/repository layer; no frontend database access.
Backend → External APIs
Server-side integration adapters only.
Public → Tree profile
Safe public identifier; no private user information.
Frontend → QR camera
Browser camera API; result is passed to application logic.
19. Security Architecture
Passwords are hashed.
Secrets are environment/configuration based and excluded from Git.
JWT authentication protects private APIs.
RBAC protects role-specific APIs.
Backend validates all security-sensitive input.
Frontend is never trusted for role authorization.
Frontend is never trusted for Tree ID uniqueness.
Public profiles are privacy-safe.
QR payload contains no private credentials.
External API credentials, if any, are never exposed to the browser.
20. Performance and Scalability Architecture
Use database indexes for common relational lookups.
Use GiST spatial indexes for appropriate PostGIS queries.
Use pagination for potentially large tree and health-log listings.
Keep backend APIs stateless at the application layer where practical.
Use caching for external environmental data where appropriate, without compromising source/verification clarity.
Do not claim enterprise-scale capacity; architecture is intended for a semester pilot and is theoretically scalable through standard indexing, stateless APIs, and modularity.
21. Deployment Architecture
Developer   │   ▼GitHub Repository   │   ├── GitHub Actions   │      ├── install   │      ├── build   │      ├── lint   │      └── backend tests   │   ▼Staging / Hosting   │   ├── Frontend hosting   ├── Backend hosting   └── Managed PostgreSQL + PostGIS
Frontend and backend may be deployed separately while remaining logically connected through REST APIs.
Database should use a managed PostgreSQL/PostGIS service where feasible.
Environment variables hold deployment-specific configuration.
CI must validate changes before/around staging deployment according to the selected GitHub workflow.
22. Environment Configuration
Configuration Type
Location/Rule
Database URL/credentials
Server environment variables only.
JWT secret
Server environment variable only.
External API keys
Server environment variables only, if provider requires keys.
Frontend public configuration
Only non-secret values may be exposed to the frontend build.
Environment distinction
Development, test, and staging configuration should be separable.
23. Observability and Auditability
Verification events must be persisted for auditability.
Tree status changes relevant to verification must be traceable through verification records.
Health logs retain timestamp and submitting-user attribution.
Application errors should be logged server-side without exposing sensitive information to clients.
External data should carry source/verification metadata where applicable.
24. Architecture-Level Constraints
Constraint
Mandatory Decision
Language
JavaScript for frontend and backend.
Frontend
React + Vite + Tailwind CSS.
Backend
Node.js + Express.js.
Architecture
Modular monolith, not microservices.
Database
PostgreSQL + PostGIS.
Map
Leaflet + OpenStreetMap-based data.
Weather
Open-Meteo or suitable equivalent.
Soil
ISRIC SoilGrids.
QR
Browser camera + JavaScript QR library.
External API access
Backend only.
AI
No V1 dependency.
25. Architecture Decisions That Must Not Be Changed Silently
Do not replace PostgreSQL/PostGIS with MongoDB or another database.
Do not replace the modular monolith with microservices for V1.
Do not introduce TypeScript as a required project language.
Do not make React call environmental APIs directly.
Do not make frontend-generated Tree IDs authoritative.
Do not issue permanent Tree IDs before verification.
Do not expose private user information through public tree profiles or QR payloads.
Do not introduce AI as a hidden dependency for suitability or verification.
Do not treat missing environmental data as a reason to fabricate values.
Do not implement legal-permission decisions as if EcoRevive were an authority.
26. Architecture Testing Strategy
Architecture Area
Verification
Frontend/backend boundary
API integration tests / browser flow tests.
RBAC
Role-based authorization tests.
PostGIS
Spatial storage, distance, nearby, viewport tests.
External integrations
Provider success/failure normalization tests.
Suitability
Deterministic unit tests.
Verification
State transition tests and audit-record tests.
Tree ID
Uniqueness, post-verification trigger, stability tests.
QR
Payload/privacy tests.
Health
Append/history/authorization tests.
CI
Automated build, lint, and backend test execution.
27. Architecture Definition of Done
Frontend, backend, and database boundaries are implemented according to this document.
Backend is a modular monolith with separated domain responsibilities.
PostgreSQL/PostGIS is connected and spatial operations are working.
Tree locations are stored and queried spatially.
External environmental data flows only through backend integration adapters.
Map marker and map-area/nearby flows work end-to-end.
Authentication and RBAC are enforced server-side.
Verification state transitions are auditable.
Verified trees receive stable unique Tree IDs through backend/database logic.
QR/public profile flow does not expose private information.
Health logs are persistent and historical.
Core architecture tests pass.
CI builds/tests/lints the application.
Any implementation choice not frozen by this document is explicitly recorded before it becomes an externally visible behavior.
28. Relationship to Other Project Documents
Document
Purpose
Authority Relationship
PRD
Product goals, scope, users, product requirements, V1/V2 boundary.
Product source of truth.
SRS
Detailed software requirements and testable behaviors.
Functional/software requirement source of truth.
System Architecture
Architecture boundaries, modules, flows, deployment, integration rules.
Architecture source of truth.
Database Design
Exact schema, relationships, constraints, indexes, PostGIS details.
Database implementation source of truth.
API Specification
Exact REST endpoints and JSON contracts.
API contract source of truth.
Testing Strategy
Test cases, fixtures, coverage strategy, CI validation.
Testing source of truth.
Milestone Roadmap
Controlled build order and GitHub checkpoints.
Execution source of truth.
29. Open Architectural Decisions
The following are intentionally not guessed because they were not fully frozen in the PRD/SRS:
Exact backend ORM/query library versus parameterized SQL/repository approach.
Exact migration framework.
Exact media/object-storage provider.
Exact JWT expiry and refresh-token strategy.
Exact API gateway/reverse-proxy configuration, if any.
Exact hosting provider.
Exact external terrain/DEM, land-use, and water providers after availability verification.
Exact logging/monitoring provider.
Exact frontend state-management library, if one is needed beyond React's built-in mechanisms.
These choices may be selected later as implementation decisions if they preserve the architecture and product behavior. They must not be used to redesign the system without approval.
30. Canonical End-to-End Architecture
DISCOVER  React + Leaflet      ↓  location selection      ↓ASSESS  Express      ↓  environmental adapters      ↓  normalized environmental data      ↓  suitability service + species rules      ↓PLANT / PROVE  registration API      ↓  PostgreSQL + PostGIS      ↓  Pending      ↓VERIFY  coordinator + verification service      ↓  Verified      ↓IDENTIFY  Tree Identity Service      ↓  unique Tree ID      ↓  QR / Public Profile      ↓MONITOR  browser camera      ↓  Tree ID resolution      ↓  health service      ↓  HealthLog history      ↓TRACK / REWARD  dashboard + rewards
31. Final Architectural Rule
EcoRevive should be implemented as a stable, testable workflow system first and an intelligent system later. The V1 architecture exists to establish trustworthy structured data, spatial capabilities, manual verification, persistent tree identity, and monitoring history. V2 intelligence must be layered on top of this foundation rather than changing its core lifecycle.