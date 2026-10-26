# EcoRevive V2-M3 — Authorized Live-Data Tools Design & Specification

**Milestone:** V2-M3  
**Status:** Implemented & Verified  
**Date:** 2026-10-14  
**Governing Documents:** `docs/EcoRevive_PRD_V2.0.md` & `docs/V2_M0_Architecture_Freeze_Record.md` (Version 2.2)

---

## 1. Overview & Core Architectural Boundaries

V2-M3 extends EcoGuide from pure static knowledge retrieval (M2) to permission-checked, read-only live application data synthesis. Users can ask questions about their own registered plantations, public verified tree statuses, and health observations, with grounded live-data evidence citations returned alongside approved knowledge documentation.

### Core Security Invariants
1. **Zero Model-Controlled Database Writes:** All tools are strictly read-only. The AI subsystem possesses zero mutation permissions (cannot insert, update, verify, or delete trees, users, or health records).
2. **Server-Side Authorization on Every Call:** Tool execution context (`req.user.id`, `req.user.role`) is derived exclusively from the verified JWT token attached to the request, never from client arguments or LLM-generated identity parameters.
3. **Strict Tool Allowlist & Regex Enforcement:** The model interacts exclusively through 4 pre-registered read-only tools. Unknown tool requests, prototype pollution, and malformed parameters are rejected prior to querying the database.
4. **Data Minimization:** Sensitive fields—such as passwords, tokens, contributor email addresses, internal database UUIDs (`contributor_id`, `submitted_by`), exact GPS coordinates, and private caretaker health notes—are strictly stripped before passing data to model prompts or returning API envelopes.
5. **Non-Disclosure of Unverified Records:** If a non-verified (Pending, Under Review, or Rejected) or non-existent tree is requested, the system returns a safe "not found" status without disclosing whether an unverified private record exists.
6. **Zero Billing & Offline Mock Default:** Local development, CI, and automated test suites operate 100% offline via `MockAiProvider`, requiring zero Gemini API keys, zero network connectivity, and zero billing accounts ($0.00 cost commitment).

---

## 2. Final Allowlisted Read-Only Tools

| Tool Name | Parameters | Allowed Roles | Description |
|---|---|---|---|
| `getUserPlantationsSummary` | None `{}` | `contributor`, `admin` | Retrieves an aggregated count summary (total, verified, pending, under review, rejected) and up to 5 recent plantations registered by the calling contributor. |
| `getVerifiedTreeStatus` | `treeId: string` | `contributor`, `caretaker`, `admin` | Retrieves the public status, species, planting date, and current health status of an approved verified tree by its public Tree ID (`ER-PLT-XXXXX`) or UUID. |
| `getTreeHealthSummary` | `treeId: string` | `contributor`, `caretaker`, `admin` | Retrieves recent health observations (health status and date) for an approved verified tree. Excludes caretaker private notes. |
| `getPlatformVerificationSummary` | None `{}` | `admin` | Retrieves platform-wide plantation verification metrics and status counts for administrative coordinators. |

### Argument Validation Schemas

```javascript
// Tree ID or UUID regular expression
const TREE_ID_OR_UUID_REGEX = /^(ER-PLT-[0-9]{5}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
```

- **`getUserPlantationsSummary`:** Enforces zero parameters (`{}`). Any attempt to pass unexpected parameters (e.g., `{ userId: '...' }`) causes validation rejection.
- **`getVerifiedTreeStatus`:** Requires `treeId` string matching `TREE_ID_OR_UUID_REGEX`. Rejects SQL injection attempts, malformed strings, or path traversals.
- **`getTreeHealthSummary`:** Requires `treeId` string matching `TREE_ID_OR_UUID_REGEX`.
- **`getPlatformVerificationSummary`:** Enforces zero parameters (`{}`). Enforces `userContext.role === 'admin'`.

---

## 3. Role & Resource Authorization Matrix

| Role | `getUserPlantationsSummary` | `getVerifiedTreeStatus` | `getTreeHealthSummary` | `getPlatformVerificationSummary` |
|---|---|---|---|---|
| **Contributor** | Allowed (Scoped strictly to `req.user.id`) | Allowed (Verified trees only) | Allowed (Verified trees only) | **Denied** (HTTP 403 / `UNAUTHORIZED_TOOL`) |
| **Caretaker** | **Denied** (Caretakers do not register plantations) | Allowed (Verified trees only) | Allowed (Verified trees only) | **Denied** (HTTP 403 / `UNAUTHORIZED_TOOL`) |
| **Admin** | Allowed (Scoped to calling admin's id) | Allowed (Verified trees only) | Allowed (Verified trees only) | Allowed (System-wide metrics) |

---

## 4. Data Minimization & Deliberately Excluded Fields

To preserve user privacy and prevent leakage of internal system state:

| Tool | Included Fields | Deliberately Excluded Fields |
|---|---|---|
| `getUserPlantationsSummary` | `totalTrees`, `verifiedCount`, `pendingCount`, `underReviewCount`, `rejectedCount`, `recentPlantations: [{ treeId, species, status, plantedOn }]` | Internal database UUIDs (`id`, `contributor_id`), exact latitude/longitude coordinates, photo references, contributor emails/passwords. |
| `getVerifiedTreeStatus` | `found`, `treeId`, `species`, `status` ("Verified"), `plantedOn`, `currentHealth` | Internal tree UUID (`id`), contributor UUID (`contributor_id`), photo URLs, exact coordinates, unverified status details. |
| `getTreeHealthSummary` | `found`, `treeId`, `currentHealth`, `observationCount`, `recentObservations: [{ healthStatus, recordedAt }]` | Caretaker internal UUID (`submitted_by`), caretaker names/emails, private caretaker notes (`notes`), photo references (`photo_reference`). |
| `getPlatformVerificationSummary` | `totalPlantations`, `verifiedCount`, `pendingCount`, `underReviewCount`, `rejectedCount` | Individual user records, tree records, personal contributor identifiers. |

---

## 5. Tool Execution Pipeline & Multi-Layer Prompt Framing

```
1. Client POST /api/v1/ai/chat (JWT Header + Message + History)
   │
   ▼
2. Auth Middleware: Extracts verified JWT { id, role } into req.user
   │
   ▼
3. EcoGuideService:
   ├── Knowledge Search: Retrieves top-4 approved knowledge chunks
   ├── Tool Discovery: Extracts allowed tool declarations for user role
   └── First Turn: Calls AiProvider with tools allowlist
         │
         ├── [No Tool Call Needed] ──► Returns grounded answer from knowledge
         │
         └── [Tool Call Requested: name, args]
               │
               ▼
4. ToolExecutorService:
   ├── Validate toolName against allowlist
   ├── Validate user role against tool.allowedRoles
   ├── Validate args against schema & regex
   ├── Execute repository query (timeout 3000ms)
   ├── Enforce output bounding (max 2000 chars)
   └── Append Live Data Source Attribution
         │
         ▼
5. Second Turn: Bounded Prompt Builder
   ├── System Instructions (privileged, non-overridable)
   ├── <approved_knowledge_passages> (untrusted documentation)
   ├── <authorized_platform_data> (untrusted verified data)
   ├── <untrusted_conversation_history> (client history)
   └── <untrusted_user_query> (user prompt)
         │
         ▼
6. Final Model Synthesis ──► Standard sendSuccess Envelope: { answer, sources, status }
```

### Source Attribution Schema

The endpoint response identifies knowledge vs live data evidence cleanly:
```json
{
  "status": "success",
  "data": {
    "answer": "According to your verified plantation records, you have registered 2 tree plantations...",
    "sources": [
      {
        "type": "live_data",
        "sourceId": "TOOL-USER-PLANTATIONS",
        "title": "Contributor Registered Plantations",
        "tool": "getUserPlantationsSummary",
        "entityId": null
      },
      {
        "type": "knowledge",
        "sourceId": "DOC-CORE-001",
        "title": "EcoRevive 9-Stage Plantation Lifecycle Standard",
        "section": "Section 1: 9-Stage Lifecycle Flow",
        "version": "1.0.0"
      }
    ],
    "status": "success"
  }
}
```

---

## 6. Failure Handling & Operational Safeguards

1. **Tool Execution Timeout:** Each tool call is capped at 3,000 ms via `Promise.race`. If a tool exceeds this limit, execution aborts safely with `EXECUTION_FAILED`.
2. **Database Error Masking:** Low-level SQL exceptions, connection errors, and table schema details are caught and masked as generic error messages. They are never reflected to the model or user.
3. **Loop Prevention:** EcoGuide bounds tool executions to a maximum of 2 calls per request. Recursive or cyclic model tool calls are blocked.
4. **Provider Degradation:** If Gemini is unavailable or rate-limited, the existing HTTP 503 `ProviderUnavailableError` envelope is returned with `$0.00` cost reporting.

---

## 7. Test Verification Summary

- **Tool Unit & Adversarial Suite (`src/tests/ai.tools.test.js`):** 17 tests verifying argument schemas, SQL injection rejection, prototype pollution blocking, cross-user isolation, role authorization, non-disclosure, and data minimization.
- **E2E Integration Suite (`src/tests/ai.m3.integration.test.js`):** 9 tests executing full HTTP workflows with `MockAiProvider`, database seeding, live source attribution, cross-contributor isolation, privilege escalation defense, and prompt injection resilience.
- **Existing V1 & V2 Test Regression:** All 23 backend test suites (333 tests) and 22 frontend test files (118 tests) pass 100% green.

---

## 8. Known Limitations & Explicit Boundary Notice

- **Scope Boundary:** Implemented **V2-M3 only**. No components of V2-M4 (Tree Health Intelligence, trend analysis algorithms, or follow-up recommendation engines) have been implemented.
- **Read-Only Scope:** Tools do not perform database writes, tree approvals, QR code generation, or user registration.
