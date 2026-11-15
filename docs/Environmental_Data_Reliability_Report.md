# Environmental data availability changes

Implementation and validation: 16 November 2026 (Asia/Kolkata).
Changes are local. No commits, pushes, deployments, schema modifications or migrations were performed.
The earlier HTML-response/error-layout changes in the working tree were preserved.

## Confirmed causes

1. Both providers could continue to `fetch` after a database outbound permit was denied, if there was no stale value. Concurrent calls also reused an instance-wide permit holder, allowing the same instance to reacquire its own lease for different locations. This undermined the intended outbound protection.
2. Weather already used two-decimal coordinate keys (~1 km) and 30-minute caching; soil already had nominal ~250 m buckets and 90-day caching. Identical provider lookups were coalesced, but failed requests were immediately eligible again. Environmental assessment followed by suitability assessment could repeat failures, and regional sessions were not coalesced.
3. The aggregate assessment passed the soil's 2,200 ms timeout to **both** providers and waited for both. A measured direct SoilGrids request succeeded with valid measurements after 4,184 ms, demonstrating that the old client budget could discard a successful upstream request.
4. Soil timeout/network failures persisted a provider-wide 60-second cooldown. Regional fallback was entered only for an exact HTTP 200 all-null/urban-mask result. Exact failures could not reuse previously cached regional profiles.
5. Leaflet exposed click and viewport handlers, with no environmental hover handler. MapPage debounced clicks for 300 ms but did not cancel requests; its request IDs prevented stale rendering only. The frontend service retained in-flight promises, with no completed-response cache.
6. Stale soil returned by the provider could be saved again as a new fresh 90-day record. Some cached soil responses retained the previous target coordinates, and distance was rounded to 100 m before comparison with a 15 m provenance threshold.

The production Open-Meteo 429 was observed earlier, but historical request counts and the original rate-limit headers are not available in the workspace. The defects above can increase requests; they do not prove why the production egress IP exceeded its quota. Shared hosting egress is a possible additional cause, not a confirmed cause. A successful request from this workstation does not establish that Render's egress is unblocked.

## Exact behavior and configuration

| Setting / policy | Previous | Current |
| --- | --- | --- |
| Open-Meteo assessment timeout | Effectively 2,200 ms from shared soil budget | Independent deadline: `min(PROVIDER_TIMEOUT_MS, 4500)`; default 4,500 ms |
| Open-Meteo forecast horizon | Provider default, while only the first day was displayed | `forecast_days=1` |
| Open-Meteo HTTP 429 | Persistent provider-wide cooldown | Preserved: numeric or HTTP-date Retry-After, 1–86,400 s; 60 s fallback |
| Soil exact assessment timeout | 2,200 ms | 4,200 ms (`SOILGRIDS_EXACT_TIMEOUT_MS`) |
| Soil total assessment deadline | 4,500 ms | Still 4,500 ms (`SOILGRIDS_OVERALL_DEADLINE_MS`); includes regional fallback/cache work |
| Soil probe timeout | 2,000 ms | Still at most 2,000 ms, further limited by remaining assessment time |
| Soil transient timeout/network/HTTP failure cooldown | 60 s | Default 10 s (`SOILGRIDS_COOLDOWN_SECONDS`) |
| Soil HTTP 429 | Retry-After bounded 30–86,400 s | Preserved; absent/invalid Retry-After defaults to at least 60 s, independently of transient 10 s backoff |
| Repeated failed lookups | Could immediately retry per coordinate | 10 s negative cache; urban-mask identity retained for 1 h, without treating nulls as measurements |
| Soil outbound fair use | Permits only, with denial bypass defect | At most 5 reservations in a rolling 60 s, including exact requests and probes |
| Successful data freshness | Weather 30 min, soil 90 days | Preserved; weather stale fallback limited to 24 h |

Actual environment variable overrides still take precedence. The example file documents the new defaults; existing production variables have not been changed. Existing genuine persisted cooldowns are not cleared or shortened. Open-Meteo's HTTP-date Retry-After parser now distinguishes dates from numeric seconds.

The soil rolling budget is an atomic upsert using a separate coordination key in the **existing** `provider_cooldowns` table. It stores a bounded array of reservation timestamps in the existing text `reason` column. No table, column, index or migration was added. A process-local guard also prevents concurrent probes from oversubscribing before database reservations finish. If shared budget storage fails, outbound soil calls fail closed and cached fallbacks remain available.

## Independent loading and map behavior

`GET /api/v1/environment` remains compatible with combined requests. Optional `section=weather` or `section=soil` runs only that section. Invalid section names are rejected. Each section has its own abort controller and response deadline, including slow database/cache work at the response boundary. A provider rejection cannot fail the other section.

The frontend requests weather and soil independently and publishes incremental results. The panel shows weather while soil loads, or soil while weather loads. Existing successful browser-cache data appears immediately; expired data is labelled cached while being refreshed. Successful fresh browser-cache entries avoid another HTTP request until expiry. Browser caches are bounded to 500 section entries.

Hover rules:

- A 450 ms dwell within a spatial bucket starts environmental loading. Movement to another bucket replaces the pending request. Tiny movements within one bucket do not restart a request.
- Hover request starts are limited to once per second. Keys combine the nominal soil bucket and weather's two-decimal bucket so either provider boundary is respected.
- Dragging and mouse leave cancel pending hover timers. Click selection retains its existing 300 ms debounce; manual coordinate submission is immediate.
- Superseded/unmounted subscribers are cancelled. Shared HTTP calls are aborted only after their last subscriber leaves. Request IDs also reject stale UI updates. Disconnecting a browser request does not guarantee cancellation of an already-started Render provider request; backend coalescing, permits and budgets still protect it.
- Hover does not run suitability. Selection still coordinates suitability after environmental retrieval; repeated unavailable lookups benefit from the new negative caches.
- An unavailable section can schedule **one** automatic recovery for the active location. It waits for the reported cooldown, or 1 s for a busy permit / 10 s for a transient failure, plus 100 ms. It does not poll indefinitely or bypass upstream 429 protection. New locations and unmounts invalidate that recovery.

## Hybrid urban soil behavior

Exact data requests still ask ISRIC for `phh2o`, clay, sand, silt and organic carbon at 0–5 cm. Existing unit conversion and derived texture are retained. Values are never fabricated.

Only an exact HTTP 200 result with all primary values null initiates the existing four-cardinal strategy: North, East, South and West approximately 10 km away. Probes run concurrently under one regional session permit and each consumes a request-budget reservation. The first valid physical profile wins; the others are cancelled. Same-bucket regional sessions are coalesced. If fewer budget slots are available, excess probes are denied rather than exceeding fair use.

Regional results retain their original retrieval timestamp, sample coordinates, direction and distance. The UI explicitly displays the regional label, sample location and timestamp. They remain in separate `soil_regional` storage and never become exact target-site measurements. Reusing a profile for another point in its bucket updates the target and recomputes spatial distance/direction. Approximate buckets are not described as authoritative SoilGrids raster cells.

Exact timeouts, network errors, busy permits and cooldowns consult previously cached regional results without launching new probes. A regional cache lookup begins alongside exact work, so a timeout does not leave the cache lookup until the last few milliseconds. Expired regional records may be returned explicitly stale, retaining their original timestamps. Stale provider data is never saved again as freshly observed data.

## Validation

- Focused environmental backend unit/API suites: **93/93 passed** (3 files).
- Complete environmental suites plus related suitability, species and deployment-configuration suites: **166/166 passed** (6 files). Suitability/species integration tests read the existing database. External provider and failure cases in the environmental suites are mocked.
- Complete frontend suite: **206/206 passed** (26 files), including hover traffic control, incremental rendering, shared cancellation, completed caching, stale fallback and one-shot cooldown recovery.
- Frontend production build: passed; existing bundle-size warning remains.
- Frontend lint: passed. All changed backend JavaScript files: lint passed.
- Backend-wide lint remains blocked by 5 pre-existing empty-block errors in `backend/scripts/provision-prod-users.js`, plus its unused-variable warning. That unrelated file was not modified.
- `git diff --check`: passed.

`environmentDbIntegration.test.js` was intentionally not run: its setup executes migration 010 and its teardown drops tables, which conflicts with the no-schema-change/no-migration instruction. The new rolling-budget SQL was unit-checked, but its concurrent execution against real PostgreSQL was **not** integration-tested. The live timing harness below uses an isolated in-memory repository and does not read/write the configured database.

Mocked deadline tests use shortened budgets (including 80 ms and 250 ms) to check cancellation and isolation. Their timings are not live provider performance evidence.

## Measured response times

Single-location samples at latitude 30.65, longitude 76.78; not percentile benchmarks:

| Measurement | Result | Time | What was measured |
| --- | --- | --- | --- |
| Direct Open-Meteo baseline | HTTP 200, real weather | 835 ms | One live curl request from this workstation |
| Direct SoilGrids baseline | HTTP 200, valid soil | 4,184 ms | One live curl request from this workstation |
| Existing deployed Vercel environmental route | Render HTML HTTP 502 | 667 ms | Existing production deployment, unchanged by this work |
| Changed code, cold weather | Available | 778 ms | Live Open-Meteo through the changed service/provider with in-memory repository |
| Changed code, cold soil / complete assessment | Available | 3,201 ms | Live SoilGrids through the changed service/provider with in-memory repository |
| Changed code, warm cache | Both available | Approximately 1 ms | Same real observations served from memory; no additional upstream calls |

The harness returned real temperature and soil pH and made exactly one request per provider. It can be rerun explicitly with `node backend/scripts/measure-environment.js --live` from the repository root. It may use up to four extra probes if the chosen point is returned as urban NoData; it remains budget-limited and has no automatic upstream retry.

These samples support the warm-backend target for this successful location, but exclude Render cold starts and real PostgreSQL latency. They do not establish a production SLA or live regional-probe timing. The deployed 502 needs separate Render log/service investigation before deployment reliability can be confirmed.

ISRIC documents a 5-call/minute fair-use policy, lack of an uptime guarantee, and a REST disruption notice. During this investigation its endpoint nevertheless returned HTTP 200. Cached results improve availability, but an uncached point during a genuine upstream outage/rate limit can still correctly remain unavailable.

References: [ISRIC REST fair use](https://rest.isric.org/), [ISRIC service notice](https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_02.html), [Open-Meteo terms](https://open-meteo.com/en/terms).

## Files changed in this task

Backend implementation/configuration:

- `backend/.env.example`
- `backend/src/config/index.js`
- `backend/src/controllers/environment.controller.js`
- `backend/src/integrations/openMeteo.provider.js`
- `backend/src/integrations/soilGrids.provider.js`
- `backend/src/repositories/environmentCache.repository.js`
- `backend/src/services/environment.service.js`

Frontend implementation:

- `frontend/src/components/environment/EnvironmentPanel.jsx`
- `frontend/src/components/map/MapView.jsx`
- `frontend/src/pages/MapPage.jsx`
- `frontend/src/services/environment.service.js`

Tests, measurement and report:

- `backend/src/tests/environment.test.js`
- `backend/src/tests/environmentResilience.test.js`
- `backend/src/tests/environmentAvailability.test.js` (new)
- `frontend/src/test/mapPage.test.jsx`
- `frontend/src/test/mapService.test.js`
- `frontend/src/test/environmentAvailability.test.jsx` (new)
- `backend/scripts/measure-environment.js` (new)
- `docs/Environmental_Data_Reliability_Report.md` (new)
