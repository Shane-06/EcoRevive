# EcoRevive V2-M5 — EcoGuide Integration and Validation Record

**Milestone:** V2-M5 — EcoGuide Integration and Validation  
**Release:** EcoRevive V2.0  
**Status:** Approved & Validated Baseline  
**Date:** 2026-11-01  
**Authors:** EcoRevive Architecture & Engineering Team  
**Governing PRD:** `docs/EcoRevive_PRD_V2.0.md`  
**Related Documents:** `docs/V2_M0_Architecture_Freeze_Record.md`, `docs/V2_M3_Authorized_Live_Data_Tools_Design.md`

---

## 1. Executive Summary & Objective

The objective of **V2-M5** is to integrate, unify, and validate all previously established EcoGuide capabilities across:
- **V2-M2:** Approved Knowledge Assistant (PostgreSQL tsvector retrieval over approved corpus).
- **V2-M3:** Authorized Read-Only Live Data Tools (`getUserPlantationsSummary`, `getVerifiedTreeStatus`, `getTreeHealthSummary`, `getPlatformVerificationSummary`).
- **V2-M4:** Deterministic Tree Health Intelligence (`getTreeHealthInsight` analyzing trends, monitoring completeness, and actionable suggestions).

Through V2-M5, EcoGuide is established as a consistent, secure, context-aware assistant operating with unified multi-source orchestration, strict source attribution, bounded multi-turn conversation handling, defense against prompt injection, zero LLM overrides of deterministic computations, and the binding **$0.00 zero-billing commitment**.

---

## 2. Unified Request Orchestration Architecture

EcoGuide processes queries through a single unified controller and orchestration pipeline that dynamically selects and combines information across three distinct sources without unnecessary tool executions or duplicate citations.

```
                  ┌─────────────────────────────────────────────────────────┐
                  │ Client Request: POST /api/v1/ai/chat                    │
                  │ Headers: Authorization: Bearer <JWT>                    │
                  │ Payload: { message: string, history: Array<object> }    │
                  └──────────────────────────┬──────────────────────────────┘
                                             │
                                             ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │ Security & Perimeter Controls                           │
                  │ - JWT Authentication (req.user extracted server-side)   │
                  │ - Rate Limiting (20 req/min per user / IP)              │
                  │ - Client Disconnect / Cancellation Hook (res.on('close')│
                  └──────────────────────────┬──────────────────────────────┘
                                             │
                                             ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │ EcoGuide Service: Initial Turn (Turn 1)                 │
                  │ 1. Validate message length (1-1000 chars) & history     │
                  │ 2. PostgreSQL Full-Text Search: searchApprovedChunks()  │
                  │ 3. Filter Allowed Tools by Role: getFunctionDeclarations│
                  │ 4. Build Multi-Layer XML Prompt with Anti-Injection     │
                  │ 5. Invoke Configured AI Provider (Mock / Gemini Free)   │
                  └──────────────────────────┬──────────────────────────────┘
                                             │
                        ┌────────────────────┴────────────────────┐
                        │ Does provider return toolCalls?         │
                        └──────────┬─────────────────────┬────────┘
                                   │ YES                 │ NO
                                   ▼                     ▼
┌──────────────────────────────────────────────┐  ┌─────────────────────────────────┐
│ Tool Execution & Synthesis (Turn 2)          │  │ Direct Synthesis / Fallback     │
│ - Bound to max 2 tool calls                  │  │ - Greeting / Capability Guidance│
│ - Enforce server-side role authorization     │  │ - Grounded Knowledge Answer     │
│ - Timeout bound (3,000 ms)                   │  │ - Insufficient Info Refusal     │
│ - Output size limit (2,000 chars)            │  │ - Ambiguous Clarification Prompt│
│ - Re-check permissions & sanitize UUIDs      │  └──────────────┬──────────────────┘
│ - Assemble <authorized_platform_data> XML    │                 │
│ - Synthesis LLM Call (Final Turn)            │                 │
└──────────────────────┬───────────────────────┘                 │
                       │                                         │
                       ▼                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Source Attribution, Deduplication & Status Resolution                             │
│ - Distinguish: 'knowledge', 'live_data', 'health_intelligence'                    │
│ - Deduplicate citations by composite key                                          │
│ - Resolve response status: 'success', 'insufficient_information', 'unauthorized' │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 The Three Information Sources

| Source Identifier | Source Description | Storage / Generation Mechanism | Invariants & Guardrails |
|---|---|---|---|
| **Source A: `knowledge`** | Approved Platform Documentation | PostgreSQL `knowledge_chunks` with `tsv_content` tsvector | Strictly approved chunks (`approval_status = 'approved'`). Draft/deprecated excluded. Bounded to top 4 chunks. Never cited if unretrieved. |
| **Source B: `live_data`** | Authorized Live Platform Records | 4 Read-only server tools: `getUserPlantationsSummary`, `getVerifiedTreeStatus`, `getTreeHealthSummary`, `getPlatformVerificationSummary` | Strictly read-only; no database writes. Enforced server-side per-user/role authorization. Never leaks internal database UUIDs or private caretaker notes. Non-disclosure of unverified trees. |
| **Source C: `health_intelligence`**| Deterministic Tree Health Insights | M4 Deterministic Engine via `getTreeHealthInsight` | 100% deterministic math/rules engine (trend transitions, 720h / 30-day monitoring freshness, follow-up recommendations). LLM may explain results but **never calculate, alter, or override them**. |

---

## 3. Source Attribution & Evidence Integrity Contract

The EcoGuide API response payload standardizes citations under `sources: Array<object>`:

```json
{
  "success": true,
  "data": {
    "answer": "Tree ER-PLT-00001 was last observed 45 days ago and is overdue for its regular 30-day inspection schedule...",
    "sources": [
      {
        "type": "health_intelligence",
        "sourceId": "TOOL-HEALTH-INSIGHT",
        "title": "Tree Health Intelligence Record",
        "tool": "getTreeHealthInsight",
        "treeId": "ER-PLT-00001",
        "entityId": "ER-PLT-00001"
      },
      {
        "type": "knowledge",
        "sourceId": "ecorevive-monitoring-protocol",
        "title": "EcoRevive Tree Health Monitoring Protocols",
        "section": "30-Day Monitoring Completeness & Trend Rules",
        "version": "2.0"
      }
    ],
    "status": "success"
  }
}
```

### 3.1 Field Specification by Source Type

1. **`knowledge`:**
   - `type`: `'knowledge'`
   - `sourceId`: Unique document identifier (e.g. `'ecorevive-monitoring-protocol'`)
   - `title`: Document title (e.g. `'EcoRevive Tree Health Monitoring Protocols'`)
   - `section`: Heading of the retrieved section
   - `version`: Document version string (e.g. `'2.0'`)
2. **`live_data`:**
   - `type`: `'live_data'`
   - `sourceId`: Tool attribution identifier (e.g. `'TOOL-USER-PLANTATIONS'`, `'TOOL-VERIFIED-TREE'`, `'TOOL-TREE-HEALTH'`, `'TOOL-ADMIN-SUMMARY'`)
   - `title`: Human-readable attribution title
   - `tool`: Invoked tool name
   - `entityId`: Public Tree ID (`ER-PLT-XXXXX`) or `null` for user-wide summaries. **Never a database UUID.**
3. **`health_intelligence`:**
   - `type`: `'health_intelligence'`
   - `sourceId`: `'TOOL-HEALTH-INSIGHT'`
   - `title`: `'Tree Health Intelligence Record'`
   - `tool`: `'getTreeHealthInsight'`
   - `treeId`: Public Tree ID (`ER-PLT-XXXXX`). **Never a database UUID.**
   - `entityId`: Public Tree ID (`ER-PLT-XXXXX`).

### 3.2 Evidence Integrity Guardrails
- **No phantom citations:** If a tool was executed but returned `found: false` (tree not found or unauthorized), no citation is generated.
- **No irrelevant citations:** For queries answered purely from live data (e.g. "How many plantations have I done?"), unrelated general knowledge chunks are omitted from citations.
- **Deduplication:** Composite key hashing (`type:sourceId:section` or `type:tool:entityId`) prevents duplicate citations.
- **Data Minimization:** Regex filtering strips internal database UUIDs (`[0-9a-f]{8}-...`) from `entityId` and `treeId`.

---

## 4. Multi-Turn Conversation & Context Handling

EcoGuide supports context-aware multi-turn conversations subject to strict security invariants:

1. **Bounded History:** Conversation history is validated against `MAX_HISTORY_MESSAGES = 6` and `MAX_HISTORY_CHARS = 4000`. History exceeding bounds is rejected with HTTP 400.
2. **Untrusted Context Framing:** All conversation history is enclosed within structural XML tags (`<untrusted_conversation_history>`) and treated as untrusted data. History can never override system instructions or user roles.
3. **Contextual Entity Resolution:**
   - When a user asks a follow-up query referring to an entity (e.g. "What is its health trend?", "How is that tree doing?", "Which one needs attention?"), EcoGuide inspects recent conversation history for public Tree IDs (`ER-PLT-XXXXX`).
   - **Single Match:** If exactly one tree identifier was present in immediate context, EcoGuide resolves to that identifier and rechecks authorization server-side.
   - **Ambiguous Multi-Tree Context:** If multiple tree identifiers were present in conversation context and the user query is ambiguous, EcoGuide refuses to guess and asks a concise clarification:  
     `"You have multiple trees in your conversation context (ER-PLT-00001, ER-PLT-00002). Which tree would you like me to check?"` (Status: `'success'`).
   - **Zero Match:** If the user asks a follow-up without specifying a tree and none is in history, EcoGuide prompts the user to provide the public Tree ID.
4. **Rechecked Authorization:** Historical assistant statements never grant authority. When accessing a tree referenced in previous turns, the tool executor validates permissions against the caller's verified JWT identity.

---

## 5. Response Status Semantics

The `status` field in the response envelope provides deterministic semantic communication:

| Status Code | Trigger Condition | Sources Present | Frontend Visual Indicator |
|---|---|---|---|
| `'success'` | Grounded answer from knowledge, live data, health intelligence, combined sources, capability greetings, or clarification prompts. | Populated with deduplicated used sources (or empty for greeting/clarification) | Rendered message bubble with distinct colored source badges (Knowledge, Live Data, Health Intelligence). No warning banners. |
| `'insufficient_information'` | Question cannot be answered by approved documentation, or model expresses insufficient verified knowledge. | Strictly empty (`[]`) | Amber Alert: *"Limited Knowledge Match: Question is outside approved EcoRevive documentation."* |
| `'unauthorized'` | Tool invocation rejected due to role permissions (e.g., contributor invoking administrative tool). | Strictly empty (`[]`) | Rose Alert: *"Access Restricted: You are not authorized to view this platform record."* |
| HTTP 429 (`RATE_LIMIT_EXCEEDED`) | Client exceeds 20 requests per minute. | N/A (Standard Error Envelope) | Error banner with retry timer. |
| HTTP 503 (`PROVIDER_UNAVAILABLE`) | External provider connection failure, timeout, or free-tier quota exhaustion. | N/A (Standard Error Envelope) | ErrorAlert with manual retry button. |

---

## 6. Frontend Integration & User Experience

Enhancements to `frontend/src/pages/EcoGuidePage.jsx`:
1. **Three-Source Badge Rendering:**
   - `knowledge`: Neutral slate badge with `ShieldCheck` icon, section name, and document version.
   - `live_data`: Purple badge with `Database` icon, tool name, and public Tree ID pill.
   - `health_intelligence`: Teal badge with `Activity` icon, `Tree Health Intelligence Record` label, and public Tree ID pill.
2. **Access Restriction Alert:** When `status === 'unauthorized'`, displays a rose alert banner clearly communicating permissions boundaries without generic error messages.
3. **Protection of Live/Health Data:** Guarantees that successful live data and health intelligence answers never trigger the amber "Limited Knowledge Match" banner.
4. **Interactive Capability Chips:** Updated prompt suggestion chips to introduce health trend and monitoring status discovery alongside lifecycle and suitability queries.
5. **Data Privacy Footnote:** Reaffirms zero personal data transmission and the $0.00 zero-billing policy.

---

## 7. Security and Privacy Review

An end-to-end security audit verified compliance with all frozen boundaries:
- **Authentication:** All AI endpoints require valid Bearer JWT. Unauthenticated requests are rejected with HTTP 401.
- **Server-Side Authorization:** Tool execution authorization is checked in `toolExecutor.service.js` against `req.user.role` from the verified token. Model-generated arguments cannot override caller identity.
- **Cross-User Isolation:** Contributor queries for plantation summaries and health intelligence are strictly filtered by `contributor_id = user.id`. Cross-user data leaks are impossible.
- **Non-Disclosure:** Queries for non-existent or unverified trees return 404 / `found: false` without revealing whether an unverified record exists in the database.
- **Data Minimization:** Private caretaker notes, passwords, emails, tokens, internal UUIDs, and exact GPS coordinates are excluded from AI prompts and source citations.
- **No Database Writes:** EcoGuide possesses zero write access. No database mutations, SQL executions, or status approvals can be triggered via AI.
- **Resource Bounds:** Enforces 3,000 ms tool execution timeout, 2,000 character output limits, and a maximum of 2 tool calls per chat request.
- **Client Disconnect Cancellation:** `setupClientDisconnect(res)` aborts pending upstream LLM and database calls if the client terminates the connection.

---

## 8. Provider Reliability & Zero-Billing Verification

- **Offline by Default:** `AI_PROVIDER=mock` runs 100% offline with zero external network access, zero API keys, and zero cloud accounts.
- **Google AI Studio Free Tier ($0.00):** Live integration is restricted exclusively to free-tier models (`gemini-3.8-flash` primary, `gemini-3.5-flash-lite` fallback).
- **Zero Financial Overdraft Risk:** The application contains zero billing accounts, zero payment gateways, and zero Cloud Billing API calls.
- **Graceful Quota Degradation:** HTTP 429 (`RESOURCE_EXHAUSTED`) from Gemini maps cleanly to `ProviderUnavailableError` (HTTP 503) without crashing or retrying infinitely.
- **LLM Independence:** Tree Health Intelligence calculations operate 100% locally on the backend via deterministic services, completely independent of external LLM availability.

---

## 9. Comprehensive Test Coverage Summary

### 9.1 Backend Test Execution Results
Command: `cd backend; npx jest --runInBand`

```
Test Suites: 26 passed, 26 total
Tests:       405 passed, 405 total
Snapshots:   0 total
Time:        12.013 s
```

#### Test Suite Breakdown:
- `src/tests/ai.m5.integration.test.js`: **21 passed (New V2-M5 Comprehensive Suite)**
- `src/tests/ai.ecoguide.test.js`: **23 passed**
- `src/tests/ai.m3.integration.test.js`: **11 passed**
- `src/tests/ai.tools.test.js`: **12 passed**
- `src/tests/ai.foundation.test.js`: **17 passed**
- `src/tests/ai.ratelimit.test.js`: **5 passed**
- `src/tests/healthIntelligence.api.test.js`: **13 passed**
- `src/tests/healthIntelligence.unit.test.js`: **31 passed**
- Remaining 18 core suites: **272 passed**
- Total: **405 passed, 0 failed across all 26 test suites**.

### 9.2 Frontend Test Execution Results
Command: `npm --prefix frontend test`

```
Test Files: 22 passed, 22 total
Tests:      125 passed, 125 total
Duration:   10.87s
```

#### EcoGuide Frontend Coverage (`src/test/ecoguide.test.jsx`):
- Authenticated view with welcome message and suggestion chips.
- Message sending, optimistic user bubble, and loading state.
- Approved knowledge source rendering (`knowledge`).
- Live platform evidence citation rendering (`live_data`).
- Deterministic health intelligence pill rendering (`health_intelligence`).
- Simultaneous multi-source rendering (knowledge + live data + health intelligence).
- Non-occurrence of "Limited Knowledge Match" for successful live data and health intelligence answers.
- Legitimate "Limited Knowledge Match" display for out-of-scope questions.
- Access restricted warning rendering when `status === 'unauthorized'`.
- Provider outage error alert with interactive retry mechanism.
- Chat history clearing and conversation reset.

### 9.3 Linter & Production Build Results
- **Backend Lint:** `npm --prefix backend run lint` -> **PASS (0 errors, 0 warnings)**
- **Frontend Lint:** `npm --prefix frontend run lint` -> **PASS (0 errors, 0 warnings)**
- **Frontend Build:** `npm --prefix frontend run build` -> **PASS (1,645 modules transformed, 0 errors)**

---

## 10. Known Limitations & Architectural Scope Boundaries

1. **Deterministic Calculations Offline:** EcoGuide relies on backend deterministic services for health trends and environmental suitability; the LLM provides synthesis and explanation, not raw calculation.
2. **Context Window Bound:** Multi-turn history is bounded to 6 messages and 4,000 characters. Long-running sessions automatically drop earlier turns beyond this sliding window.
3. **No Database Mutations via EcoGuide:** Verification approvals, tree status updates, and health log submissions cannot be executed through chat. They remain strictly governed by authenticated REST endpoints.
4. **Free Tier Quota Dependency:** When optional Gemini live mode is enabled, availability is governed by Google AI Studio's dynamic platform capacity. If quota is exhausted, EcoGuide degrades gracefully to an informative status message without billing risks.
