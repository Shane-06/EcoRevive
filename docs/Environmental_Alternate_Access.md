# Alternative environmental access and clicked-location selection

Implemented locally on 16 November 2026 (Asia/Kolkata). No commits, pushes, deployments, schema changes or migrations.

## Why the earlier fix still showed unavailable

The screenshot's weather request has a genuine long Open-Meteo cooldown. The previous changes respected that rejection, but could not supply uncached weather from the same blocked source. Soil's global REST permit also meant a different selected point could receive `provider_busy` while another request ran. Hover could then replace the clicked coordinates because it wrote the same selected-location state.

## Implemented alternative

Weather still uses valid caches and Open-Meteo where available. When Open-Meteo is in cooldown or fails, an independent **MET Norway Locationforecast** client supplies a near-current model forecast. It uses a real EcoRevive website identifier, rounded coordinates, request coalescing, three-hour forecast caching outside the Nordic region, and its own persistent cooldown key. It does not clear or ignore Open-Meteo's cooldown. Source, forecast-valid time and model-update time are retained. The panel labels the values as a model forecast and the precipitation as next-hour precipitation, rather than a station observation. Missing daily min/max values are not invented.

Soil uses **ISRIC SoilGrids' official Web Coverage Service**, an alternative access path to the existing SoilGrids dataset. It downloads small signed-16-bit GeoTIFF subsets for pH, clay, sand, silt and organic carbon at 0–5 cm. GeoTIFF decoding uses the `geotiff` dependency. Scaling, NoData sentinels and valid ranges are checked before values are exposed.

A tile covers approximately 35 km with 141 x 141 output pixels, near the model's nominal 250 m resolution. Three download workers fetch the five layers; tiles are coalesced by a coarse geographic key, cached and bounded to 32 entries. Complete tiles are retained for 90 days, partial tiles for 60 seconds, and failed lookups back off for 15 seconds. WCS has its own persisted Retry-After cooldown. Ordinary section/database caches remain in use, with no schema changes. If WCS fails, the existing REST/cache path remains available within the assessment deadline.

If the target pixel has no primary values in all five successfully downloaded layers, the client samples North, East, South and West approximately 10 km away **from the same rasters**. The first valid regional profile wins without four more provider requests. It is explicitly marked regional, with actual sample coordinates, direction and distance, original retrieval time, and the statement that it is not an exact-site measurement. If regional sampling is explicitly disabled, no regional result is substituted. An incomplete coverage response is not treated as proof of an urban mask. Cached regional profiles remain separate from exact-location cache entries.

These are modeled soil properties, not real-time soil sensor readings. No values are synthesized, and an upstream outage or genuinely empty model coverage can still return unavailable.

## Click behavior

A click uses Leaflet's clicked latitude/longitude, updates the pin and inputs immediately, then automatically loads that point after the existing 300 ms debounce. A clicked location locks selection; later mouse movement cannot replace the point or cancel its assessment. Clicking another point selects it. Manual coordinate searches and tree selections also lock the point. **Resume hover preview** explicitly restores hover behavior.

The panel shows precipitation and available pressure in addition to temperature, humidity, wind and condition. Weather and soil remain independently rendered.

## Live values verified

The live harness was run at the screenshot location **30.6945, 76.8357**, with an injected one-hour Open-Meteo cooldown. MET Norway and ISRIC WCS were real network requests; the repository was isolated in memory, so this check did not read or write the configured database.

| Value | Returned result |
| --- | --- |
| Temperature | 14.2 °C, MET Norway near-current forecast |
| Humidity | 82.6% |
| Wind | 5.4 km/h |
| Next-hour precipitation | 0 mm |
| Pressure | 1014.7 hPa |
| Soil pH | 6.3 |
| Clay / sand / silt | 24.2% / 44.9% / 30.9% |
| Organic carbon | 43.6 g/kg |
| Soil provenance | Regional baseline, North, about 10.1 km |
| Sample coordinates | 30.785305986158367, 76.83630612735752 |

The target's SoilGrids pixel was masked. Soil values above describe the northern regional sample, not measurements at the selected point. The warm-cache response recomputed distance with haversine (about 10.1 km); the initial live check's approximate distance calculation displayed 10.0 km and has since been made consistent.

Measured in that live run:

- Weather available after **1,356 ms**.
- Soil available / complete assessment after **1,625 ms**.
- Warm memory-cache response: below the harness's 1 ms rounding resolution.
- Exactly one MET request and five WCS requests; no Open-Meteo request and no extra regional-probe requests.

An earlier direct MET probe took 6.99 s before a follow-up took 1.28 s. Provider latency varies; the implemented clients retain bounded deadlines and do not guarantee every cold request will succeed within five seconds. The 1.625 s measurement excludes Render and PostgreSQL latency and is not a deployed-production SLA. No live production deployment was updated by this task.

Reproduce the isolated live check explicitly:

```powershell
node backend/scripts/measure-environment.js --live --alternatives --lat=30.6945 --lng=76.8357
```

Avoid repeatedly running the live harness against identical weather coordinates; production caching exists to respect provider update intervals. Use mocked tests for repeated verification.

## Verification and configuration

New regressions cover weather cooldown failover, alternative-provider Retry-After, units and forecast attribution, coverage scaling, tile reuse across coordinates, cardinal raster fallback, all-NoData profiles, partial-property failures, explicit regional opt-out, Leaflet click coordinate forwarding, and selection locking against hover.

Alternatives are enabled by default in normal backend operation. To disable them explicitly, set `ENVIRONMENT_ALTERNATIVES_ENABLED=false`. `ENVIRONMENT_USER_AGENT_URL` identifies the deployed application to MET Norway; its default is the existing public Vercel website. No API keys are needed. Automated tests explicitly enable alternatives with injected providers so routine tests do not call public services.

Validation: **174/174 related backend tests** across seven suites passed; the complete frontend suite passed **208/208 tests** across 27 files. The frontend production build, frontend lint, lint for changed backend JavaScript, and `git diff --check` passed. The build retains its existing bundle-size warning. The migration integration suite is excluded because it executes DDL and drops tables. No dependency-wide automatic fixes were run: the dependency audit still reports pre-existing advisories in body-parser, proxy-addr and qs, with none reported for the added GeoTIFF dependency.

## Files changed

- `backend/.env.example`
- `backend/package.json`
- `backend/package-lock.json`
- `backend/scripts/measure-environment.js`
- `backend/src/services/environment.service.js`
- `backend/src/integrations/metNorway.provider.js` (new)
- `backend/src/integrations/soilCoverage.provider.js` (new)
- `backend/src/tests/environmentAlternatives.test.js` (new)
- `frontend/src/pages/MapPage.jsx`
- `frontend/src/components/environment/EnvironmentPanel.jsx`
- `frontend/src/test/environmentAvailability.test.jsx`
- `frontend/src/test/mapClick.test.jsx` (new)
- This report.

## Primary documentation

- [MET Norway Locationforecast](https://api.met.no/weatherapi/locationforecast/2.0/documentation)
- [MET Norway client guidance and identification](https://docs.api.met.no/doc/locationforecast/HowTO)
- [MET Norway terms](https://api.met.no/doc/TermsOfService)
- [Official ISRIC WMS/WCS services](https://maps.isric.org/)
- [ISRIC pH coverage description](https://maps.isric.org/generated/soilgrids/phh2o.html)
- [ISRIC SoilGrids access and model information](https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_02.html)
