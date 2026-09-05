EcoRevive — Software Requirements Specification (SRS)
Detailed V1 Engineering Specification • August 2026
Purpose: translate the approved EcoRevive PRD into precise, testable software requirements without inventing product behavior.
1. Document Control
Field
Value
System
EcoRevive
Document
Software Requirements Specification (SRS)
Version
V1.0
Scope
Semester V1
Source of truth
EcoRevive PRD V1.0 + EcoRevive Project Proposal, August 2026
Architecture constraint
Three-tier system with modular-monolithic Node.js/Express backend
Database constraint
PostgreSQL with PostGIS
Language constraint
JavaScript for frontend and backend
2. SRS Authority and Anti-Hallucination Rules
Requirements in this SRS are implementation constraints for V1. A coding model must not invent a different product behavior.
If the PRD and SRS conflict, stop and flag the conflict to the project owner; do not silently choose one.
If this SRS does not define a product behavior, classify it as an open implementation decision rather than a requirement.
Implementation details may be chosen only when they do not change externally visible behavior or violate the fixed stack and architecture.
V1 must work without AI/ML.
External environmental services must be accessed through the backend, never directly from the React frontend.
Environmental information must not be fabricated when unavailable.
Permanent Tree ID issuance requires successful verification.
Public tree profiles must not expose private contact information or authentication secrets.
Legal plantation permission is outside the system's authority.
3. System Purpose and Scope
EcoRevive manages the digital lifecycle of a planted tree: location discovery, site/environmental assessment, plantation registration, evidence submission, manual verification, verified Tree ID and QR identity, health monitoring, rewards, and aggregate tracking.
3.1 V1 Scope
Authentication and role-based access.
Interactive map with location selection and plantation markers.
Backend-mediated environmental information.
Rule-based suitability assessment covering at least 10 species.
Plantation registration with photo evidence.
Manual verification workflow.
Tree ID generation after verification.
QR-linked public tree profile.
QR-based health monitoring.
Basic rewards and dashboard.
Automated backend tests, linting, CI, and staging deployment.
3.2 V1 Non-Goals
AI-assisted evidence verification.
Computer-vision tree-health analysis.
Predictive survival analysis.
AI-based species recommendation.
AI-based duplicate/fraud detection.
Automated caretaker reminders/notifications.
Advanced geospatial analytics.
Enterprise-scale capacity.
Native mobile application.
Legal authorization or plantation permission issuance.
4. Actors and Permissions
Actor
Allowed Capabilities
Restricted Capabilities
Public visitor
View privacy-safe verified public tree profiles
No private account access; no protected actions
Contributor
Register plantations; view own records; receive rewards
Cannot verify unless separately authorized as coordinator
Caretaker
Scan QR; create health updates for trees they are authorized to monitor
Cannot perform coordinator verification
Admin/Coordinator
Review submissions; approve/reject; manage reports/system records
Must use authenticated authorized role
A user may have caretaker and contributor responsibilities; role assignment/permission enforcement must remain explicit in the authorization layer.
5. System Architecture Requirements
React + Vite frontend        │        │ REST/JSON        ▼Node.js + Express modular monolith        │        ├── Authentication / RBAC        ├── Tree / Registration        ├── Verification        ├── Suitability        ├── Map / Spatial        ├── Environmental Integrations        ├── Health        └── Rewards / Dashboard        │        ├──────────────► External environmental services        │                (backend only)        ▼PostgreSQL + PostGIS
Frontend uses React.js, Vite, Tailwind CSS and JavaScript.
Backend uses Node.js, Express.js and JavaScript.
Backend is a modular monolith; microservices are not required for V1.
PostgreSQL is the relational database and PostGIS provides spatial functionality.
Frontend-to-backend communication uses REST/JSON.
External API responses must be normalized into application-level responses before reaching the frontend.
6. Functional Requirements
ID
Requirement
Specification
Category
SRS-AUTH-01
Registration
System shall allow a user to create an account using the fields approved by the final API/data specification.
Authentication
SRS-AUTH-02
Login
System shall authenticate valid credentials and issue the configured JWT authentication mechanism.
Authentication
SRS-AUTH-03
Password Security
System shall store password hashes rather than plaintext passwords.
Security
SRS-AUTH-04
Authentication Middleware
Protected backend operations shall require valid authentication.
Security
SRS-RBAC-01
Role Authorization
System shall enforce Contributor, Caretaker, and Admin/Coordinator permissions.
Authorization
SRS-RBAC-02
Admin Protection
Verification/admin operations shall reject unauthorized roles.
Authorization
SRS-MAP-01
Map Display
Frontend shall display an interactive Leaflet map using OpenStreetMap-based map data.
Map
SRS-MAP-02
Location Selection
User shall be able to select a potential plantation location on the map.
Map
SRS-MAP-03
Coordinate Validation
Backend shall validate received geographic coordinates before using them for spatial operations.
Map
SRS-MAP-04
Spatial Storage
Tree locations shall be stored using PostGIS point geometry.
Database
SRS-MAP-05
Nearby Query
Backend shall support spatial queries for trees near a supplied location.
Spatial
SRS-MAP-06
Map-Area Query
Backend shall support retrieving tree markers for a map viewport/bounding area.
Spatial
SRS-MAP-07
Spatial Index
Database shall use an appropriate spatial index for representative tree-location queries.
Database
SRS-ENV-01
Environmental Lookup
Backend shall retrieve available environmental/geographic information for a selected location.
Integration
SRS-ENV-02
Backend Proxy
Frontend shall not directly call external environmental APIs.
Architecture
SRS-ENV-03
Normalization
Backend shall normalize external responses into EcoRevive application-level structures.
Integration
SRS-ENV-04
Source Reference
Displayed external information shall identify its source and verification date where applicable.
Data Integrity
SRS-ENV-05
Unavailable Data
Unavailable external information shall produce an explicit unavailable/limited-data state, not fabricated values.
Data Integrity
SRS-SUIT-01
Rule Engine
System shall compare location/environment inputs against species-specific deterministic rules.
Suitability
SRS-SUIT-02
Species Coverage
V1 shall support at least the 10 proposal seed species.
Suitability
SRS-SUIT-03
Explainability
Suitability output shall expose component-level compatibility/mismatch information when inputs permit.
Suitability
SRS-SUIT-04
No AI Dependency
Suitability shall operate without AI/ML.
Scope
SRS-TREE-01
Registration
Authenticated contributor shall submit species, location, planting date, photo evidence, and optional notes.
Registration
SRS-TREE-02
Initial Status
New plantation registration shall start in Pending status.
Workflow
SRS-TREE-03
Attribution
Registration shall retain submitting-user attribution.
Audit
SRS-VER-01
Review Queue
Authorized coordinator shall retrieve registrations requiring review.
Verification
SRS-VER-02
Review Transition
Authorized coordinator shall transition Pending records to Under Review.
Verification
SRS-VER-03
Approval
Authorized coordinator shall transition an eligible record to Verified.
Verification
SRS-VER-04
Rejection
Authorized coordinator shall transition an eligible record to Rejected and record a reason.
Verification
SRS-VER-05
Audit
Verification shall record reviewer, decision, timestamp, and reason where applicable.
Audit
SRS-ID-01
Tree ID Trigger
Permanent Tree ID generation shall occur after successful verification.
Identity
SRS-ID-02
Tree ID Uniqueness
Each verified tree shall have a unique Tree ID.
Identity
SRS-ID-03
Tree ID Stability
Once assigned, the Tree ID shall remain stable for the tree lifecycle.
Identity
SRS-ID-04
Backend Authority
Tree ID uniqueness and issuance shall be controlled by backend/database logic, not the frontend.
Identity
SRS-QR-01
QR Payload
QR shall contain only a Tree ID or public profile URL/identifier.
Privacy
SRS-QR-02
No Private Data
QR shall never encode phone, email, password, JWT, or private account information.
Privacy
SRS-PUB-01
Public Profile
Verified tree shall expose a privacy-safe public profile.
Public Access
SRS-PUB-02
Profile Data
Profile may show Tree ID, species, plantation date, verified status, approximate location, public contributor identity, current health, and health history.
Public Access
SRS-HEALTH-01
QR Scan
Caretaker shall be able to identify a tree using browser camera QR scanning.
Monitoring
SRS-HEALTH-02
Health Log
Authorized caretaker shall be able to submit health status, photo, timestamp, notes, and submitting-user attribution.
Monitoring
SRS-HEALTH-03
History
Health updates shall remain available as a chronological history.
Monitoring
SRS-HEALTH-04
No Death Inference
Missing health updates shall not be interpreted as evidence of death.
Monitoring
SRS-REWARD-01
Rewards
Verified activities shall contribute to configured points/basic badges.
Rewards
SRS-DASH-01
Dashboard
Dashboard shall aggregate verified plantations, verification status, health status, and basic reward information.
Reporting
SRS-TEST-01
Automated Tests
Core backend behavior shall have meaningful automated tests.
Quality
SRS-TEST-02
CI
GitHub Actions shall automatically build/test/lint the project on configured changes.
CI
7. Detailed Workflow Specifications
7.1 Plantation Registration Workflow
Contributor → Select Location → Enter Plantation Data → Upload Evidence → Submit → Pending
User must be authenticated as a contributor-capable account.
User selects or adjusts a plantation location.
Client sends plantation data to backend.
Backend validates authentication, input, coordinates, and required fields.
Backend stores the plantation record and evidence reference.
New record is assigned Pending status.
System returns the created record/status to the frontend.
7.2 Verification Workflow
Pending → Under Review → Verified
                         ↘ Rejected
Coordinator retrieves pending submissions.
Coordinator starts review; record becomes Under Review.
Coordinator inspects submitted information/evidence.
Coordinator either approves or rejects.
System stores reviewer, decision, timestamp, and rejection reason where applicable.
Only a Verified record becomes eligible for permanent Tree ID issuance.
7.3 Tree Identity Workflow
Verified → Generate Tree ID → Generate/Expose QR → Public Profile
Backend detects/executes the verified-tree identity step.
System creates a unique Tree ID under database/backend authority.
System associates Tree ID with exactly one tree.
QR encodes only safe public identifier information.
Public profile becomes accessible through the Tree ID/QR.
7.4 Health Monitoring Workflow
Scan QR → Resolve Tree → Check Permission → Submit Health Log → Append History
Caretaker scans the QR code using browser camera capability.
System resolves the Tree ID/public profile.
Authenticated caretaker submits a health update.
Backend validates authorization and payload.
System appends a HealthLog record.
Tree health history is returned in chronological form.
8. State Models
8.1 Plantation Status
State
Meaning
Allowed Next States
Pending
Submitted and awaiting review
Under Review
Under Review
Coordinator is reviewing
Verified, Rejected
Verified
Approved plantation with verified status
Monitoring/health logging; no normal reversal defined by this SRS
Rejected
Coordinator rejected submission
No automatic transition defined; any resubmission/re-review behavior requires explicit implementation decision
The SRS does not invent a resubmission workflow. If required, the project owner must approve it.
9. Data Requirements
Entity
Required Concept
Integrity Requirements
User
Identity, name, contact, role, authentication data
Unique account identity; password stored as hash; role authorization enforced
Tree
Database id, Tree ID, species, PostGIS point, photo reference, status, planted date, contributor, verifying coordinator as applicable
Tree ID unique after issuance; location spatially valid
Verification
Tree reference, reviewer, decision, timestamp, reason
Reviewer and decision auditable
SuitabilityRule
Species, soil type, minimum spacing, sunlight, water requirement, climate/region as applicable
Rules are deterministic and documented
HealthLog
Tree reference, submitted-by, health status, photo, timestamp, notes
Historical/append-oriented; prior records preserved
Reward
User reference, points, activity, timestamp
Activity attributable to user
10. Database and PostGIS Requirements
PostGIS extension must be enabled in the PostgreSQL database.
Tree location must use a geometry representation suitable for point coordinates.
The chosen SRID must be documented consistently across schema, queries, and API normalization.
Spatial queries must use the database's spatial capabilities rather than calculating all distances in application loops.
A GiST spatial index should be created on the tree geometry column for representative spatial queries.
Database constraints should enforce uniqueness and required relationships defined by the final database design.
Detailed table names, exact SQL types, foreign keys, cascade rules, and migration syntax belong in the Database Design document; this SRS does not invent them.
11. Map API/Data Behavior
The final API specification must freeze exact route names and JSON schemas. This SRS defines required behavior, not arbitrary route naming.
Operation
Required Inputs
Required Output Behavior
Map markers
Viewport/bounding information as applicable
Return tree marker information permitted for map display.
Nearby trees
Latitude, longitude, distance/radius as defined by API contract
Return trees satisfying spatial proximity criteria.
Location lookup
Valid coordinates
Return available environmental/location information through backend normalization.
Tree location
Tree identifier
Return permitted geographic information for the tree.
12. Environmental Integration Requirements
Source/Category
V1 Requirement
OpenStreetMap
Used for map visualization/data context through the selected mapping approach.
Open-Meteo
Planned weather/climate source, subject to verified availability and current integration contract.
ISRIC SoilGrids
Planned soil data source.
Land-use/restricted areas
Use relevant government/open geospatial data where available and access is verified.
Terrain
Use a suitable elevation/DEM source if reliably available.
Sun exposure
Derived/calculated from geographic and temporal information; no dedicated sun-exposure API is assumed.
Water
Use public environmental/water-resource data where accessible; regional/source-based indicators may be used when parcel-level data is unavailable.
External API credentials, if any, remain server-side.
Backend integration adapters should isolate provider-specific formats.
Timeouts and provider failures must not crash the entire application.
Frontend must receive a stable application-level response even when provider-specific formats differ.
Source and verification-date information should be retained where applicable.
13. Suitability Requirements
V1 uses deterministic rule matching. The system must provide a transparent explanation rather than an opaque score.
Inputs → Soil / Sunlight / Water / Spacing / applicable environmental data → SpeciesRule comparison → Component results → Overall result
Component
Required Behavior
Soil
Compare available soil information against species rule where the source provides compatible information.
Sunlight
Compare available/derived sunlight information against species requirement when supported.
Water
Compare available water indicator against species water need when supported.
Spacing
Use species minimum spacing as a rule/constraint where the product flow provides spacing information.
Overall
Summarize component compatibility without implying scientific authority or legal permission.
Missing input
Mark the component as unavailable/insufficient rather than inventing a value.
14. Initial Species Rules
Species
Soil
Spacing (m)
Sunlight
Water
Neem
Well-drained loam
6
Full sun
Low
Peepal
Alluvial / loam
8
Full sun
Moderate
Banyan
Well-drained clay-loam
12
Full sun – partial shade
Moderate
Mango
Deep loam
9
Full sun
Moderate
Jamun
Loam / clay, near water
8
Full sun
Moderate–High
Shisham
Sandy loam / alluvial
6
Full sun
Moderate
Gulmohar
Sandy loam
7
Full sun
Low–Moderate
Amaltas
Well-drained loam
6
Full sun
Low
Arjun
Riverbank / alluvial loam
8
Full sun
High
Ashoka
Well-drained loam
4
Full sun – partial shade
Moderate
15. QR and Public Profile Security Requirements
QR identity must not contain authentication credentials.
Tree profile lookup must not require exposing private user data.
Public contributor attribution must be privacy-safe.
Approximate rather than precise location may be shown publicly where privacy requires it; the exact public-location policy must be frozen in the UI/API specification before implementation.
Private endpoints must remain protected even if a public Tree ID is known.
16. Validation and Error Handling
Area
Required Behavior
Invalid authentication
Reject with an appropriate authentication error; do not expose sensitive credential details.
Unauthorized role
Reject protected operation.
Invalid coordinates
Reject or request correction; do not store invalid spatial data.
Missing required registration data
Reject submission with field-level validation information.
External provider unavailable
Return explicit unavailable/limited-data state.
Invalid Tree ID
Return appropriate not-found behavior without exposing private data.
Invalid health submission
Reject with validation information; do not create partial health records.
Duplicate Tree ID attempt
Database/backend uniqueness controls must prevent two trees from receiving the same permanent Tree ID.
17. Security Requirements
Use password hashing for account passwords.
Store secrets in environment variables/configuration rather than source code.
Use JWT authentication for protected API access.
Apply authorization middleware to role-sensitive operations.
Validate and sanitize user-controlled inputs as appropriate.
Do not expose stack traces/secrets through production error responses.
Do not trust frontend role claims; backend authorization is authoritative.
Do not trust frontend Tree ID uniqueness; backend/database is authoritative.
18. Testing Requirements
Test Area
Minimum Required Coverage
Authentication
Registration, valid login, invalid login, protected endpoint behavior
RBAC
Contributor/caretaker/admin access boundaries
Registration
Valid creation, invalid fields, coordinate validation, initial Pending state
Verification
Pending → Under Review → Verified/Rejected and unauthorized access
Tree ID
Generation after verification, uniqueness, stability, no premature issuance
QR/Public profile
Safe identifier, retrieval, privacy boundary
Suitability
Representative species rules, compatible/mismatch cases, missing data
Health
Authorized creation, validation, chronological history
Spatial
Representative PostGIS point storage, nearby query, distance behavior, map-area query
External integrations
Success, timeout/failure, unavailable-data response
Lint/CI
Automated build/test/lint pipeline
19. Non-Functional Requirements
ID
Requirement
NFR-01
Responsive operation on low-to-mid-range smartphones.
NFR-02
Backend shall use a modular monolith architecture.
NFR-03
REST APIs shall be stateless at the application layer where practical.
NFR-04
Database shall use PostgreSQL + PostGIS.
NFR-05
Spatial queries shall use appropriate indexes.
NFR-06
External provider failures shall degrade gracefully.
NFR-07
Core workflows shall have automated tests.
NFR-08
GitHub Actions shall run configured build/test/lint checks.
NFR-09
System shall be deployable using common web hosting and managed PostgreSQL/PostGIS/free or student tiers where feasible.
NFR-10
No public profile shall expose private contact information.
NFR-11
Pagination should be used for potentially large tree/health-log listings where appropriate.
20. File/Module Responsibilities
backend/├── server.js├── config/├── middleware/├── routes/├── controllers/├── services/├── repositories/├── integrations/├── models/├── utils/└── tests/
Module
Responsibility
routes
Define HTTP routes and connect them to controllers.
controllers
Validate request context and coordinate application operations.
services
Contain business logic such as verification, suitability, Tree ID lifecycle, health, and environmental orchestration.
repositories/data layer
Handle persistence and database queries.
integrations
Provider-specific external API adapters and normalization.
middleware
Authentication, authorization, validation/error handling as appropriate.
tests
Unit/integration/API tests.
21. Acceptance Test Scenarios
ID
Scenario
Expected Result
AT-01
Contributor registration
Valid contributor can register and login; password is not stored plaintext.
AT-02
RBAC
Contributor cannot access coordinator verification action.
AT-03
Map location
User selects a valid location; backend accepts and spatially represents it.
AT-04
Nearby search
Known test trees within a defined radius are returned; outside trees are excluded.
AT-05
Environmental lookup
Selected coordinates produce normalized source-aware environmental response when providers are available.
AT-06
Provider failure
Provider outage produces controlled unavailable state.
AT-07
Suitability
Defined species rules produce explainable component results for representative inputs.
AT-08
Registration
Contributor submits valid plantation; record appears as Pending.
AT-09
Verification
Coordinator moves Pending → Under Review → Verified or Rejected and audit data is stored.
AT-10
Tree identity
Verified record receives one unique stable Tree ID; Pending record does not receive permanent Tree ID.
AT-11
QR privacy
QR payload contains only safe public identifier/profile reference.
AT-12
Public profile
Public profile displays permitted tree data without private contact information.
AT-13
Health history
Caretaker creates multiple health logs and previous logs remain accessible.
AT-14
Dashboard
Aggregate counts use appropriate verified records.
AT-15
CI
Configured GitHub Actions checks build, tests, and lint successfully.
22. Pilot Requirements
Approximately 10–15 participants.
Approximately 30–50 plantations/saplings, subject to pilot availability.
Approximately 3–5 caretaker roles for periodic health logging.
Test registration, geolocation, evidence upload, verification, QR scanning, health logging, dashboards, and role permissions.
Measure 48-hour Verified Registration Rate using registration and verification timestamps.
Measure health-monitoring activity and observed survival only among trees with valid final health checks.
If no physical plantation drive is available, use a controlled/simulated pilot dataset and label it clearly.
23. Deployment and CI Requirements
Use GitHub as source control.
Every completed development milestone must be tested and pushed as a Git checkpoint before proceeding.
GitHub Actions shall build and execute backend tests and linting on configured changes.
Staging deployment should be repeatable.
Production/staging secrets must not be committed to Git.
Deployment may use common web hosting and managed/free-tier PostgreSQL/PostGIS where feasible.
24. Requirement-to-Test Traceability
Each FR/SRS requirement should be mapped to one or more automated/manual test cases in the testing plan. The following core traceability is mandatory:
Requirement Group
Primary Test Group
AUTH / RBAC
Authentication + authorization tests
MAP / SPATIAL
PostGIS + API spatial tests
ENV
Integration success/failure tests
SUIT
Suitability unit tests
TREE / VERIFICATION
Workflow integration tests
TREE ID / QR
Identity + privacy tests
HEALTH
Health-log API + history tests
REWARD / DASHBOARD
Aggregation tests
25. Open Decisions — Must Be Resolved Before Relevant Implementation
The following details are intentionally not guessed by this SRS because the proposal/PRD does not freeze them at low-level implementation detail:
Exact API route names and JSON request/response schemas.
Exact PostgreSQL table/column names, SQL data types, foreign-key cascade behavior, and migration tooling.
Exact SRID representation/API coordinate format, although spatial storage and consistent geographic coordinates are mandatory.
Exact photo/object-storage provider and upload mechanism.
Exact JWT expiration/refresh strategy.
Exact health-status enumeration.
Exact reward point values and badge thresholds.
Exact public-location precision/privacy rule.
Exact external terrain, land-use, and water providers where availability must first be verified.
Exact suitability scoring/labeling thresholds beyond the requirement for transparent deterministic component results.
Exact resubmission/re-review behavior for rejected registrations.
A coding model must not silently decide these in a way that changes product behavior. Resolve them in the corresponding Architecture, Database Design, API Specification, or project decision log before implementation.
26. V1 Definition of Done
All mandatory functional requirements are implemented.
Authentication and RBAC are enforced server-side.
PostgreSQL/PostGIS is operational and spatial queries are tested.
Interactive map can retrieve and display backend-supplied plantation markers.
Selected locations can obtain normalized environmental information where providers are available.
Suitability engine works deterministically and provides explainable results.
Plantation registration and evidence submission work.
Manual verification workflow and audit records work.
Verified trees receive unique stable Tree IDs through backend/database logic.
QR/public profile flow works without exposing private data.
Health monitoring creates persistent history.
Rewards and dashboard work for the defined V1 scope.
Core backend tests and linting run in CI.
Deployment to the selected staging environment is repeatable.
All acceptance scenarios relevant to the V1 pilot pass.
27. Reference and Precedence
This SRS is derived from the approved EcoRevive PRD V1.0 and the supplied EcoRevive Project Proposal (August 2026). The proposal defines the project intent, lifecycle, architecture, roles, core entities, evaluation metrics, timeline, V1/V2 boundary, and constraints. This SRS translates those decisions into testable software requirements while deliberately leaving unresolved low-level implementation choices as explicit open decisions.
28. Recommended Companion Documents
System Architecture Specification — module boundaries, request/data flows, authentication flow, integration architecture, deployment topology.
Database Design — complete ERD, exact tables/columns, constraints, indexes, PostGIS geometry/SRID, migrations.
API Specification — exact endpoints, authentication requirements, request/response JSON, status codes, error contracts.
Testing Strategy — test matrix, fixtures, integration tests, spatial test data, CI rules.
Milestone Roadmap — controlled implementation order with a GitHub checkpoint after every milestone.