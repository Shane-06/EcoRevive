EcoRevive: A Full-Stack Plantation Intelligence, Verification and Monitoring Platform
An integrated system for informed plantation planning, verified tree registration, digital tree identity and long-term health monitoring
Project Proposal for UCS503
August 2026
Submitted By:
Meera (1024030425)  |  Govind (1024030825)  |  Guntas (1024030216)
1. Higher-Order Goal
This project aims to encourage responsible and accountable citizen- and institution-led plantation by digitising the lifecycle of a planted tree — from site assessment, through verified registration, to long-term health monitoring. This broader environmental aim is intentionally kept distinct from the engineering objective: the platform itself cannot guarantee an increase in forest cover, and the proposal makes no such claim.
The immediate engineering objective is to build a deployable full-stack platform that helps users discover plantation locations, assess land and environmental suitability, register plantation activity, submit evidence, undergo manual verification, receive a unique digital Tree ID and QR code, and monitor tree health over time — collectively contributing to a measurable, auditable record of plantation activity. The system is framed as an information, workflow, verification and monitoring tool, not as an environmental-outcome guarantee.
2. Time-to-Value
Meaningful increments will be delivered quickly by prototyping the core registration-and-QR workflow first and validating it against a small pilot planting drive early in the semester.
Fast feedback will be prioritised over perfection through weekly iterations, with CI-backed build and test automation introduced from an early milestone rather than deferred to the end.
V1 must become functional without depending on AI. The core lifecycle — Location → Assessment → Registration → Verification → Tree ID/QR → Monitoring → Dashboard — is prioritised first, with AI-assisted verification and predictive analytics explicitly deferred to V2.
Scope is deliberately controlled to remain feasible within a single academic semester; not every advanced feature is promised early.
3. Problem Statement
Citizen-led and institutional plantation drives (colleges, resident welfare associations, NGOs, municipal green-cover programmes) commonly report how many saplings were distributed, but rarely track what actually survives, why a species was chosen, or who is responsible for its upkeep. Existing tools and processes often address individual aspects of this lifecycle in isolation, while the complete lifecycle remains fragmented across spreadsheets, messaging apps and paper registers. Recurring pain points include:
Uninformed plantation decisions: information relevant to site suitability — land-use status, soil, water availability, sunlight and terrain — is scattered across different sources and rarely consulted together before planting.
Lack of reliable verification: plantation claims often rely on informal photographs without a structured workflow for submission, review, approval/rejection and auditability.
Lack of post-plantation monitoring: once planted, there is typically no persistent digital identity for a specific tree through which health, growth or survival can be tracked over time.
Fragmented impact information: location, contributor, evidence, verification status and health history are maintained separately, if at all.
Data quality problems: duplicate records, missing geolocation and inconsistent follow-up reduce confidence in aggregate plantation statistics.
The core gap this project addresses is the need for a unified digital lifecycle connecting where to plant, whether to plant, proof of planting, verification, digital identity, monitoring and measurable impact — rather than any single one of these in isolation. Environmental grant bodies, CSR-funded drives and campus green-cover initiatives increasingly expect verifiable survival evidence rather than raw plantation counts, which makes this gap directly relevant even at a modest pilot scale.
4. Objectives
Primary objective: to design and deploy a full-stack web platform that manages the complete lifecycle of a planted tree — planning, verified registration and health monitoring — with a measurable improvement in registration turnaround and monitoring continuity over the current manual process. Supporting sub-goals:
Develop a rule-based plantation-suitability engine covering at least 10 common tree species, validated against expert review of a sample of pilot proposals.
Implement a complete plantation registration and manual verification workflow, with at least 80% of pilot registrations reaching “Verified” status within 48 hours of registration, subject to reviewer availability.
Register and geotag approximately 30–50 pilot plantations/saplings during the semester, subject to pilot availability, each assigned a unique Tree ID and QR-linked public profile once verified.
Implement health-monitoring records so that verified trees can receive periodic health updates; the system supports long-term monitoring, while the semester pilot validates the initial workflow rather than proving long-term survival.
Implement role-based access for contributors, caretakers and administrators/coordinators.
Establish automated backend testing and CI by approximately Week 4 of the semester.
5. Proposed Solution
5.1 Overview
The platform implements a web-based plantation lifecycle system comprising:
Interactive plantation map: search and select a location, view existing plantation markers and relevant geographic layers.
Land and suitability assessment: a transparent, rule-based suitability engine informed by available site and environmental information.
Plantation registration: species, geolocation, planting date, photo evidence and optional notes submitted by the contributor.
Manual verification: an admin/coordinator reviews submissions and transitions each record through Pending → Under Review → Verified or Rejected.
Digital tree identity: each verified plantation receives a unique Tree ID, a QR code and a public tree profile.
Health monitoring: caretakers scan the QR code to log periodic health status, photographs and notes, building a timeline per tree.
Rewards and impact dashboard: simple points/badges for verified contributions, and aggregate counts of plantations, verification status, health status and estimated impact.
5.2 Core Workflow
DISCOVER — the user explores the interactive map and selects a potential location.
ASSESS — the system presents available land and environmental information for that location.
PLANT — the user plants a tree after considering the assessment and any applicable permissions.
PROVE — the user submits plantation details and photo evidence.
VERIFY — an admin/coordinator manually reviews and approves or rejects the record.
IDENTIFY — the verified plantation receives a unique Tree ID and QR code.
MONITOR — a caretaker scans the QR code periodically and records tree health.
REWARD — verified activities contribute to points and badges.
TRACK — the dashboard aggregates verified plantation and monitoring information.
5.3 Roles and Access
Contributor/User — registers plantations, views their own records, and receives rewards.
Caretaker — performs QR-based health checks and updates tree condition; may be the same person as the contributor, but need not be.
Admin/Coordinator — reviews and verifies/rejects submissions, manages reports and system records.
Access is enforced through role-based authorization. Public tree profiles use a privacy-safe “Contributed by” field rather than exposing private contact details.
5.4 Operational Constraints
Usable on low-to-mid-range smartphones via a responsive web app; QR scanning uses the browser camera API, so no native app is required for V1.
V1 is deliberately deterministic and rule-based — no AI/ML dependency; AI-assisted verification and predictive analytics are explicitly deferred to V2.
Designed for deployment on common web hosting with a managed, free-tier PostgreSQL/PostGIS instance, within a semester timeline and near-zero external budget.
6. Solution Approach
This is an engineering course project, so the emphasis is on a scalable full-stack architecture, correct spatial-data handling and workflow reliability — not on research-grade computer vision or predictive modelling, which is intentionally left for V2.
6.1 Rule-Based Suitability Engine — Non-Research
The suitability engine is deterministic: it (1) receives location and environmental information, (2) compares it against a species-rule table, (3) flags mismatches, and (4) produces an explainable result rather than an opaque score — e.g., “Soil: Suitable, Sunlight: Suitable, Spacing: Suitable, Water: Moderate, Overall: Suitable.” This is called a rule-based plantation-suitability assessment, not a scientifically authoritative rating. The table below is illustrative V1 seed data covering ten common species and will be extended and refined during development.
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
Table 1: Illustrative species-suitability rule table (V1 seed data).
6.2 Land and Environmental Data Sourcing
External information is integrated through the backend and normalised into application-level data, following the principle: External data sources → Backend → Normalisation/Rules → Frontend. The frontend does not call external APIs directly.
Map: React with Leaflet, rendering OpenStreetMap-based map data.
Weather/climate: Open-Meteo or an equivalent suitable weather API.
Soil: ISRIC SoilGrids.
Land-use / restricted areas: relevant government or open geospatial datasets where available and access is verified.
Terrain: a suitable elevation/DEM dataset or service.
Sun exposure: derived/calculated from geographic and temporal information rather than a dedicated “sun exposure API.”
Water: publicly available environmental/water-resource datasets where accessible; where parcel-level data is unavailable, the platform shows regional, source-based indicators rather than invented values.
Every displayed data point is source-referenced with a verification date. The platform provides decision support and source-aware land information; it does not itself grant legal permission for plantation, and its suitability result is never presented as legal authorisation.
6.3 Digital Tree Identity and QR System
Registration → Unique Tree Record → Verification → Tree ID → QR Code → Public Tree Profile. The QR code encodes a URL/identifier only (e.g., Tree ID: ER-PLT-00482) and never private personal information; verification status is controlled by the backend/database, not by the QR code itself. A public profile may show the Tree ID, species, plantation date, verified status, approximate location, a public contributor name or anonymous identity, current health and health history — it never exposes phone numbers, email addresses or private account details.
6.4 Web Architecture
A three-tier architecture, with a modular monolithic Node.js/Express backend (rather than microservices, which would be unnecessary overhead for a semester project):
Frontend (React): interactive map, registration and verification forms, dashboards, QR scanning UI and public tree profiles.
Backend (Node.js/Express, modular monolith): Registration, Verification, Health, Suitability and Map/Data-Integration modules, exposed over REST and independently testable.
Database (PostgreSQL + PostGIS): stores users, tree records with point geometry, the species-rule table and health-log history; PostGIS enables spatial queries such as nearby trees, ward-boundary filtering and map clustering.
6.5 Core Data Entities
User — id, name, contact, role (contributor / caretaker / admin), used for JWT-based authentication.
Tree — id, Tree ID, species, PostGIS point geometry, photo reference, status, planted-on date, verifying coordinator.
Verification — id, tree reference, reviewer, decision, timestamp, reason.
SuitabilityRule — species, soil type, minimum spacing, sunlight and water requirement, climate/region.
HealthLog — id, tree reference, submitted-by, health status, photo, timestamp, notes — append-only.
Reward — user id, points, activity, timestamp.
6.6 Authentication, Security and Testing
Authentication uses JWT tokens with role-based authorization and protected admin endpoints; input validation, environment-variable-based secret management, password hashing and privacy-aware public profiles are included, without over-engineering security beyond what a V1 pilot requires. A CI/CD pipeline (GitHub Actions) automatically builds and runs backend unit/integration tests (Jest or equivalent) and linting (ESLint) on every change, and deploys repeatable artefacts to staging. Automated tests target meaningful coverage — not a claimed 100% — of authentication, RBAC, registration, verification transitions, suitability rules, QR profile retrieval, health-log creation and representative spatial queries.
7. Evaluation Criteria
7.1 Primary Metric
48-hour Verified Registration Rate (VRR): the percentage of pilot registrations that reach “Verified” status within 48 hours of registration. Target: at least 80% during the pilot, subject to reviewer availability. Attribution: measured from database timestamps (registration creation versus verification event).
7.2 Secondary Metrics
Health Monitoring Activity — percentage of verified trees receiving a valid health log during the pilot monitoring window.
Observed Survival Status — percentage of trees explicitly recorded alive/healthy at pilot end, among trees with a valid final health check; a missing health update is never treated as evidence of death.
Suitability-Rule Accuracy — percentage agreement between the engine’s compatibility/mismatch flags and manual expert review on a sample.
System Reliability — availability of registration, QR and health-log workflows during the pilot window.
Workflow Completion — percentage of users able to complete registration and verification end-to-end without assistance.
7.3 Pilot Validation Plan
Approximately 10–15 participants registering 30–50 plantations/saplings, with 3–5 caretaker roles for periodic health logging.
Testing spans registration, geolocation capture, evidence upload, verification, QR scanning, health logging, dashboard views and role permissions.
If a physical plantation drive cannot be arranged by the college, a controlled/simulated pilot dataset will be used for software validation and clearly labelled as such.
8. Scalability
Theoretically scalable: decoupled frontend/backend, stateless REST APIs, PostgreSQL indexing with a PostGIS GiST spatial index, pagination on tree-listing and health-log endpoints, and a modular backend.
Operationally deployable: containerised deployment where feasible, a managed PostgreSQL/PostGIS instance, free/student-tier cloud hosting, a CI/CD pipeline and a staging environment. Enterprise-scale scalability is not claimed for a semester pilot.
9. Engine Availability and Resources
Core stack: React (frontend), Node.js/Express (backend), PostgreSQL with PostGIS (database).
Map and data: Leaflet, OpenStreetMap, Open-Meteo, ISRIC SoilGrids, and relevant open geospatial datasets where available.
QR identity: a browser-based JavaScript QR generation/scanning library — no dedicated hardware required.
Storage: managed object storage, or local/staging storage during the pilot, for registration and health-check photos.
Testing & CI: Jest (or equivalent), ESLint, GitHub Actions for CI and staging deployment.
Human resources: a two-member student development team — one leading frontend, map and QR/UX flow, the other leading backend, database and spatial queries — sharing testing and pilot coordination.
Material resources: university lab access for cross-device QR testing; free-tier cloud hosting and a free-tier managed PostgreSQL/PostGIS instance; GitHub for source control and CI/CD.
Budget: no external funding required; all software and hosting used are open-source or free-tier. The only incidental cost — optional QR-sticker printing for 30–50 pilot saplings — is nominal and covered by the project team.
10. Timeline
The plan follows the time-to-value heuristic in Section 2: core lifecycle features ship early, the pilot runs mid-to-late semester, and a dedicated buffer week absorbs unexpected delays before final documentation.
Week
Phase / Task
Deliverable
1–2
Requirements, SRS, architecture and ER/database design (PostGIS geometry, species-rule table)
System design document
3–4
Backend foundation — authentication, RBAC, database schema, CI pipeline
Working auth API + CI pipeline
5–6
Interactive map, location selection, plantation-registration flow
Functional registration MVP
7–8
External environmental data integration, suitability engine, species rules
Working suitability engine
9–10
Verification workflow, Tree ID generation, QR code, public tree profile
End-to-end lifecycle demo
11
Health monitoring, coordinator dashboard, basic rewards
Monitoring + dashboard build
12
Integration testing, bug-fixing, staging deployment, pilot validation
Pilot dataset; verified registrations
13
Buffer week, documentation, final presentation preparation
Final report + demo
Table 2: Week-by-week semester timeline with a dedicated buffer week.
Long-term survival evaluation is not scheduled immediately after planting; the pilot validates the health-monitoring mechanism itself, while extended survival analysis is a continuation/V2 activity beyond the semester.
11. Project Scope and Deliverables
11.1 V1 — Initial Deliverable (This Semester)
Authentication and role-based access control
Interactive map with location selection and source-referenced land/environmental information
Rule-based suitability engine covering 10+ species
Plantation registration with photo evidence
Manual verification workflow (Pending → Under Review → Verified/Rejected)
Tree ID generation, QR code and public tree profile
Health monitoring via QR scan, with basic community reporting
Basic rewards and an impact dashboard
CI: build, backend unit tests and linting; CD to staging
11.2 V2 — Subsequent Deliverables (Deferred)
AI-assisted evidence verification and tree-health image analysis
Intelligent species recommendations and duplicate/fraud detection
Predictive survival analysis from health-log history and environmental data
Automated caretaker reminders/notifications
Advanced geospatial analytics and a larger public-facing impact dashboard
V1 establishes a reliable, verified data and workflow foundation; V2 adds intelligence only on top of that foundation.
12. Risks and Mitigations
Risk
Mitigation
Land-data / API availability
Use source-aware, admin-assisted records where authoritative API access is unavailable.
External API limits or downtime
Backend abstraction, caching where appropriate, graceful fallback and clear “data unavailable” states.
Incorrect suitability assumptions
Transparent deterministic rules, documented assumptions and manual expert validation.
Fake plantation evidence
Manual verification in V1; AI-based verification deferred to V2.
GPS inaccuracy
Allow manual map-pin adjustment after auto-capture.
Low caretaker engagement
Keep QR health logging under 30 seconds with minimal required fields.
Verification bottleneck
One-click approve/reject reviewer UI; cap pilot scale to keep review load realistic.
Privacy
Never expose private contact information on public QR/tree profile pages.
Scope creep
Freeze V1 scope; defer AI and advanced analytics explicitly to V2.
Semester time constraints
Milestone-based delivery with a dedicated final buffer week.
13. Expected Outcomes
A centralised plantation record — each verified tree has a structured record of species, location, date, evidence and verification status.
A digital tree identity — each verified tree is accessible through a unique Tree ID and QR code.
A traceable health history — the system maintains health updates over time rather than a single planting claim.
More credible plantation statistics — dashboard metrics are based on verified records rather than raw self-reported counts.
A reusable dataset — structured plantation and health data that can support V2’s intelligent features.
A repeatable workflow — a reference system for future campus or community plantation drives.
14. Summary
EcoRevive is a deployable, full-stack plantation lifecycle platform connecting informed site assessment, plantation registration, manual verification, digital tree identity, health monitoring and impact tracking. Its engineering value lies in a modular three-tier architecture (React, Node.js/Express, PostgreSQL/PostGIS), source-aware geospatial data handling, a role-based verification and audit workflow, QR-based digital identity, CI/CD-backed iterative delivery, and measurable, attributable evaluation metrics — particularly the 48-hour Verified Registration Rate and observed survival status — validated through a small semester pilot. V1 is intentionally deterministic and AI-independent; V2 introduces AI-assisted features only once reliable verified data and workflows exist.