# EcoRevive V2 — Product Requirements Document (PRD)

**Document Version:** 2.0  
**Status:** Draft — Pending Architecture Freeze  
**Product:** EcoRevive  
**Release:** V2  
**Document Type:** Product Requirements Document  
**Primary Objective:** Extend EcoRevive with a grounded AI knowledge assistant and explainable tree-health intelligence while preserving the reliability, security, and existing functionality of V1.

---

## 1. Executive Summary

### 1.1 Product Overview

EcoRevive is an environmental management platform designed to support tree plantation activities, plantation assessments, evidence collection, administrative verification, tree identification, health monitoring, and reward tracking.

EcoRevive V1 establishes the operational foundation for managing this lifecycle through a role-based web application, REST APIs, and a PostgreSQL/PostGIS database.

EcoRevive V2 will extend this foundation through two capabilities:

**Feature A — EcoGuide:** A contextual knowledge assistant that helps users understand EcoRevive, its workflows, approved environmental guidance, and their own authorized platform data. It will use retrieval-augmented generation (RAG) to ground answers in approved information and permission-checked backend services to retrieve relevant live data.

**Feature B — Tree Health Intelligence:** An explainable analytical feature that evaluates existing tree-health observations to identify health trends, monitoring gaps, and appropriate follow-up actions. Its initial implementation will use deterministic rules rather than machine learning.

V2 must make AI useful to real users without introducing unnecessary complexity, unsupported claims, or unreliable environmental predictions.

### 1.2 Product Vision

Make EcoRevive easier to understand and operate while helping users interpret tree-health records and identify where monitoring attention is needed.

### 1.3 Core Principles

1. **Extend, do not rebuild:** Preserve the existing V1 architecture and workflows.
2. **Ground every AI answer:** Use approved knowledge and authorized platform data.
3. **Deterministic decisions:** Authentication, authorization, health classifications, and database mutations must never be delegated to an LLM.
4. **Explainability:** Health insights must be traceable to actual observations and explicit rules.
5. **Privacy by design:** Send only the minimum necessary information to an AI provider.
6. **Graceful degradation:** If an AI provider fails, the existing application and deterministic health analysis must continue to work.
7. **Incremental implementation:** Implement one milestone at a time, with tests and review before proceeding.

---

## 2. Product Scope

### 2.1 In Scope

**EcoGuide**
- Natural-language assistance for EcoRevive workflows.
- Answers grounded in a curated, versioned knowledge corpus.
- Source references for knowledge-based answers.
- Role-aware guidance for contributors, caretakers, and administrators.
- Permission-checked retrieval of relevant live application data.
- Clear handling of missing, conflicting, or insufficient information.
- An assistant interface integrated into the existing frontend.
- Safe handling of prompt injection, untrusted conversation history, and malformed requests.
- Backend-controlled AI-provider integration.

**Tree Health Intelligence**
- Analysis of existing health observations.
- Classification of recent health trends.
- Identification of missing or overdue monitoring records.
- Evidence-backed follow-up recommendations.
- Role-scoped access to individual-tree and aggregate health insights.
- Explainable deterministic calculations.
- Paginated API responses and frontend presentation.
- Unit, integration, security, and regression tests.

**Shared platform requirements**
- Reuse the existing authentication and role-based authorization system.
- Reuse existing database models and business services wherever possible.
- Introduce database migrations only when necessary and approved.
- Maintain the existing modular-monolith architecture.
- Update technical documentation, API documentation, and testing documentation.

### 2.2 Explicitly Out of Scope

The following must not be added to V2:

- Image-based tree disease detection or computer vision.
- ML-based prediction of future tree survival or mortality.
- Training custom AI or ML models.
- Autonomous planting, verification, or administrative decisions.
- Automatic changes to tree-health statuses.
- Automatic creation or assignment of tree IDs.
- Automatic reward calculation or distribution by the LLM.
- Autonomous database writes performed by an AI agent.
- Arbitrary SQL generation or execution by an LLM.
- A separate microservice solely for AI functionality.
- A new vector database unless a separately approved architectural decision demonstrates a genuine need.
- Persistent server-side chat-history storage in the initial release.
- A new notification system or caretaker assignment model.
- Additional AI dashboards, impact predictions, or unrelated analytics.
- Changes to the existing V1 lifecycle or role definitions without explicit approval.

### 2.3 Scope Control

Any feature not explicitly included in this PRD is out of scope until a documented change is reviewed and approved. Antigravity must not expand the scope simply because a feature is technically feasible.

---

## 3. Existing System and Architectural Constraints

### 3.1 Existing Architecture

| Layer | Existing Technology |
|---|---|
| Frontend | React, Vite, JavaScript, Tailwind CSS |
| Routing | React Router |
| Mapping | Leaflet and OpenStreetMap |
| Backend | Node.js and Express.js |
| API style | REST |
| Authentication | JWT-based authentication |
| Authorization | Role-based access control |
| Database | PostgreSQL |
| Geospatial capabilities | PostGIS |
| External data | Open-Meteo and ISRIC SoilGrids through the backend |
| Testing | Existing frontend and backend test suites |
| Code quality | Existing linting and production-build checks |

V2 must preserve this stack unless an architectural change is explicitly approved during V2-M0.

### 3.2 Existing Lifecycle

EcoRevive's lifecycle contains nine stages:

1. DISCOVER
2. ASSESS
3. PLANT
4. PROVE
5. VERIFY
6. IDENTIFY
7. MONITOR
8. REWARD
9. TRACK

V2 must not remove, rename, reorder, or bypass these stages. EcoGuide may explain the lifecycle but cannot independently approve a stage or change its state. Tree Health Intelligence must use existing monitoring records and must not create a competing lifecycle.

### 3.3 Existing Roles

- **Contributor:** Participates in plantation activities and accesses permitted records.
- **Caretaker:** Performs permitted monitoring and related operational activities.
- **Admin/Coordinator:** Has administrative permissions defined by the existing application.

V2 must reuse these roles and must not introduce new roles merely to support AI.

### 3.4 Existing Tree Identification Rules

Tree IDs are generated only through the existing backend/database process after required administrative verification. EcoGuide must never invent a Tree ID, issue a new ID, or claim that a tree has been verified without checking authorized application data.

### 3.5 Architectural Requirements

- Maintain a modular monolith.
- Keep AI-provider credentials on the backend.
- Keep database access inside existing backend services and repositories.
- Reuse existing authentication middleware, validation, and error-handling conventions.
- Keep business rules independent of the LLM provider.
- Avoid duplicating existing tree, plantation, health-observation, or user models.
- Do not hold database transactions open while waiting for an LLM response.
- Preserve existing V1 API contracts unless a change is explicitly approved.
- Inspect the actual repository before deciding file names, schemas, or routes.

Suggested file paths and service names are guidance, not permission to duplicate existing implementations.

---

## 4. Users and User Requirements

### 4.1 Contributor

The contributor needs to:
- Understand how to use EcoRevive and the meaning of plantation and verification stages.
- Learn how to interpret available environmental suitability information.
- Understand their own authorized plantation and tree records.
- See understandable health trends for trees they may access.
- Know when monitoring information is missing or overdue.
- Receive recommendations grounded in available information.

Contributors must not access other users' private records unless existing authorization rules explicitly allow it.

### 4.2 Caretaker

The caretaker needs to:
- Understand the monitoring workflow.
- Review permitted tree-health histories.
- Identify worsening or incomplete monitoring histories.
- Understand which observations support an insight.
- Receive actionable follow-up recommendations.

Caretakers may access only trees and monitoring data allowed by existing permissions. V2 must not invent an assignment model.

### 4.3 Admin/Coordinator

The administrator needs to:
- Understand documented workflows and business rules.
- Review authorized tree-health insights across the permitted platform scope.
- Identify monitoring gaps.
- Explain how a health insight was derived.
- Access relevant operational information without unsupported AI conclusions.

EcoGuide must not replace administrative review, verification, or approval.

---

## 5. Feature A — EcoGuide: Contextual Knowledge Assistant

### 5.1 Objective

EcoGuide provides a conversational interface for understanding EcoRevive and retrieving relevant, authorized information. It must be a grounded assistant, not an unrestricted chatbot.

### 5.2 Supported Question Categories

**A. Platform guidance**

Examples:
- How does the EcoRevive lifecycle work?
- What happens during verification?
- How is a tree ID generated?
- What information is collected during monitoring?
- What can my role do in the application?

Answers must be based on approved product documentation and actual implemented behavior.

**B. Environmental guidance**

Examples:
- What factors should be considered before planting a tree?
- How should soil and weather information be interpreted?
- What limitations apply to the environmental suitability information displayed by EcoRevive?

Environmental guidance must be supported by approved sources. EcoGuide must not present generic guidance as a verified result for a specific location.

**C. Authorized personal and operational data**

Examples:
- What is the latest health status of a tree I can access?
- What monitoring records are available for my plantation?
- Why is a particular monitoring record considered overdue?
- What evidence supports the latest health insight?

These questions require authorized retrieval from the backend. The LLM must not guess the answer from conversation history.

**D. Unsupported questions**

If information is absent, ambiguous, or outside the supported scope, EcoGuide must say so. It may explain what information is needed or direct the user to the appropriate workflow.

### 5.3 Knowledge Corpus

EcoGuide must use a curated, versioned knowledge corpus.

Potential approved sources:
- EcoRevive PRD and SRS.
- Architecture and database documentation.
- API specifications.
- User-facing workflow documentation.
- Approved environmental guidance.
- Approved operational policies.
- Reviewed FAQ content.

The system must not automatically treat arbitrary uploaded documents, user messages, source-code comments, or untrusted external content as authoritative.

Each indexed knowledge item should preserve suitable metadata:
- Document title.
- Source identifier.
- Document version.
- Section or heading.
- Relevant content.
- Publication or approval status.
- Last-updated timestamp.

Only approved, current content should be eligible for normal retrieval.

### 5.4 Retrieval Strategy

The initial implementation should use PostgreSQL full-text search over the approved knowledge corpus.

Requirements:
1. Search the corpus using a normalized user query.
2. Retrieve relevant approved passages.
3. Apply a bounded result count and size limit.
4. Preserve source and section metadata.
5. Supply retrieved passages to the LLM as untrusted reference material, not executable instructions.
6. Generate an answer grounded in retrieved material.
7. Return source references when knowledge documents support the answer.

A separate vector database is not required for V2. If PostgreSQL full-text search proves inadequate, an alternative must be proposed and justified during a later architecture review.

### 5.5 Response Generation Pipeline

1. Authenticate the request.
2. Validate the message and request size.
3. Apply rate limits and request controls.
4. Establish the user's role and authorized data scope.
5. Classify the question into an allowed request category.
6. Retrieve relevant knowledge passages.
7. If necessary, call a specific authorized backend data-retrieval service.
8. Construct a bounded prompt containing the user's question, relevant evidence, and safety instructions.
9. Call the configured LLM provider.
10. Validate and format the response.
11. Return the answer, available source references, and a response status.

Authorization must be enforced by the backend before protected information is retrieved. The model must not determine whether a user is allowed to access a record.

### 5.6 Chat Interface

The frontend should integrate EcoGuide into the existing EcoRevive interface and include:
- A clear assistant entry point.
- A chat panel or dedicated assistant page consistent with the existing frontend design.
- Message input and send action.
- Loading and error states.
- Readable response formatting.
- Source references where available.
- Clear indication when an answer cannot be verified.
- Role-appropriate suggested questions.
- A way to start a fresh conversation.

The interface must work on desktop and mobile layouts and follow the current EcoRevive visual system.

### 5.7 Conversation History

For the initial release:
- Do not introduce persistent server-side conversation-history storage.
- The frontend may send short, bounded history to preserve conversational context.
- Treat all client-supplied history as untrusted input.
- Validate message roles and lengths.
- Limit the number of previous messages and total context size.
- Do not allow history to override authorization or trusted system instructions.
- Do not assume that a previous answer remains correct without checking current data.

Precise request limits must be established during V2-M0.

### 5.8 API Contract

**Proposed endpoint:** `POST /api/v1/ai/chat`

The final route must be reconciled with existing API conventions during V2-M0.

Example request:

```json
{
  "message": "Explain the latest health trend for a tree I can access.",
  "history": []
}
```

Example successful response:

```json
{
  "answer": "The latest available observations indicate a worsening trend. Two consecutive observations show increasing severity.",
  "sources": [
    {
      "type": "health_insight",
      "treeId": "ER-PLT-XXXXX"
    }
  ],
  "status": "success"
}
```

The example Tree ID is illustrative only. Actual responses must use a real, authorized record or omit the reference.

Possible response states include `success`, `insufficient_information`, and `provider_unavailable`. The final schema must follow existing API and error-response conventions.

### 5.9 Grounding and Reliability Requirements

EcoGuide must:
- Distinguish documented facts from general explanations.
- Provide source references for knowledge-based claims when applicable.
- Retrieve live information when a question requires current application data.
- State when no matching knowledge or record is available.
- Avoid fabricating tree IDs, observations, reward totals, verification outcomes, or suitability assessments.
- Avoid claiming that an action was performed when no backend action occurred.
- Avoid representing estimates or general recommendations as verified environmental results.
- Avoid inventing sources or citation locations.

An answer without sufficient evidence must explain the limitation rather than manufacture a plausible response.

### 5.10 EcoGuide Acceptance Criteria

- Authenticated users can submit supported questions.
- Answers use approved retrieved knowledge where applicable.
- Relevant source references are returned.
- Unsupported questions produce an honest limitation response.
- Live-data questions use authorized backend services.
- Users cannot retrieve unauthorized information through prompt manipulation.
- Provider credentials never reach the frontend.
- Provider failures return controlled errors.
- No persistent chat-history database is introduced.
- Existing V1 workflows continue to function.
- Automated tests cover success, insufficient evidence, invalid input, authorization, and provider failures.

---

## 6. Feature B — Tree Health Intelligence

### 6.1 Objective

Tree Health Intelligence analyzes existing health observations to provide understandable summaries of tree-health trends and monitoring completeness. It must describe recorded evidence, not claim to diagnose the biological condition of a tree.

### 6.2 Data Sources

Use existing database records and services for:
- Tree identity.
- Tree-to-plantation relationships.
- Health observations.
- Observation timestamps.
- Recorded health status.
- Existing permitted monitoring metadata.

Inspect the actual repository schema before implementation. If a required field does not exist, document the gap and propose the smallest necessary migration. Do not silently create a duplicate health-history model.

### 6.3 Supported Health Statuses

Use the existing status vocabulary:
- `Healthy`
- `Good`
- `Needs Attention`
- `Dead`

No new health statuses may be introduced without explicit approval.

For comparing severity, use this internal ordered mapping:

| Status | Severity |
|---|---:|
| Healthy | 0 |
| Good | 1 |
| Needs Attention | 2 |
| Dead | 3 |

This ordering compares recorded statuses; it is not a calibrated biological risk score or probability of death. The system must not infer `Dead` from missing records, overdue monitoring, or an AI-generated answer.

### 6.4 Trend Analysis

Evaluate the latest three observations when available, ordered by observation timestamp. Define deterministic tie-breaking for identical timestamps, preferably using a stable existing record identifier as a secondary sort key.

**Insufficient history**
- Zero observations: no health record is available.
- One observation: insufficient history to determine a trend.

**Worsening**

Classify as worsening when at least two consecutive severity transitions increase.

Example: `Healthy → Good → Needs Attention`

**Improving**

Classify as improving when at least two consecutive severity transitions decrease.

Example: `Needs Attention → Good → Healthy`

**Stable**

Classify as stable when all statuses in the evaluated observations are the same.

Example: `Good → Good → Good`

**Mixed**

Classify as mixed when observations show changes but do not satisfy improving, worsening, or stable rules.

Example: `Healthy → Needs Attention → Good`

For two observations, an increase in severity is worsening, a decrease is improving, and identical statuses are stable. A mixed classification requires a pattern that cannot be represented by those simpler rules.

Any alternative interpretation must be documented and approved before implementation.

### 6.5 Evidence and Explainability

Every insight must be traceable to actual records. Where applicable, return:
- Latest recorded status.
- Latest observation timestamp.
- Observation IDs or authorized references used.
- Statuses used in the calculation.
- Resulting trend.
- Concise explanation of the applied rule.
- Monitoring classification.
- Recommended next step.

Example: "The latest three observations were Healthy, Good, and Needs Attention. Both consecutive transitions increased in severity, so the trend is classified as worsening."

The explanation must be generated from the deterministic calculation and stored evidence, not invented by an LLM.

### 6.6 Monitoring Completeness

Monitoring classifications must distinguish:
- No health record yet.
- Monitoring up to date.
- Monitoring overdue.

Configuration key: `HEALTH_MONITORING_INTERVAL_DAYS`  
Default: `30` calendar days.

This is an operational monitoring reminder, not a biological rule or universal recommendation for every species.

Requirements:
1. Use the latest valid observation timestamp.
2. Compare it against the current time using a consistent timezone policy.
3. Apply the configured interval.
4. Document exact boundary behavior.
5. Test observations immediately before, at, and after the threshold.
6. Never infer `Dead` from an overdue record.
7. Distinguish missing history from overdue monitoring.

If no health observation exists, the response must say **"No health record yet"**, not classify the tree as dead or unhealthy.

### 6.7 Follow-Up Recommendations

Recommendations must be deterministic, rule-based, and supported by available evidence.

| Condition | Appropriate recommendation |
|---|---|
| No health record | Record the initial health observation through the existing workflow. |
| Insufficient history | Collect further observations before determining a trend. |
| Worsening trend | Review the latest observations and arrange an appropriate follow-up inspection. |
| Improving trend | Continue monitoring according to the applicable operational schedule. |
| Stable trend | Continue monitoring according to the applicable operational schedule. |
| Mixed trend | Review the observation sequence and collect further evidence if necessary. |
| Monitoring overdue | Record an updated observation through the existing monitoring workflow. |
| Latest status is Dead | Follow existing administrative and monitoring procedures for a recorded dead tree. |

Recommendations must not automatically modify a health status or trigger administrative actions. The system must not prescribe watering, fertilizer, pesticide, or treatment unless supported by an approved, sufficiently specific source.

### 6.8 Role-Based Access

**Contributor:** May view insights only for trees or plantations allowed by existing contributor permissions.

**Caretaker:** May view insights for trees and monitoring records allowed by existing caretaker permissions. Do not invent assignments.

**Admin/Coordinator:** May view platform-wide insights to the extent permitted by existing administrative permissions.

Authorization must be enforced in backend services and query scopes. Hiding a frontend link is insufficient.

### 6.9 API Contracts

**Endpoint A — List health insights**

`GET /api/v1/health-intelligence`

Return insights for trees visible to the authenticated user. Requirements:
- Pagination.
- Deterministic ordering.
- Role-scoped results.
- Stable response schema.
- Appropriate empty-result handling.
- No unbounded retrieval of all health histories.
- No unauthorized cross-user data exposure.

**Endpoint B — Individual tree insight**

`GET /api/v1/health-intelligence/trees/:treeId`

Return an insight and supporting observations for a specific authorized tree. Requirements:
- Validate the tree identifier.
- Enforce access control before exposing records.
- Return controlled not-found or access-denied responses consistent with existing security conventions.
- Include evidence needed to explain the result.
- Never invent an observation when history is absent.

Illustrative response:

```json
{
  "treeId": "ER-PLT-XXXXX",
  "latestStatus": "Needs Attention",
  "latestObservationAt": "2026-10-10T10:30:00Z",
  "trend": "worsening",
  "monitoring": {
    "status": "up_to_date",
    "intervalDays": 30
  },
  "evidence": [
    {
      "status": "Healthy",
      "observedAt": "2026-09-01T10:00:00Z"
    },
    {
      "status": "Good",
      "observedAt": "2026-09-20T10:00:00Z"
    },
    {
      "status": "Needs Attention",
      "observedAt": "2026-10-10T10:30:00Z"
    }
  ],
  "recommendation": "Review the latest observations and arrange an appropriate follow-up inspection."
}
```

This is illustrative, not actual tree data. The final schema must align with existing naming conventions and database models.

### 6.10 Health Intelligence Acceptance Criteria

- Trend classifications follow documented deterministic rules.
- Missing history never becomes a `Dead` classification.
- Latest observations are selected consistently.
- Every trend can be explained using supporting records.
- Monitoring boundaries are tested.
- Role-based data restrictions are enforced by the backend.
- Recommendations do not modify records.
- Results are paginated and bounded.
- The feature works without an LLM provider.
- No ML model is introduced.
- Existing V1 health-monitoring workflows remain intact.

---

## 7. Shared AI Architecture

### 7.1 Architectural Approach

EcoGuide and Tree Health Intelligence are related but must not share responsibilities indiscriminately. EcoGuide uses an LLM for grounded natural-language responses. Tree Health Intelligence uses deterministic application logic for classification and recommendations.

The LLM may explain a health insight already calculated by the backend, but it must not calculate or override the official trend.

### 7.2 Proposed Backend Organization

Illustrative organization, subject to repository inspection:

```text
backend/src/
  modules/
    ai/
      routes/
      controllers/
      services/
      providers/
      retrieval/
      validation/
      prompts/
    health-intelligence/
      routes/
      controllers/
      services/
      repositories/
      rules/
```

Existing project conventions take priority. Do not duplicate routers, authentication middleware, configuration modules, validation utilities, or database-access layers that already exist.

### 7.3 LLM Provider Selection

The provider and model must be selected during V2-M0. The architecture review must document:
- Provider and model identifier.
- Official SDK and API documentation.
- Authentication mechanism and supported request/response formats.
- Timeout, retry, and rate-limit behavior.
- Token or request limits.
- Cost implications.
- Data-retention and training policies.
- Available regional and privacy controls.
- Provider outage behavior.
- Local development and automated-test strategy.

Do not invent provider endpoints, SDK methods, environment-variable names, or model capabilities. Verify the chosen provider's current official documentation before implementation.

Keep provider-specific code behind a clean interface.

### 7.4 Configuration and Secrets

Credentials must be backend-only. Configuration should cover, where applicable:
- Provider credentials and model identifier.
- Request timeout.
- Maximum request and output sizes.
- Rate limits.
- Knowledge retrieval limits.
- Health monitoring interval.
- Other approved operational limits.

Document actual variable names in environment-example files after they are chosen. Never commit real secrets, return credentials in API responses, or log secrets or complete sensitive prompts.

### 7.5 Provider Failure

If the LLM provider is unavailable:
- EcoGuide returns a controlled, understandable failure response.
- The existing application remains usable.
- Health Intelligence continues to work.
- No partially executed database mutation occurs.
- No fabricated fallback answer is presented as model-generated.

Use bounded timeouts and limited retries. Retries must not amplify outages or create uncontrolled costs.

### 7.6 Separation of Responsibilities

The following remain deterministic backend responsibilities:
- Authentication and authorization.
- User and role identification.
- Record ownership and access checks.
- Tree-ID validation and generation.
- Verification and approval.
- Health-trend calculations.
- Monitoring-interval calculations.
- Reward calculations.
- Database writes.
- API schema validation.

The LLM may interpret a question and formulate an explanation, but it must not become the authority for these operations.

---

## 8. Security, Privacy, and Abuse Prevention

### 8.1 Authentication and Authorization

- All protected V2 endpoints use existing authentication.
- Every live-data retrieval enforces existing permissions.
- Backend services do not trust role names, ownership claims, or access scopes supplied by the frontend.
- Direct API calls receive the same access controls as frontend interactions.
- Existing authentication and authorization tests continue to pass.

### 8.2 Prompt Injection

Knowledge documents, retrieved passages, user messages, and client-supplied history are untrusted data.

EcoGuide must not follow embedded instructions that attempt to override system instructions, reveal secrets, bypass authorization, retrieve unrelated private records, execute SQL, modify records, invoke unsupported tools, or change the allowed scope.

Prompt instructions alone are not a sufficient security boundary. Sensitive operations must remain protected by backend code and explicit service-level authorization.

### 8.3 Data Minimization

Send only information needed to answer the current question. Do not send:
- Passwords or authentication tokens.
- API credentials.
- Unnecessary user profile information.
- Unrelated user records.
- Complete database rows when limited fields suffice.
- Sensitive internal implementation details unrelated to the question.

### 8.4 Logging and Retention

- Do not introduce persistent chat transcripts in the initial release.
- Avoid logging complete user messages and generated answers by default.
- Logs may contain operational metadata needed for debugging and monitoring.
- Redact sensitive information.
- Document what is logged and why.
- Review provider retention and training policies.
- Do not claim data is never retained unless verified.

### 8.5 Rate Limits and Resource Protection

Bound request sizes, conversation history, retrieved context, and model output. Apply suitable rate limits to prevent abuse and unexpected costs. Limits must be configurable or documented and tested.

### 8.6 Database Safety

The LLM must not receive unrestricted database access. Application data must be accessed through existing authorized backend services or specifically approved read-only services. Never execute SQL generated by the LLM or allow a natural-language response to trigger an administrative mutation.

### 8.7 Security Acceptance Criteria

- Secrets remain server-side.
- Unauthorized records cannot be retrieved through direct requests or prompt injection.
- Inputs and history are validated and bounded.
- Errors do not expose secrets, SQL, stack traces, or sensitive data.
- Logs follow the approved privacy policy.
- Provider failures do not compromise application state.
- Existing security tests remain green.

---

## 9. Database and Migration Requirements

### 9.1 General Requirements

Before changing the schema:
1. Inspect existing migrations and database models.
2. Identify existing health-history and tree relationships.
3. Confirm whether required fields already exist.
4. Document the specific gap preventing implementation.
5. Propose the smallest required migration.
6. Review the migration before applying it.
7. Test migration and rollback behavior where supported by project conventions.

Do not create duplicate tables merely because a new module would be easier to implement in isolation.

### 9.2 Knowledge Storage

The approved knowledge corpus must have a maintainable source of truth. Use PostgreSQL full-text search initially.

A dedicated knowledge-document or knowledge-chunk table may be introduced if necessary, but only after schema review and approval. If introduced, document:
- Source identity and versioning.
- Approval status.
- Section metadata.
- Search indexing.
- Updates and removal of outdated content.
- Safe re-indexing.
- Traceability to original documents.

### 9.3 Chat Storage

Do not create a persistent chat-history table in the initial V2 release. Future persistence requires a separate product, privacy, retention, and schema review.

### 9.4 Health Intelligence Storage

Derive initial insights from existing tree-health records. Do not persist a second, competing version of current health status. Caching or persisted calculated insights are unnecessary unless profiling demonstrates a concrete need and a separate design is approved.

### 9.5 Migration Acceptance Criteria

- Existing V1 records remain intact.
- No duplicate health-history model is introduced.
- Migrations follow existing conventions.
- Required indexes are considered for actual query patterns.
- Rollback or recovery behavior is documented.
- Schema changes have appropriate tests.
- Database changes preserve integrity constraints.

---

## 10. Testing and Evaluation Strategy

### 10.1 Regression Testing

Before and after each milestone, run relevant existing test suites.

The last known V1 baseline was:
- Frontend: 20 test suites, 107 tests.
- Backend: 18 test suites, 257 tests.
- ESLint: zero reported errors and warnings.
- Production frontend build: successful.

These are previously reported baseline figures, not a claim about the current repository state. Re-run actual commands and record results at the start of V2.

No V2 milestone is accepted if it breaks unrelated V1 functionality without an explicitly reviewed reason.

### 10.2 EcoGuide Unit Tests

Cover:
- Input validation and empty messages.
- Oversized messages.
- Invalid history structures.
- Context and retrieval limits.
- Provider request construction and response parsing.
- Malformed provider responses.
- Timeouts, rate-limit responses, and provider errors.
- Source formatting.
- Insufficient knowledge.
- Safe fallback behavior.

### 10.3 EcoGuide Integration and Security Tests

Cover:
- Authenticated and unauthenticated requests.
- Role-aware responses.
- Authorized and unauthorized live-data requests.
- Attempts to access another user's records.
- Prompt injection and malicious retrieved documents.
- Attempts to request arbitrary SQL or obtain secrets.
- Missing or conflicting knowledge.
- Provider failure and recovery.
- No persistent chat-history writes.

### 10.4 EcoGuide Evaluation Set

Maintain a small, version-controlled evaluation set covering:
- Platform workflows.
- Verification and tree identification.
- Environmental guidance.
- Questions requiring live data.
- Unsupported questions.
- Missing or conflicting evidence.
- Prompt injection.
- Privacy and access-control boundaries.

Evaluate whether answers are grounded, factually supported, appropriately limited, and accompanied by valid references where applicable. Exact string matching must not be the sole evaluation method. Mock the provider rather than making paid external calls in automated tests.

### 10.5 Health Intelligence Unit Tests

At minimum, test:
- Zero, one, two, and three observations.
- Worsening, improving, stable, and mixed trends.
- Recorded `Dead` status.
- Repeated statuses.
- Equal timestamps and deterministic tie-breaking.
- Monitoring threshold boundaries.
- No health record and overdue monitoring.
- Invalid or unexpected status values.
- Timezone behavior.
- Large histories.
- Pagination and ordering.

### 10.6 Health Intelligence Authorization Tests

Test each existing role against:
- Own permitted records.
- Unrelated contributor records.
- Permitted caretaker monitoring data.
- Administrative access.
- Unknown tree identifiers.
- Empty datasets.
- Direct API requests that bypass the frontend.

### 10.7 Frontend Testing

Test:
- Assistant loading and successful response states.
- Provider errors and insufficient-information states.
- Source-reference rendering.
- Message validation and mobile layouts.
- Health insight presentation and missing-history display.
- Worsening, improving, stable, and mixed states.
- Monitoring-overdue display.
- Role-based visibility.
- Accessibility and keyboard interaction.

### 10.8 Test Execution Policy

- Mock external LLM calls in normal CI tests.
- Do not require API credentials to run the standard test suite.
- Keep tests deterministic.
- Add regression tests for discovered bugs.
- Record actual results rather than relying on assumed counts.
- Do not disable failing tests merely to make a milestone appear complete.

---

## 11. Non-Functional Requirements

### 11.1 Performance

- Health Intelligence uses bounded, efficient database queries.
- List endpoints support pagination.
- EcoGuide uses bounded context and output sizes.
- Provider calls have explicit timeouts.
- Database transactions are not held open during model generation.
- Expensive operations do not unnecessarily block unrelated V1 requests.

Specific latency targets must be established during V2-M0 based on the current environment and expected usage. Distinguish provider response time from backend processing time.

### 11.2 Reliability

- Provider failures do not break the rest of the application.
- Health Intelligence remains available independently of the LLM.
- Missing or invalid data produces controlled responses.
- Database failures are not represented as successful insights.
- Existing V1 features continue during AI-provider outages.

### 11.3 Maintainability

- Keep provider integration behind a clear interface.
- Keep health rules in independently testable functions or services.
- Avoid duplicating business logic.
- Follow existing naming, error-handling, and validation conventions.
- Document configuration and setup.
- Remain compatible with the existing JavaScript stack.

### 11.4 Accessibility and Usability

- Follow the current EcoRevive design system.
- Provide readable loading, empty, and error states.
- Ensure appropriate contrast and keyboard navigation.
- Use meaningful labels for interactive controls.
- Make source references understandable.
- Explain the difference between recorded status, inferred trend, and monitoring completeness.

### 11.5 Observability

Operational logging should help maintainers investigate failures without storing unnecessary private information. Where appropriate, record request outcome, provider latency, provider error category, retrieval success/failure, health-analysis failures, and rate-limit events.

Do not log credentials, complete sensitive records, or unrestricted chat transcripts.

---

## 12. V2 Implementation Milestones

Implementation must proceed sequentially. Each milestone must be reviewed before the next begins.

### V2-M0 — Architecture Freeze

**Goal:** Reconcile this PRD with the actual V1 repository and freeze the implementation design.

Tasks:
1. Inspect frontend, backend, database models, migrations, routers, middleware, tests, and configuration.
2. Record the actual current test baseline.
3. Confirm the existing health-observation schema.
4. Confirm current role and access-control behavior.
5. Select and document the LLM provider and model.
6. Verify provider integration using official documentation.
7. Define timeouts, request limits, output limits, and rate limits.
8. Define privacy, logging, and provider-retention decisions.
9. Design the approved knowledge corpus and ingestion process.
10. Confirm final API routes and response schemas.
11. Document required database migrations, if any.
12. Define the evaluation dataset and release criteria.

**Deliverables:** Approved V2 architecture; provider/model decision record; API contract; knowledge retrieval design; migration proposal if needed; security/privacy decisions; test/evaluation plan; updated implementation plan.

**Acceptance criteria:**
- Significant architectural decisions are documented.
- No unresolved design issue is silently delegated to implementation.
- Existing repository conventions are respected.
- Scope remains limited to EcoGuide and Tree Health Intelligence.

### V2-M1 — AI Foundation

**Goal:** Build the secure, testable backend foundation for provider integration.

Tasks:
1. Add validated backend-only provider configuration.
2. Implement a provider abstraction consistent with the chosen SDK.
3. Add bounded request and response handling.
4. Add timeout and controlled error behavior.
5. Add rate limiting and input validation.
6. Add safe operational logging.
7. Add mocked-provider tests.
8. Verify no secrets reach the frontend.
9. Verify standard tests do not require live provider credentials.

**Acceptance criteria:** Provider integration is isolated; configuration errors are clear; external calls are bounded; tests run without paid requests; V1 regression tests remain green.

### V2-M2 — EcoGuide Knowledge Assistant

**Goal:** Deliver knowledge-grounded conversational assistance without unrestricted live-data access.

Tasks:
1. Implement approved knowledge-corpus storage and indexing.
2. Add a controlled ingestion process for approved documents.
3. Implement PostgreSQL full-text retrieval.
4. Preserve source and section metadata.
5. Implement answer generation.
6. Return source references.
7. Handle missing, outdated, and conflicting evidence.
8. Add the frontend assistant interface.
9. Add unit, integration, and evaluation tests.

**Acceptance criteria:** Supported platform questions work; answers are grounded; references are valid; unsupported questions are handled honestly; UI loading/error states work; unrestricted database tools and implicit live-data access are absent.

### V2-M3 — Authorized Live-Data Tools

**Goal:** Allow EcoGuide to answer permitted questions about current application records.

Tasks:
1. Identify supported read-only data operations.
2. Reuse existing backend services.
3. Add narrowly scoped service functions only where necessary.
4. Enforce authorization before retrieving protected records.
5. Validate identifiers and parameters.
6. Add source references to application data.
7. Test direct API access and prompt injection.
8. Verify no AI operation can mutate application data.

**Acceptance criteria:** Supported live-data questions return real authorized data; unauthorized records remain inaccessible; the model has no arbitrary SQL/database access; EcoGuide cannot mutate tree status, verification, IDs, or rewards; provider failures do not affect V1 workflows.

### V2-M4 — Tree Health Intelligence

**Goal:** Implement deterministic health-trend analysis and monitoring-completeness insights.

Tasks:
1. Inspect and reuse existing health-history schema.
2. Implement documented trend rules.
3. Implement monitoring-interval calculations.
4. Implement deterministic follow-up recommendations.
5. Add role-scoped repository/service queries.
6. Implement paginated APIs.
7. Add supporting observation evidence.
8. Build frontend insight presentation.
9. Add rule, boundary, and authorization tests.

**Acceptance criteria:** Documented rules pass; missing history is never treated as death; insights are explainable; role access is enforced; recommendations do not mutate records; feature works without an LLM.

### V2-M5 — EcoGuide Integration and Validation

**Goal:** Ensure EcoGuide can explain health insights without changing their meaning.

Tasks:
1. Retrieve already-calculated insights through authorized backend services.
2. Present deterministic results and supporting evidence.
3. Prevent the LLM from overriding classifications.
4. Add end-to-end tests for health-related questions.
5. Evaluate grounding, source quality, refusal behavior, and privacy.
6. Review usability and accessibility.
7. Fix issues found by regression and evaluation tests.

**Acceptance criteria:** EcoGuide accurately explains backend insights; health status/trend is never recalculated or overridden by the LLM; evidence is available; prompt manipulation cannot bypass permissions; end-to-end workflows pass.

### V2-M6 — Release Readiness

**Goal:** Prepare a secure, documented, test-verified V2 release.

Tasks:
1. Run all frontend and backend tests.
2. Run linting and production builds.
3. Run migration tests where applicable.
4. Review authorization and privacy.
5. Review provider failure behavior.
6. Verify environment configuration and secret handling.
7. Verify API documentation.
8. Update README and technical documentation.
9. Document setup and troubleshooting.
10. Produce a release-readiness report.

**Acceptance criteria:**
- No unresolved critical security defects.
- No known unauthorized-data-access defect.
- Existing V1 workflows pass regression tests.
- V2 tests pass or exceptions are explicitly approved.
- Builds and linting succeed.
- Documentation matches implementation.
- No real secrets are committed.
- Manual deployment and rollback considerations are documented.

---

## 13. Antigravity and Git Workflow

### 13.1 Implementation Workflow

Antigravity must:
1. Inspect the current repository before making changes.
2. Implement only the currently approved milestone.
3. Follow existing conventions.
4. Add or update tests with implementation.
5. Run relevant test suites.
6. Report changed files, design decisions, test results, and remaining issues.
7. Stop for review before starting the next milestone.

Antigravity must not assume an earlier milestone is complete without checking the repository.

### 13.2 Git Restrictions

All Git operations that change repository history or remote state remain manual.

Antigravity must not:
- Commit changes.
- Push changes.
- Force-push.
- Reset or rebase branches.
- Rewrite commit history.
- Delete branches.
- Automatically resolve remote divergence through destructive commands.
- Change Git configuration without permission.

The developer manually inspects, stages, commits, and pushes reviewed changes.

### 13.3 Milestone Reporting

At the end of each milestone, Antigravity must provide:
- Summary of implementation.
- Files created or modified.
- API or database changes.
- Tests added.
- Exact commands executed.
- Actual test results.
- Lint and build results.
- Security considerations.
- Known limitations.
- Manual verification steps.
- Recommended next milestone.

A milestone is not complete merely because files were generated.

### 13.4 Change Management

If implementation requires a new database model, API, role, dependency, or architectural change not covered by this PRD, Antigravity must explain the need and request review before proceeding.

---

## 14. Definition of Done

EcoRevive V2 is ready for release only when all applicable requirements are satisfied.

### Product
- EcoGuide answers supported questions using approved knowledge.
- Source references are returned where applicable.
- Live-data questions use authorized backend services.
- Insufficient information is handled honestly.
- Tree Health Intelligence classifies trends using approved deterministic rules.
- Monitoring gaps are identified without inventing health status.
- Recommendations are traceable to evidence.
- Existing V1 lifecycle stages and workflows remain intact.

### Security and Privacy
- Existing authentication and authorization are reused.
- Protected records cannot be accessed through prompt manipulation.
- The LLM cannot execute arbitrary SQL or independently mutate application state.
- Secrets remain backend-only.
- Request sizes and provider calls are bounded.
- Logging and retention follow documented decisions.

### Engineering
- Tests cover main success and failure paths.
- Health rules and monitoring boundaries have deterministic tests.
- Role-based authorization has integration tests.
- Provider calls are mocked in standard CI tests.
- Existing V1 regression tests pass.
- Linting and production builds succeed.
- Database changes follow the approved migration plan.
- No unnecessary duplicate data model or microservice has been introduced.

### Documentation
- PRD and architecture documentation reflect final scope.
- API documentation matches actual endpoints.
- Environment examples contain placeholder values only.
- Setup and troubleshooting instructions are current.
- Test results and known limitations are documented.

### Release Discipline
- Each milestone has been reviewed.
- No critical security issue remains unresolved.
- No known unauthorized-data-access issue remains unresolved.
- Manual verification is complete.
- The final release-readiness report is available.
- Git changes have been manually reviewed and committed by the developer.

---

## 15. Final Product Decision

EcoRevive V2 will focus on two complementary capabilities:

**EcoGuide** makes the platform easier to understand by answering questions using approved documentation and authorized live data.

**Tree Health Intelligence** makes existing monitoring records more useful by identifying trends, highlighting missing observations, and recommending evidence-based follow-up actions.

The two features must remain clearly separated in responsibility. EcoGuide generates grounded natural-language explanations; Tree Health Intelligence calculates deterministic results.

V2 will not introduce disease-detection models, predictive ML, autonomous administrative actions, or unrelated AI features.

The guiding principle is:

**Use AI where natural-language understanding adds value. Use deterministic software where correctness, authorization, and traceability matter.**

This scope keeps EcoRevive V2 achievable, explainable, maintainable, and suitable for incremental implementation on top of the existing V1 system.

---

**End of Document**
