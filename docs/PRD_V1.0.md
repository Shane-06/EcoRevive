EcoRevive — Product Requirements Document (PRD)
Authoritative V1 Product Specification • August 2026
Purpose: eliminate implementation guesswork by defining the intended V1 product, boundaries, workflows, roles, data expectations, and acceptance criteria.
0. Document Status and Authority
Field
Value
Product
EcoRevive
Document
Product Requirements Document (PRD)
Version
V1.0
Primary scope
Semester V1
Project type
College-level full-stack engineering project
Primary source
EcoRevive Project Proposal, August 2026
Requirement rule
This PRD is the product-level source of truth for V1. It must not be overridden by model assumptions.
0.1 Non-Negotiable Interpretation Rules
Implement only functionality explicitly defined in this PRD or subsequently approved by the project owner.
Do not infer missing business rules, permissions, fields, workflows, APIs, external data, or UI behavior and present the inference as a requirement.
If a requirement is ambiguous or two requirements conflict, stop at the decision point and ask the project owner before implementing the affected behavior.
V1 must not depend on AI/ML. AI-assisted verification, image analysis, predictive survival analysis, fraud detection, and intelligent recommendations are V2.
The system is a decision-support, workflow, verification, identity, and monitoring platform. It does not guarantee increased forest cover or environmental outcomes.
The platform does not grant legal permission for plantation. Suitability information must never be presented as legal authorization.
External environmental information must be source-aware. Never fabricate unavailable data.
Public tree profiles must never expose private contact information or authentication secrets.
A permanent Tree ID is issued for a verified plantation; frontend-generated Tree IDs are not acceptable.
The frontend must not directly call external environmental APIs. External integrations are backend-mediated and normalized.
1. Product Overview
EcoRevive is a full-stack plantation lifecycle platform that digitizes the journey of a planted tree from location discovery and site assessment through plantation registration, evidence submission, manual verification, digital identity, QR-based access, health monitoring, and aggregate impact tracking.
The engineering objective is to create a deployable and auditable workflow for approximately 30–50 pilot plantations/saplings during the semester, subject to pilot availability. The platform records verified plantation activity rather than claiming to guarantee environmental outcomes.
2. Problem Statement
Plantation decisions are often made without bringing land-use, soil, water, sunlight, and terrain information together.
Plantation claims may rely on informal photographs without a structured submission, review, approval/rejection, and audit trail.
After planting, a specific tree often lacks a persistent digital identity for health and survival tracking.
Location, contributor, evidence, verification status, and health history may remain fragmented across spreadsheets, messaging apps, and paper records.
Duplicate records, missing geolocation, and inconsistent follow-up reduce confidence in aggregate plantation statistics.
EcoRevive addresses the unified lifecycle gap: where to plant → whether to plant → proof → verification → digital identity → monitoring → measurable impact.
3. Product Goals
Enable users to discover and select potential plantation locations using an interactive map.
Present available, source-referenced environmental/geographical information for a selected location.
Provide a transparent deterministic suitability assessment rather than an opaque or AI-generated recommendation.
Allow authenticated contributors to register plantation activity and submit evidence.
Allow authorized coordinators/admins to manually review and approve/reject registrations.
Assign each verified plantation a unique Tree ID and QR-linked public profile.
Allow caretakers to scan a QR code and submit periodic health updates.
Aggregate verified plantation, verification, health, and basic reward information into dashboards.
Create a reliable structured dataset that can support future V2 intelligence features.
4. Product Success Metrics
Metric
Definition
Target / Interpretation
48-hour Verified Registration Rate (VRR)
Percentage of pilot registrations reaching Verified within 48 hours of registration, measured using database timestamps.
At least 80%, subject to reviewer availability.
Health Monitoring Activity
Percentage of verified trees receiving a valid health log during the pilot monitoring window.
Track and report; no unsupported target specified.
Observed Survival Status
Percentage recorded alive/healthy at pilot end among trees with a valid final health check.
Missing health updates are not treated as death.
Suitability-Rule Accuracy
Agreement between engine compatibility/mismatch flags and manual expert review on a sample.
Measure during pilot.
System Reliability
Availability of registration, QR, and health-log workflows during the pilot window.
Measure during pilot.
Workflow Completion
Percentage of users completing registration and verification end-to-end without assistance.
Measure during pilot.
5. Users and Roles
Role
Responsibilities
Access Boundary
Contributor / User
Register plantations, view own records, receive rewards.
Cannot perform coordinator verification unless separately assigned an authorized coordinator role.
Caretaker
Perform QR-based health checks and update tree condition.
May be the same person as contributor, but need not be.
Admin / Coordinator
Review submissions, approve/reject, manage reports and system records.
Has protected administrative capabilities.
Public visitor
View privacy-safe public profile of a verified tree through its QR/public URL.
No private account data.
6. Core Product Lifecycle
DISCOVER → ASSESS → PLANT → PROVE → VERIFY → IDENTIFY → MONITOR → REWARD → TRACK
DISCOVER — Explore the interactive map and select a potential location.
ASSESS — View available land/environmental information and rule-based suitability information.
PLANT — User plants a tree after considering the assessment and any applicable permissions.
PROVE — User submits plantation details and photo evidence.
VERIFY — Admin/coordinator manually reviews and approves or rejects the record.
IDENTIFY — A verified plantation receives a unique Tree ID and QR code.
MONITOR — Caretaker scans the QR code periodically and records health information.
REWARD — Verified activities contribute to points/badges.
TRACK — Dashboard aggregates verified plantation and monitoring information.
7. V1 Functional Requirements
ID
Requirement
Required Behavior
FR-01
Authentication
Users shall be able to register and log in securely. Authentication shall use JWT-based sessions/tokens and protected backend endpoints.
FR-02
Role-Based Access
The system shall enforce contributor, caretaker, and admin/coordinator permissions on protected operations.
FR-03
Interactive Map
The system shall provide an interactive map where a user can search/navigate and select a plantation location.
FR-04
Geolocation
A selected plantation location shall be represented using geographic coordinates and stored as spatial data in PostgreSQL/PostGIS for tree records.
FR-05
Existing Plantations
The map experience shall be able to retrieve existing plantation markers from the backend.
FR-06
Spatial Queries
The backend shall support spatial operations needed for nearby trees, geographic filtering, and map-area retrieval.
FR-07
Environmental Information
For a selected location, the platform shall retrieve available environmental/geographical information through backend-mediated integrations.
FR-08
Source Awareness
Displayed external environmental data shall include source reference and verification date where applicable.
FR-09
Unavailable Data
When reliable external data is unavailable, the platform shall show a clear unavailable state rather than inventing a value.
FR-10
Suitability Assessment
The system shall compare available site information against species-specific deterministic rules and provide explainable compatibility/mismatch results.
FR-11
Species Rules
V1 suitability seed data shall cover at least 10 common tree species and shall be documented/refined during development.
FR-12
Plantation Registration
An authenticated contributor shall be able to submit species, geolocation, planting date, photo evidence, and optional notes.
FR-13
Registration Status
A newly submitted plantation shall enter Pending status.
FR-14
Evidence
Plantation registration shall support photo evidence via a stored photo reference.
FR-15
Verification
An authorized admin/coordinator shall be able to move a record through Pending → Under Review → Verified or Rejected.
FR-16
Verification Audit
Verification shall record reviewer, decision, timestamp, and rejection/decision reason where applicable.
FR-17
Tree Identity
After successful verification, the system shall assign a unique, stable Tree ID to the plantation.
FR-18
QR Identity
The verified tree shall have a QR code that encodes only a Tree ID or public profile URL/identifier.
FR-19
Public Tree Profile
A verified tree shall have a privacy-safe public profile containing permitted tree information, not private account information.
FR-20
QR Scanning
Caretakers shall be able to use the browser camera to scan the QR code and identify the tree.
FR-21
Health Logging
Authorized caretakers shall be able to add health status, photo, notes, submitter, and timestamp for a tree.
FR-22
Health History
The system shall retain health updates as a history/timeline for the tree.
FR-23
Rewards
Verified activities shall be able to contribute to points and basic badges/rewards.
FR-24
Dashboard
The platform shall aggregate verified plantation, verification, health, and basic reward information into dashboard views.
FR-25
Responsive Use
The web application shall be usable on low-to-mid-range smartphones; QR scanning shall use browser camera capabilities without requiring a native app for V1.
FR-26
Testing and CI
Backend tests and linting shall be automated through CI, with meaningful coverage of core workflows.
8. Map and Geospatial Product Requirements
The map is a core product capability, not merely a visual frontend component. The database and backend must support spatially meaningful operations.
Use Leaflet on the frontend with OpenStreetMap-based map data.
Store tree location as PostGIS point geometry with an explicit coordinate reference system appropriate for the application; the implementation must document the chosen SRID.
Support location selection and manual map-pin adjustment when automatic GPS capture is inaccurate.
Retrieve existing plantation markers from the backend.
Support nearby-tree and distance-based queries.
Support map-area/bounding-box retrieval as needed by the map viewport.
Use a spatial index (GiST) where appropriate for tree geometry queries.
Do not expose raw database geometry implementation details to the frontend when a normalized coordinate representation is sufficient.
Do not claim parcel-level legal land permission from map or environmental data.
Use clear unavailable/limited-data states when authoritative land-use or water information cannot be obtained.
9. Environmental Information Requirements
Information
Planned Source / Approach
Product Rule
Map
Leaflet + OpenStreetMap-based data
Render interactive map; backend owns application data retrieval where applicable.
Weather / climate
Open-Meteo or equivalent suitable API
Backend-mediated; normalize into application response.
Soil
ISRIC SoilGrids
Backend-mediated; use available soil information only.
Land-use / restricted areas
Relevant government/open geospatial datasets where available and access is verified
Source-aware; no invented parcel-level claims.
Terrain
Suitable elevation/DEM dataset or service
Use only if a reliable source is available.
Sun exposure
Derived/calculated from geographic and temporal information
Do not assume a dedicated sun-exposure API.
Water
Public environmental/water-resource datasets where accessible
Regional/source-based indicators may be shown when parcel-level data is unavailable.
Required integration pattern: Frontend → Node.js/Express backend → external source → normalization/rules → frontend. The frontend must not directly call external environmental APIs.
10. Suitability Engine Requirements
V1 suitability is deterministic and explainable. It is a decision-support assessment, not a scientifically authoritative or legally binding rating.
Location/environmental information + SpeciesRule → Compatibility checks → Explainable result
At minimum, rules must cover soil type, minimum spacing, sunlight, and water need.
The initial proposal seed table contains 10 species: Neem, Peepal, Banyan, Mango, Jamun, Shisham, Gulmohar, Amaltas, Arjun, Ashoka.
The exact rule values in the seed table must be preserved unless the project owner approves a documented change.
The engine must expose component-level results such as Suitable, Moderate, or mismatch where the available data supports such a classification.
The engine must distinguish unavailable input data from a negative suitability finding.
The system must not invent soil, water, sunlight, climate, or land values to complete a score.
AI/ML must not be required for suitability in V1.
11. Initial Species Rule Seed Data
Species
Soil Type
Min. Spacing (m)
Sunlight
Water Need
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
12. Plantation Registration Requirements
Required conceptual data: species, geolocation, planting date, photo evidence, and optional notes.
The contributor must be authenticated.
The initial status is Pending.
The record must be attributable to the submitting user.
Geolocation must be captured/selected and validated.
Photo evidence is a reference to stored media; storage implementation is not fixed by this PRD.
A permanent Tree ID must not be issued merely on submission.
13. Verification Requirements
Pending → Under Review → Verified
                         ↘ Rejected
Only an authorized admin/coordinator may perform verification decisions.
The reviewer must be recorded.
The decision timestamp must be recorded.
A rejection reason should be recorded when rejecting a submission.
Verification history must be auditable.
Verified status is the prerequisite for permanent digital Tree identity in V1.
The 48-hour metric is calculated from registration creation to verification event timestamps.
14. Tree ID and QR Requirements
Tree identity is a core backend capability and must be treated as a lifecycle identity, not as a frontend display string.
Tree ID must be unique and stable.
Tree ID generation must be controlled by the backend/database workflow.
Tree ID must be associated with exactly one tree record.
Tree ID issuance occurs after successful verification.
The frontend must never be the authority for Tree ID uniqueness.
QR must encode only a Tree ID or public profile URL/identifier.
QR must never encode phone numbers, email addresses, passwords, JWTs, or other private information.
The public profile must be retrievable using the Tree ID/QR identity without exposing private user data.
15. Public Tree Profile Requirements
Tree ID
Species
Plantation date
Verified status
Approximate location
Public contributor name or anonymous identity
Current health
Health history
The public profile must not expose phone numbers, email addresses, private account details, passwords, authentication tokens, or other private contact information.
16. Health Monitoring Requirements
A caretaker can identify a tree by scanning its QR code using the browser camera.
A health log contains tree reference, submitting user, health status, optional/required photo according to the final UI validation decision, timestamp, and notes.
Health updates form a historical timeline and must not overwrite prior health events.
The system must support periodic monitoring rather than a one-time health record.
Missing health updates must never be interpreted as proof of tree death.
The pilot validates the monitoring mechanism; it does not prove long-term survival within the semester.
17. Rewards and Dashboard Requirements
Verified activities can produce points.
Basic badges may be used as the reward representation.
Dashboard counts must be based on appropriate verified records rather than raw self-reported claims.
Dashboard should support aggregate views of plantations, verification status, health status, and estimated/basic impact information.
No unsupported environmental impact claims should be presented as measured outcomes.
18. Security and Privacy Requirements
Passwords must be securely hashed; plaintext passwords must never be stored.
JWT secrets and other secrets must be supplied through environment variables.
Input validation must be applied to user-controlled data.
Protected endpoints must enforce authentication.
Role-sensitive endpoints must enforce authorization.
Admin endpoints must not be accessible to ordinary contributors/caretakers.
Public profiles must use privacy-safe contributor attribution.
Private account data must never be placed into QR payloads.
Error responses must not unnecessarily reveal secrets, credentials, or internal implementation details.
19. Non-Functional Requirements
Category
V1 Requirement
Usability
Responsive web application suitable for low-to-mid-range smartphones.
Architecture
Three-tier architecture with modular monolithic Node.js/Express backend.
Database
PostgreSQL with PostGIS.
API
REST APIs; external services accessed through backend.
Reliability
Graceful external API failure and clear unavailable-data states.
Maintainability
Backend modules should separate routes/controllers/services/integrations/data access appropriately.
Testability
Meaningful automated tests for core business workflows and representative spatial queries.
CI
GitHub Actions builds/tests/lints on changes.
Deployment
Deployable to common web hosting and managed PostgreSQL/PostGIS/free or student tiers where feasible.
Privacy
No private contact information on public QR/tree profiles.
Scalability
Stateless REST APIs, pagination, database indexing, and PostGIS spatial indexing; enterprise-scale capacity is not claimed.
20. Explicit V1 / V2 Boundary
V1 — This Semester
V2 — Deferred
Authentication + RBAC
AI-assisted evidence verification
Interactive map
Tree-health image analysis
Source-referenced environmental information
Predictive survival analysis
Rule-based suitability
Intelligent species recommendations
Manual verification
Duplicate/fraud detection
Tree ID + QR
Automated caretaker reminders/notifications
Public tree profile
Advanced geospatial analytics
QR-based health monitoring
Larger advanced public impact dashboard
Basic rewards
Impact dashboard
CI build/tests/linting + staging deployment
Any V2 capability must not become a hidden dependency for V1. V1 must remain functional without AI/ML.
21. Technical Product Constraints
Frontend: JavaScript, React.js, Vite, Tailwind CSS.
Backend: JavaScript, Node.js, Express.js.
Database: PostgreSQL + PostGIS.
Mapping: Leaflet + OpenStreetMap-based map data.
Weather/climate: Open-Meteo or an equivalent suitable API, subject to verified availability.
Soil: ISRIC SoilGrids.
QR: browser camera integration and a JavaScript QR generation/scanning library.
Testing/CI: Jest or equivalent, ESLint, GitHub Actions.
Backend architecture: modular monolith, not microservices.
No direct frontend-to-external-environmental-API calls.
22. Core Data Concepts
Entity
Required Conceptual Data
User
id, name, contact, role; authentication identity.
Tree
id, Tree ID, species, PostGIS point geometry, photo reference, status, planted-on date, verifying coordinator.
Verification
id, tree reference, reviewer, decision, timestamp, reason.
SuitabilityRule
species, soil type, minimum spacing, sunlight, water requirement, climate/region as applicable.
HealthLog
id, tree reference, submitted-by, health status, photo, timestamp, notes; append-oriented history.
Reward
user id, points, activity, timestamp.
This is a product-level data contract. Detailed SQL types, normalization decisions, keys, indexes, migrations, and exact API schemas belong in the SRS/System Design/Database Design documents.
23. External Data and Source Integrity
Every displayed environmental data point should be source-referenced with a verification date where applicable.
If an external service is unavailable, return a controlled unavailable state.
Do not replace missing authoritative information with fabricated values.
The system is a decision-support platform and not a legal authorization service.
Land-use/restricted-area information depends on reliable dataset availability; do not claim authoritative parcel-level restrictions unless the actual source supports that granularity.
24. Pilot and Validation Requirements
Target approximately 10–15 participants.
Target approximately 30–50 plantations/saplings, subject to pilot availability.
Use approximately 3–5 caretaker roles for periodic health logging.
Test registration, geolocation capture, evidence upload, verification, QR scanning, health logging, dashboard views, and role permissions.
If a physical plantation drive is unavailable, use a controlled/simulated pilot dataset and clearly label it as simulated.
Use expert/manual review for a sample of suitability assessments.
25. Out of Scope for V1
AI-based image verification.
Computer-vision tree-health analysis.
Predictive survival modeling.
Automated fraud/duplicate detection using AI.
Automated caretaker notification/reminder engine.
Enterprise-scale infrastructure.
Native mobile application.
Legal authorization or permission issuance for plantation.
Claims that the system itself guarantees increased forest cover or survival.
Fabricated parcel-level land, water, soil, or environmental values when a reliable source is unavailable.
26. Product Acceptance Criteria
ID
Acceptance Criterion
AC-01
A user can authenticate and receives only the permissions allowed by their role.
AC-02
A user can select a location on the map and the application can represent it through backend spatial data.
AC-03
Existing verified plantation markers can be retrieved from the backend for map display.
AC-04
Representative PostGIS nearby/distance and map-area queries return correct results for test coordinates.
AC-05
A selected location can request environmental information through the backend without direct frontend external-API calls.
AC-06
Unavailable external data is represented explicitly rather than fabricated.
AC-07
The suitability engine produces explainable component-level results from defined species rules.
AC-08
A contributor can submit a plantation with species, location, planting date, evidence, and optional notes.
AC-09
New registrations begin in Pending status.
AC-10
An authorized coordinator can review and transition a registration to Verified or Rejected with auditable information.
AC-11
A verified plantation receives one unique stable Tree ID controlled by backend/database logic.
AC-12
The QR identity contains only a safe identifier/public profile reference.
AC-13
A public QR/tree profile exposes only privacy-safe information.
AC-14
A caretaker can identify a tree through QR scanning and submit a health update.
AC-15
Multiple health updates remain available as a chronological history.
AC-16
Dashboard statistics use appropriate verified records and do not treat missing health logs as deaths.
AC-17
Core backend tests and linting run automatically in CI.
AC-18
V1 operates without any AI/ML dependency.
27. Product Workflow — Detailed Reference
MAP / DISCOVER  User opens map      ↓  Selects location      ↓ASSESS  Backend validates coordinates      ↓  Backend obtains available environmental information      ↓  Suitability engine compares information with species rules      ↓  Frontend shows source-aware information + explainable suitability      ↓PLANT  User plants after considering information and permissions      ↓PROVE  Contributor submits plantation + location + date + evidence      ↓VERIFY  Pending → Under Review → Verified / Rejected      ↓IDENTIFY  If Verified → backend generates Tree ID → QR/public profile      ↓MONITOR  Caretaker scans QR → health log → history      ↓REWARD / TRACK  Verified activity → rewards  Verified records + health history → dashboard
28. Development Guidance for AI/Coding Models
Before changing code, map the requested change to one or more PRD requirements.
Do not create a feature solely because it is common in similar applications.
Do not replace the defined architecture with microservices, TypeScript, a different database, or a different frontend framework without explicit approval.
Do not create direct browser calls to external environmental services.
Do not create frontend-owned Tree ID generation.
Do not add AI/ML to V1.
Do not fabricate environmental data or pretend an unavailable source returned a value.
Do not silently add fields to public profiles that expose private data.
When an exact technical choice is not specified by this PRD, classify it as an implementation decision and choose the simplest approach compatible with the requirements; if the choice changes product behavior, ask for approval.
When implementing a milestone, verify acceptance criteria before declaring it complete.
29. Requirements Traceability Principle
Every major implementation item should be traceable to a requirement ID (FR-xx) or acceptance criterion (AC-xx). The implementation team should maintain this traceability in the SRS, API specification, database design, test plan, and milestone roadmap.
30. Known Decisions That Must Not Be Reinterpreted
EcoRevive V1 is deterministic and AI-independent.
The backend is a modular monolith.
PostgreSQL must use PostGIS for spatial functionality.
The interactive map is a core system capability and requires backend/database spatial support.
Environmental APIs are backend-proxied and normalized.
Manual verification is the V1 trust mechanism.
Tree ID is generated after verification and controlled by backend/database logic.
QR carries an identifier/public-profile reference, not private information.
Health history is persistent and append-oriented.
Missing health updates are not equivalent to tree death.
The system does not grant legal plantation permission.
V2 intelligence is explicitly deferred.
31. Reference Source
This PRD was prepared from the provided EcoRevive Project Proposal (August 2026), preserving its stated goals, scope, workflows, architecture, data concepts, V1/V2 boundary, evaluation criteria, risks, and pilot assumptions. Where the proposal intentionally leaves a detailed implementation choice open, this PRD does not invent a product-level requirement.
32. Next Controlled Documents
SRS — convert product requirements into detailed functional/non-functional specifications and edge cases.
System Architecture — freeze modules, request/data flows, authentication flow, integration boundaries, and deployment architecture.
Database Design — freeze tables, columns, relationships, constraints, PostGIS types/SRID, indexes, and migration strategy.
API Specification — freeze REST routes, roles, request/response schemas, status codes, and error contracts.
Milestone Roadmap — sequence implementation so backend/database foundations are completed and tested before major frontend work, with a GitHub checkpoint after every milestone.
Testing Strategy — map requirements to unit, integration, API, spatial, and end-to-end tests.