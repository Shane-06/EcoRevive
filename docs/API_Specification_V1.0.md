EcoRevive — API Specification
REST API Contract • V1.0 • August 2026
Purpose: freeze the frontend/backend contract so implementation models cannot invent routes, permissions, payloads, lifecycle behavior, or response structures.
1. Document Control
Field
Value
System
EcoRevive
Document
API Specification
Version
V1.0
Scope
Semester V1
References
EcoRevive PRD V1.0; SRS V1.0; System Architecture V1.0; Database Design V1.0; Project Proposal, August 2026
API style
REST over HTTPS with JSON responses; multipart/form-data for media upload endpoints where specified
Backend
Node.js + Express.js, JavaScript, modular monolith
Authority
This document is the API-level source of truth for V1
2. API Contract Rules
All application API routes use the /api/v1 prefix.
JSON is the default request/response format. Media upload endpoints use multipart/form-data.
Frontend communicates with EcoRevive through this API; it does not connect directly to PostgreSQL.
Frontend does not directly call external environmental APIs.
Backend is authoritative for authentication, authorization, validation, workflow state, Tree ID issuance, and data integrity.
Tree ID is issued only after a plantation becomes Verified.
QR payload contains only a Tree ID or public profile identifier/URL; never credentials or private contact information.
Public endpoints expose only privacy-safe fields.
Do not return password_hash, JWT secrets, provider credentials, or internal database credentials.
Exact external provider URLs are implementation details inside backend integrations and are not exposed as frontend contracts.
Unknown fields should not be invented by the client. Server validation defines accepted fields.
Where this document marks a behavior as an open decision, the coding model must not silently decide it; resolve it before implementation.
3. Base URL and Conventions
Development: http://localhost:<PORT>/api/v1
Staging/production: https://<configured-host>/api/v1
Convention
Rule
IDs
Internal database IDs are not required to be exposed when a public Tree ID is sufficient.
Dates
ISO-8601 date/time strings in UTC for timestamps; planting date is ISO calendar date (YYYY-MM-DD).
Coordinates
Latitude/longitude represented as JSON numbers in WGS84; database stores PostGIS geometry.
Content-Type
application/json unless endpoint explicitly requires multipart/form-data.
Authentication
Authorization: Bearer <JWT> for protected endpoints.
Pagination
Use page/pageSize for list endpoints unless a specific endpoint defines otherwise.
Errors
Use consistent error envelope described below.
4. Authentication Model
Authorization: Bearer <JWT>JWT → Authentication Middleware → Authenticated User Context → RBAC Middleware → Controller/Service
Role
Code
Meaning
Contributor
contributor
Can register plantations, view own records, and receive rewards.
Caretaker
caretaker
Can perform authorized health monitoring; may also be contributor if the account is assigned both capabilities by the approved role model.
Admin/Coordinator
admin
Can review and verify/reject submissions and access coordinator functionality.
The final role-assignment model must not silently introduce multiple-role arrays or a second role system. If dual contributor+caretaker accounts are required, the implementation decision must be explicitly frozen.
5. Standard Response Envelope
Success:{  "success": true,  "data": { ... }}Error:{  "success": false,  "error": {    "code": "ERROR_CODE",    "message": "Human-readable message",    "details": { ... }  }}
An endpoint may return pagination metadata alongside data when needed.
Error details must not expose secrets or internal stack traces.
Exact error codes below are part of the API contract.
6. Common HTTP Status Codes
Status
Meaning
Usage
200
OK
Successful read/update operation.
201
Created
Successful creation.
400
Bad Request
Malformed or semantically invalid request.
401
Unauthorized
Missing/invalid authentication.
403
Forbidden
Authenticated but not permitted by role/ownership.
404
Not Found
Requested resource does not exist or is not publicly accessible.
409
Conflict
Uniqueness/state conflict.
422
Unprocessable Entity
Validation failure where the server can parse the request but rejects fields.
429
Too Many Requests
Rate limit if enabled.
500
Internal Server Error
Unexpected server failure; response must be safe.
502/503
Provider/Service Unavailable
Controlled external-provider/service failure where applicable.
7. Authentication Endpoints
7.1 Register
Method
POST
Route
/auth/register
Auth
Request
Response
Public
{  "name": "Govind",  "email": "user@example.com",  "password": "..."}
{  "success": true,  "data": {    "user": {      "id": "...",      "name": "...",      "email": "...",      "role": "contributor"    },    "token": "..."  }}
Registration must create a contributor by default unless an explicitly approved account-provisioning mechanism says otherwise.
Never return password_hash.
7.2 Login
Method
POST
Route
/auth/login
Auth
Request
Response
Public
{  "email": "user@example.com",  "password": "..."}
{  "success": true,  "data": {    "user": {      "id": "...",      "name": "...",      "email": "...",      "role": "contributor"    },    "token": "..."  }}
7.3 Current User
Method
GET
Route
/auth/me
Auth
Response
Bearer JWT
{  "success": true,  "data": {    "user": {      "id": "...",      "name": "...",      "email": "...",      "role": "..."    }  }}
8. Map and Spatial API
These endpoints are core to EcoRevive. The backend performs PostGIS queries; the frontend receives normalized geographic data.
8.1 Map Markers / Viewport
Method
Route
Auth
GET
/trees/map
Public
GET /api/v1/trees/map?minLat=30.60&minLng=76.70&maxLat=30.70&maxLng=76.85
Query Parameter
Required
Meaning
minLat
Yes
Minimum latitude.
minLng
Yes
Minimum longitude.
maxLat
Yes
Maximum latitude.
maxLng
Yes
Maximum longitude.
page
No
Default 1.
pageSize
No
Default implementation limit; must be capped server-side.
{  "success": true,  "data": {    "trees": [      {        "treeId": "ER-PLT-00482",        "species": "Neem",        "latitude": 30.65,        "longitude": 76.78,        "status": "Verified"      }    ],    "pagination": {      "page": 1,      "pageSize": 50,      "total": 1    }  }}
Only fields safe for map display are returned.
Map retrieval must use spatial database logic, not fetch-all-and-filter in JavaScript.
8.2 Nearby Trees
Method
Route
Auth
GET
/trees/nearby
Public
GET /api/v1/trees/nearby?lat=30.65&lng=76.78&radiusMeters=1000
Parameter
Required
Rule
lat
Yes
Valid WGS84 latitude.
lng
Yes
Valid WGS84 longitude.
radiusMeters
Yes
Positive bounded number; server applies safe maximum.
{  "success": true,  "data": {    "trees": [      {        "treeId": "ER-PLT-00482",        "species": "Neem",        "latitude": 30.651,        "longitude": 76.781,        "distanceMeters": 132.4,        "status": "Verified"      }    ]  }}
8.3 Tree Location
Method
Route
Auth
GET
/trees/:treeId/location
Public
{  "success": true,  "data": {    "treeId": "ER-PLT-00482",    "latitude": 30.651,    "longitude": 76.781  }}
Public precision must follow the separately approved privacy rule. Until frozen, do not invent a reduced precision algorithm.
9. Environmental Information API
9.1 Location Assessment Data
Method
Route
Auth
GET
/environment
Public
GET /api/v1/environment?lat=30.65&lng=76.78
{  "success": true,  "data": {    "location": {      "latitude": 30.65,      "longitude": 76.78    },    "weather": {      "status": "available",      "source": "Open-Meteo",      "verifiedAt": "2026-08-31T12:00:00Z",      "data": { }    },    "soil": {      "status": "available",      "source": "ISRIC SoilGrids",      "verifiedAt": "2026-08-31T12:00:00Z",      "data": { }    },    "terrain": {      "status": "unavailable",      "source": null,      "verifiedAt": null,      "data": null    },    "land": {      "status": "unavailable",      "source": null,      "verifiedAt": null,      "data": null    },    "water": {      "status": "unavailable",      "source": null,      "verifiedAt": null,      "data": null    }  }}
Provider-specific response schemas are normalized into the above conceptual structure.
Do not fabricate data for unavailable categories.
Source and verification metadata should be included where available.
Frontend never calls Open-Meteo, SoilGrids, or other external providers directly.
10. Species and Suitability API
10.1 Species List
Method
Route
Auth
GET
/species
Public
{  "success": true,  "data": {    "species": [      {        "name": "Neem",        "soilType": "Well-drained loam",        "minSpacingMeters": 6,        "sunlight": "Full sun",        "waterNeed": "Low"      }    ]  }}
The response contains only approved suitability-rule information; do not expose internal database implementation details.
10.2 Suitability Assessment
Method
Route
Auth
GET
/suitability
Public
GET /api/v1/suitability?lat=30.65&lng=76.78&species=Neem
{  "success": true,  "data": {    "species": "Neem",    "location": {      "latitude": 30.65,      "longitude": 76.78    },    "checks": {      "soil": {        "status": "suitable",        "reason": "..."      },      "sunlight": {        "status": "suitable",        "reason": "..."      },      "water": {        "status": "moderate",        "reason": "..."      },      "spacing": {        "status": "suitable",        "reason": "..."      }    },    "overall": {      "status": "suitable",      "explanation": "..."    }  }}
Suitability is deterministic.
Unavailable environmental inputs must be represented as unavailable/insufficient, not guessed.
The exact status vocabulary and overall-combination algorithm must be frozen in the final implementation decision before coding if not otherwise specified.
11. Plantation / Tree APIs
11.1 Create Plantation
Method
Route
Auth
POST
/trees
Bearer JWT — contributor
Content-Type: multipart/form-dataspecies: "Neem"latitude: 30.65longitude: 76.78plantedOn: "2026-08-31"notes: "Optional note"photo: <image file>
{  "success": true,  "data": {    "tree": {      "id": "...",      "treeId": null,      "species": "Neem",      "latitude": 30.65,      "longitude": 76.78,      "plantedOn": "2026-08-31",      "status": "Pending",      "photoReference": "...",      "createdAt": "2026-08-31T12:00:00Z"    }  }}
treeId is null at registration because permanent identity is issued after verification.
Backend validates coordinates and authenticated contributor identity.
11.2 My Plantations
Method
Route
Auth
GET
/trees/mine
Bearer JWT — contributor
GET /api/v1/trees/mine?page=1&pageSize=20
11.3 Tree Detail
Method
Route
Auth
GET
/trees/:treeId
Public if verified; protected otherwise
Verified tree profile may be public.
Pending/Under Review/Rejected records must not become public merely because a Tree ID or internal identifier is guessed.
Exact non-public owner view should use an authenticated endpoint if required by the final UI/API implementation.
Verified response:{  "success": true,  "data": {    "tree": {      "treeId": "ER-PLT-00482",      "species": "Neem",      "plantedOn": "2026-08-31",      "status": "Verified",      "latitude": 30.651,      "longitude": 76.781,      "contributor": {        "displayName": "Anonymous"      },      "currentHealth": null,      "healthHistory": []    }  }}
12. Verification APIs — Admin/Coordinator
12.1 Review Queue
Method
Route
Auth
GET
/admin/verifications
Bearer JWT — admin
GET /api/v1/admin/verifications?status=Pending&page=1&pageSize=20
12.2 Start Review
Method
Route
Auth
PATCH
/admin/verifications/:treeId/start
Bearer JWT — admin
{  "success": true,  "data": {    "treeId": "ER-PLT-00482",    "status": "Under Review"  }}
12.3 Approve
Method
Route
Auth
PATCH
/admin/verifications/:treeId/approve
Bearer JWT — admin
{  "success": true,  "data": {    "tree": {      "treeId": "ER-PLT-00482",      "status": "Verified"    },    "identity": {      "treeId": "ER-PLT-00482"    }  }}
If the Tree ID is generated at approval, the response may expose it immediately. The backend must ensure generation is atomic and unique.
12.4 Reject
Method
Route
Auth
PATCH
/admin/verifications/:treeId/reject
Bearer JWT — admin
{  "reason": "Evidence does not sufficiently demonstrate the plantation."}
{  "success": true,  "data": {    "treeId": "ER-PLT-00482",    "status": "Rejected",    "reason": "Evidence does not sufficiently demonstrate the plantation."  }}
Reason is required for rejection.
Reviewer and timestamp are generated server-side.
Only admin/coordinator may perform these operations.
13. Tree Identity and QR APIs
13.1 Public Tree Profile
Method
Route
Auth
GET
/public/trees/:treeId
Public
This is the canonical public profile endpoint. It must return only privacy-safe information for a Verified tree.
13.2 QR Data
Method
Route
Auth
GET
/public/trees/:treeId/qr
Public
{  "success": true,  "data": {    "treeId": "ER-PLT-00482",    "profileUrl": "https://<configured-host>/tree/ER-PLT-00482"  }}
The backend may return a QR image/file through a dedicated representation if the implementation chooses; the public identity content must remain only the safe identifier/profile reference.
Do not put private data into QR.
14. Health Monitoring APIs
14.1 Create Health Log
Method
Route
Auth
POST
/trees/:treeId/health-logs
Bearer JWT — caretaker
Content-Type: multipart/form-datahealthStatus: "..."notes: "..."photo: <image file, if provided>
{  "success": true,  "data": {    "healthLog": {      "id": "...",      "treeId": "ER-PLT-00482",      "healthStatus": "...",      "photoReference": "...",      "notes": "...",      "recordedAt": "2026-09-01T10:00:00Z",      "submittedBy": {        "id": "...",        "name": "..."      }    }  }}
The exact health-status enumeration is an open decision and must be frozen before implementation.
Timestamp is generated/validated server-side; do not trust client timestamp for audit-critical event time.
Health log is append-oriented.
14.2 Health History
Method
Route
Auth
GET
/trees/:treeId/health-logs
Public for verified profile; protected for non-public trees
GET /api/v1/trees/ER-PLT-00482/health-logs?page=1&pageSize=20
History is chronological according to the final documented ordering rule; default should be newest-first for dashboard/profile retrieval unless the UI requires oldest-first.
Missing logs do not mean death.
15. Rewards APIs
15.1 User Rewards
Method
Route
Auth
GET
/rewards/me
Bearer JWT
{  "success": true,  "data": {    "totalPoints": 120,    "activities": [      {        "activity": "Verified plantation",        "points": 50,        "createdAt": "2026-08-31T12:00:00Z"      }    ]  }}
Exact reward rules/point values are not frozen by the current project documents. The backend must not invent a reward economy while implementing this endpoint; freeze those values in the reward decision before coding.
16. Dashboard APIs
16.1 Coordinator Dashboard
Method
Route
Auth
GET
/admin/dashboard
Bearer JWT — admin
{  "success": true,  "data": {    "plantations": {      "total": 50,      "verified": 42,      "pending": 5,      "underReview": 2,      "rejected": 1    },    "health": {      "treesWithHealthLogs": 35    },    "rewards": {      "totalPointsIssued": 1800    }  }}
Counts must be derived from authoritative database records.
The dashboard must not claim survival for trees without valid final health checks.
16.2 Contributor Dashboard
Method
Route
Auth
GET
/dashboard/me
Bearer JWT
Return only the authenticated user's permitted aggregate and activity data.
17. Ownership and Authorization Matrix
Endpoint Group
Public
Contributor
Caretaker
Admin
Auth register/login
✓
✓
✓
✓
Map/verified markers
✓
✓
✓
✓
Environmental/suitability
✓
✓
✓
✓
Create plantation
—
✓
—
—
Own plantations
—
✓
—
Admin may access through coordinator workflows
Verification queue/actions
—
—
—
✓
Verified public profile
✓
✓
✓
✓
Create health log
—
—
✓
Admin only if explicitly approved; not assumed
Health history of verified tree
✓
✓
✓
✓
Own rewards
—
✓
✓
✓
Coordinator dashboard
—
—
—
✓
This matrix assumes the project role model described by the proposal/SRS. If a user needs multiple roles simultaneously, that role model must be explicitly frozen before implementation.
18. State Transition API Rules
Current State
Operation
Next State
Authorized Role
Pending
Start review
Under Review
Admin
Under Review
Approve
Verified
Admin
Under Review
Reject
Rejected
Admin
Clients cannot directly PATCH arbitrary tree.status.
State transitions must be implemented through dedicated backend operations/service logic.
Invalid transitions return 409 Conflict or an equivalent documented state error.
Tree ID issuance is coupled to successful verification.
19. Error Codes
Code
Meaning
VALIDATION_ERROR
Request failed input validation.
AUTH_REQUIRED
Authentication is required.
INVALID_TOKEN
JWT is invalid/expired.
FORBIDDEN
Authenticated user lacks required permission.
NOT_FOUND
Resource not found or not publicly accessible.
INVALID_COORDINATES
Latitude/longitude is invalid.
INVALID_STATE_TRANSITION
Requested lifecycle transition is not permitted.
TREE_ID_CONFLICT
Tree identity uniqueness conflict.
EXTERNAL_DATA_UNAVAILABLE
External environmental source unavailable.
UNSUPPORTED_SPECIES
Species is not in the approved rule set.
MEDIA_INVALID
Uploaded media does not satisfy validation.
DUPLICATE_RESOURCE
Request conflicts with an existing unique resource.
INTERNAL_ERROR
Unexpected server error.
20. Validation Rules
Latitude must be between -90 and 90.
Longitude must be between -180 and 180.
Coordinates must be converted/stored consistently as WGS84/PostGIS Point.
Species must resolve to an approved species/rule identity.
Planting date must be a valid calendar date.
Required registration evidence must be present according to the final media contract.
Rejection requires a reason.
Tree ID is server-generated and cannot be supplied by a client as an authoritative value.
Health status must use the frozen approved enumeration.
Pagination parameters must be bounded server-side.
All protected operations validate authentication and authorization on the server.
21. Media Upload Contract
Endpoint
Media
Rule
POST /trees
Plantation evidence photo
multipart/form-data; server validates file.
POST /trees/:treeId/health-logs
Health photo
multipart/form-data; server validates file.
Exact file type, maximum size, image-processing policy, and storage provider must be frozen before implementation.
Never trust a client-provided MIME type alone for security-sensitive validation.
Store a media reference in the database rather than unnecessarily embedding large binaries in transactional rows.
22. External API Failure Behavior
External provider succeeds    ↓Normalize    ↓Return data + source metadataExternal provider fails    ↓Catch/normalize failure    ↓Return status = "unavailable"    ↓Suitability marks affected component unavailable    ↓No fabricated value
A weather failure must not automatically make the entire map unavailable.
A soil failure must not be converted into a guessed soil type.
Provider-specific errors must not leak credentials or raw sensitive provider responses.
23. API Security Rules
Use HTTPS outside local development.
JWT must be validated server-side.
Authorization must be server-side.
Rate limiting may be added as infrastructure protection but is not a product requirement unless explicitly enabled.
Validate request bodies, query parameters, route parameters, and uploaded media.
Use parameterized database queries/ORM protections.
Never return password_hash.
Never expose external provider credentials.
Public endpoints must select only public fields.
Do not accept treeId as a trusted client-generated identity during registration.
24. API Testing Requirements
Test Group
Required Cases
Auth
Register, duplicate account, valid login, invalid login, invalid/expired token.
RBAC
Contributor cannot verify; caretaker cannot verify; admin can verify.
Map
Viewport query, nearby query, invalid coordinates, spatial response normalization.
Environment
Successful providers, partial provider failure, complete failure, source metadata.
Suitability
Supported species, unsupported species, compatible inputs, mismatch, unavailable input.
Registration
Valid multipart submission, missing required fields, invalid coordinates, initial Pending.
Verification
Valid transitions, invalid transitions, rejection reason, audit fields.
Tree ID
No ID before verification, unique ID after verification, stable ID, concurrent issuance protection.
QR/Public
Safe payload, verified profile, private data exclusion.
Health
Authorized creation, invalid status, history persistence, missing log not treated as death.
Dashboard
Correct aggregation from database records.
25. API Versioning and Backward Compatibility
V1 routes use /api/v1.
Do not silently change request/response field meanings after frontend integration.
Breaking API changes require a versioned contract change and corresponding frontend updates.
Deprecated endpoints, if ever introduced, must have an explicit migration plan.
26. API Implementation Rules for Coding Models
Implement routes only from this specification; do not create duplicate synonymous routes.
Keep controllers thin and business logic in services.
Keep provider-specific logic inside integrations/adapters.
Keep database queries in repositories/data-access modules.
Do not let controllers directly call external providers.
Do not let frontend call external providers.
Do not let frontend decide authorization.
Do not let frontend generate authoritative Tree IDs.
Do not allow arbitrary status updates from the client.
Do not expose private fields through public endpoints.
Do not invent exact health statuses, reward values, media limits, or public-location precision when they remain open decisions.
27. Open API Decisions — Must Be Frozen Before Implementation
Exact JWT expiry and refresh-token strategy.
Exact role model if a single user must simultaneously hold contributor and caretaker permissions.
Exact Tree ID format/prefix/sequence policy.
Exact health-status enumeration.
Exact public location precision.
Exact media file types and size limits.
Exact media storage provider and signed/public URL strategy.
Exact suitability status vocabulary and overall decision algorithm.
Exact reward point values and badge thresholds.
Exact pagination defaults/maxima.
Exact rate limits if enabled.
Exact resubmission/re-review API for rejected plantations; not currently part of V1.
These are intentionally isolated as open decisions. A coding model must stop and request the approved decision rather than making up a product rule.
28. Canonical API Flow — Map to Tree Identity
GET /api/v1/trees/map        ↓User selects location        ↓GET /api/v1/environment?lat=...&lng=...        ↓GET /api/v1/suitability?lat=...&lng=...&species=...        ↓POST /api/v1/trees        ↓Pending        ↓PATCH /api/v1/admin/verifications/:treeId/start        ↓Under Review        ↓PATCH /api/v1/admin/verifications/:treeId/approve        ↓Verified + Tree ID        ↓GET /api/v1/public/trees/:treeId        ↓GET /api/v1/public/trees/:treeId/qr        ↓POST /api/v1/trees/:treeId/health-logs        ↓GET /api/v1/trees/:treeId/health-logs
29. API Definition of Done
All required V1 endpoint groups are implemented according to this contract.
Authentication and RBAC are enforced server-side.
Map endpoints use PostGIS-backed spatial queries.
Environmental information is backend-mediated and normalized.
Suitability is deterministic.
Registration creates Pending records.
Verification uses explicit state transitions.
Verified trees receive unique stable Tree IDs through backend/database logic.
QR/public endpoints expose only safe identity information.
Health logs are append-oriented and retrievable as history.
Dashboard/reward endpoints use authoritative records.
Validation and error envelopes are consistent.
Core API tests pass.
No unresolved open decision is silently implemented as a product rule.
30. Relationship to Other Documents
Document
Role
PRD V1.0
Product requirements and scope.
SRS V1.0
Detailed software behavior.
System Architecture V1.0
System/module/data-flow boundaries.
Database Design V1.0
Persistence and integrity model.
API Specification V1.0
Frontend/backend contract.
Testing Strategy
Test matrix and CI validation.
Milestone Roadmap
Implementation order and GitHub checkpoints.
31. Final API Principle
The EcoRevive API is the controlled boundary between the user interface, business logic, database, and external environmental providers. The API must make the plantation lifecycle explicit, keep spatial/environmental operations backend-owned, preserve verification and monitoring history, and make verified Tree identity trustworthy and privacy-safe.