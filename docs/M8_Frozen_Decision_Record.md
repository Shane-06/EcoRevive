# EcoRevive — Milestone 8 (M8) Frozen Decision Record
**Milestone**: M8 — Species Catalog & Rule-Based Suitability Engine  
**Version**: 1.1 (Final Frozen Project-Owner Baseline with Explicit Clarifications)  
**Date**: September 2026  
**Status**: APPROVED & FROZEN  
**Target Environment**: EcoRevive V1 (Node.js/Express, PostgreSQL/PostGIS, ISRIC SoilGrids v2.0, Open-Meteo)

---

## Executive Summary & Purpose

This document constitutes the final, authoritative **M8 Frozen Decision Record** for the EcoRevive V1 plantation suitability engine. It locks all architectural, botanical, algorithmic, and interface decisions prior to any code implementation for Milestone 8.

All implementation work for M8 must conform strictly to the 14 frozen decisions and the 3 explicit clarifications detailed below. No deviations, speculative features, AI/ML integrations, or schema modifications are permitted.

---

## Table of Frozen Decisions & Clarifications

| # | Decision / Clarification | Frozen Policy Summary |
|---|---|---|
| **1** | **Component Status Vocabulary** | Fixed 4-value enum: `suitable`, `moderate`, `unsuitable`, `insufficient_data` |
| **2** | **No Numeric Suitability Score** | Purely qualitative, explainable semantic outputs; 0% numeric scoring or ranking points |
| **3** | **No AI/ML & No Species Ranking** | 100% deterministic rule matching; single-species evaluation; unranked catalog |
| **4** | **Soil Compatibility & Precedence** | **[Clarified]** Deterministic pH bands + explicit per-rule USDA texture mapping; intra-component precedence: `unsuitable` > `moderate` > `suitable`; indicative V1 label |
| **5** | **Sunlight Assessment Semantics** | **[Clarified]** Weather availability gate + contextual weather observation; no long-term irradiance claims; indicative V1 label |
| **6** | **Water Assessment** | Based on M7 precipitation/humidity; no parcel groundwater claims; indicative V1 label |
| **7** | **Spacing Assessment** | Advisory requirement (`min_spacing_m`); no claim of site physical spacing measurement |
| **8** | **Missing Data Treatment** | Zero positive defaults; missing provider data strictly produces `insufficient_data` |
| **9** | **Partial Environmental Failure** | Return available components + `insufficient_data` for failed components with HTTP 200 |
| **10** | **Overall Aggregation Precedence** | Strict evaluation hierarchy: `unsuitable` > `insufficient_data` > `moderate` > `suitable` |
| **11** | **Climate Region Handling** | Descriptive metadata in V1; non-blocking for automated evaluation |
| **12** | **API Contract Preservation** | Exact preservation of `GET /api/v1/species` and `GET /api/v1/suitability?lat=&lng=&species=` |
| **13** | **Database & Schema Scope** | Zero schema changes; `suitability_rules` table remains sole source of truth |
| **14** | **Milestone Boundary Safeguards** | No M9 verification, no M10 QR, no frontend UI, no new providers, no Git commands |

---

## Explicit Clarifications & Detailed Decision Records

---

### Clarification 1: Soil Component Evaluation & Precedence (Decision 4 Expanded)

#### 1. Intra-Component Precedence Rule
Within the soil check (`checks.soil`), pH compatibility status (`status_ph`) and USDA texture compatibility status (`status_texture`) combine deterministically into `checks.soil.status` using the following exact precedence hierarchy:

$$\mathbf{unsuitable} > \mathbf{moderate} > \mathbf{suitable}$$

#### 2. Exact Algorithmic Rule
1. **Unavailable Data Check**:
   - If SoilGrids data is unavailable, or if either `ph` or `texture` is missing (`null`/`undefined`), the soil component result MUST be:
     - `checks.soil.status = 'insufficient_data'`
     - `checks.soil.reason = 'Soil data unavailable from external provider (ISRIC SoilGrids). Cannot evaluate soil compatibility.'`
2. **Deterministic Precedence Evaluation**:
   - **Step 1 (Unsuitable)**: If `status_ph === 'unsuitable'` OR `status_texture === 'unsuitable'`:
     - `checks.soil.status = 'unsuitable'`
   - **Step 2 (Moderate)**: Otherwise, if `status_ph === 'moderate'` OR `status_texture === 'moderate'`:
     - `checks.soil.status = 'moderate'`
   - **Step 3 (Suitable)**: Otherwise (`status_ph === 'suitable'` AND `status_texture === 'suitable'`):
     - `checks.soil.status = 'suitable'`

#### 3. pH Compatibility Thresholds
Applied uniformly across canonical Indian subtropical/tropical species:
- **`suitable`**: $6.0 \le \text{pH} \le 7.8$ (Thriving baseline for canonical species)
- **`moderate`**: $5.5 \le \text{pH} < 6.0$ (Mild acid stress) **OR** $7.8 < \text{pH} \le 8.5$ (Mild alkaline/calcareous stress)
- **`unsuitable`**: $\text{pH} < 5.5$ (Severe acidity / aluminum toxicity risk) **OR** $\text{pH} > 8.5$ (Severe alkalinity / sodicity risk)

---

### Clarification 2: Species-Specific Soil Texture Mapping (Decision 4 Expanded)

The 10 records currently stored in PostgreSQL `suitability_rules` (Migration 003 / Seed 001) contain 8 distinct `soil_type` rule strings.
Each rule string maps deterministically against the 10 USDA texture classes output by M7 SoilGrids provider (`deriveSoilTexture`):
1. `Clay`
2. `Sand`
3. `Loamy sand`
4. `Silt`
5. `Silty clay loam`
6. `Clay loam`
7. `Sandy clay loam`
8. `Silt loam`
9. `Sandy loam`
10. `Loam`

Generic substring searches (e.g. `soilType.includes("loam")`) are **strictly prohibited**. The exact per-rule matrix below is the binding implementation contract:

```
Database soil_type
       ↓
Accepted M7 SoilGrids USDA texture classes
       ↓
Result when matched
       ↓
Result when clearly incompatible
```

#### Rule 1: `Well-drained loam` (Species: Neem, Amaltas, Ashoka)
- **Botanical Context**: Medium-textured, well-draining loams. Requires adequate aeration and moderate water retention. Intolerant of waterlogging in dense clay or rapid leaching in pure sand.
- **Accepted `suitable` Textures**: `Loam`, `Sandy loam`, `Silt loam`, `Clay loam`, `Sandy clay loam`
- **Accepted `moderate` Textures**: `Loamy sand`, `Silty clay loam`, `Silt`
- **Incompatible `unsuitable` Textures**: `Sand` (excessive drainage/nutrient poor), `Clay` (poor drainage, root aeration failure)
- **Implementation Limitation**: SoilGrids provides 0–5cm topsoil texture modeling; internal drainage rate and subsoil percolation are not directly measured.

#### Rule 2: `Alluvial / loam` (Species: Peepal)
- **Botanical Context**: Extremely resilient, deep-rooting species that colonizes floodplains, river alluvium, and varied loamy/silty substrates.
- **Accepted `suitable` Textures**: `Loam`, `Silt loam`, `Clay loam`, `Sandy loam`, `Silty clay loam`, `Silt`, `Sandy clay loam`
- **Accepted `moderate` Textures**: `Loamy sand`, `Clay`
- **Incompatible `unsuitable` Textures**: `Sand` (pure shifting sand lacks minimum water/nutrient retention for initial sapling establishment)
- **Implementation Limitation**: Alluvial geologic origin is not identified by SoilGrids; alluvial suitability is evaluated via loamy/silty deposition texture proxies.

#### Rule 3: `Well-drained clay-loam` (Species: Banyan)
- **Botanical Context**: Large canopy and massive root/prop system requiring heavy mechanical anchorage and strong moisture-holding capacity provided by clay-loams and loams.
- **Accepted `suitable` Textures**: `Clay loam`, `Loam`, `Sandy clay loam`, `Silty clay loam`
- **Accepted `moderate` Textures**: `Sandy loam`, `Silt loam`, `Clay`, `Silt`
- **Incompatible `unsuitable` Textures**: `Sand`, `Loamy sand` (insufficient structural anchorage and high drought risk for heavy canopy)
- **Implementation Limitation**: Soil depth to bedrock and subsoil prop root anchorage capacity are not measured in the 0–5cm layer.

#### Rule 4: `Deep loam` (Species: Mango)
- **Botanical Context**: Deep taproot requiring loose, well-aerated, fertile loam. Vulnerable to taproot rot in stagnant heavy clays and severe moisture deficit in pure sand.
- **Accepted `suitable` Textures**: `Loam`, `Sandy loam`, `Clay loam`, `Silt loam`, `Sandy clay loam`
- **Accepted `moderate` Textures**: `Loamy sand`, `Silty clay loam`, `Silt`
- **Incompatible `unsuitable` Textures**: `Clay` (stagnant aeration/waterlogging), `Sand` (excessive leaching)
- **Implementation Limitation**: Soil profile depth (depth to bedrock) is not measured; evaluated exclusively on topsoil texture.

#### Rule 5: `Loam / clay, near water` (Species: Jamun)
- **Botanical Context**: Moisture-tolerant species adapted to moist alluvial plains, clayey depressions, and riverbanks. Tolerates heavy clay and periodic waterlogging far better than coarse sand.
- **Accepted `suitable` Textures**: `Clay loam`, `Loam`, `Clay`, `Silty clay loam`, `Silt loam`
- **Accepted `moderate` Textures**: `Sandy clay loam`, `Sandy loam`, `Silt`
- **Incompatible `unsuitable` Textures**: `Sand`, `Loamy sand` (dries out too rapidly for moisture-demanding Jamun)
- **Implementation Limitation**: Physical proximity to surface watercourses ("near water") is not verified by point soil data.

#### Rule 6: `Sandy loam / alluvial` (Species: Shisham)
- **Botanical Context**: Pioneer species of river terraces and alluvial sandy-loam beds. Requires porous, well-aerated soil; highly susceptible to root rot and fungal wilt (*Fusarium*) in heavy clays.
- **Accepted `suitable` Textures**: `Sandy loam`, `Loam`, `Sandy clay loam`, `Loamy sand`, `Silt loam`
- **Accepted `moderate` Textures**: `Clay loam`, `Silt`, `Silty clay loam`
- **Incompatible `unsuitable` Textures**: `Clay` (heavy clay causes root asphyxiation and vascular wilt), `Sand` (pure sterile sand)
- **Implementation Limitation**: Fluvial gravel beds and subsoil aeration are not captured in topsoil grid estimates.

#### Rule 7: `Sandy loam` (Species: Gulmohar)
- **Botanical Context**: Shallow, spreading root system adapted to light, well-drained sandy loams. Intolerant of heavy waterlogged clays which cause root rot and wind-throw.
- **Accepted `suitable` Textures**: `Sandy loam`, `Loam`, `Loamy sand`, `Sandy clay loam`
- **Accepted `moderate` Textures**: `Silt loam`, `Clay loam`, `Silt`
- **Incompatible `unsuitable` Textures**: `Clay`, `Silty clay loam` (waterlogging causes root rot), `Sand` (loose sand without cohesion)
- **Implementation Limitation**: On-site slope stability and wind exposure are not captured by soil texture alone.

#### Rule 8: `Riverbank / alluvial loam` (Species: Arjun)
- **Botanical Context**: Riparian species naturally adapted to riverbanks and moist alluvial soils. Requires moisture retention and medium-to-fine texture.
- **Accepted `suitable` Textures**: `Loam`, `Clay loam`, `Silt loam`, `Silty clay loam`, `Sandy clay loam`
- **Accepted `moderate` Textures**: `Clay`, `Sandy loam`, `Silt`
- **Incompatible `unsuitable` Textures**: `Sand`, `Loamy sand` (excessive drainage incompatible with riparian species)
- **Implementation Limitation**: Riparian geomorphology and seasonal flood inundation are not verified by point soil estimates.

---

### Clarification 3: Sunlight Assessment Semantics (Decision 5 Clarified)

#### 1. Frozen Sunlight Evaluation Semantics
The sunlight suitability assessment is governed by the following strict semantic rules:
- **Environmental Input Gate**: Open-Meteo provider availability determines whether the sunlight assessment has the necessary environmental input.
- **Contextual Evidence**: Current `weatherCode` and `condition` (e.g. `'Clear sky'`, `'Partly cloudy'`) are retrieved and included in the output as contextual environmental evidence.
- **No Long-Term Irradiance Claims**: The engine does **NOT** infer, simulate, or claim long-term solar radiation, annual photoperiod, seasonal daylight hours, or parcel-level urban/canopy shade from a single weather observation.
- **Indicative V1 Assessment**: The output is explicitly labeled and explained as an indicative V1 assessment based on species canopy requirements.
- **Provider Failure**: If Open-Meteo is unavailable, `checks.sunlight.status` MUST be `insufficient_data`.
- **Provider Success**: If Open-Meteo is available, `checks.sunlight.status` evaluates to `suitable` for canonical open-landscape species (`Full sun`, `Full sun – partial shade`) under standard conditions, with reason string documenting the current weather observation and stating the indicative disclaimer.

#### 2. Exact Reason String Contract
- **When Open-Meteo is available**:
  - *Status*: `"suitable"`
  - *Reason*: `"Location meets open sunlight requirements (Full sun). Current weather: Clear sky (WMO code 0). Indicative V1 assessment based on general canopy requirements; long-term solar irradiance, photoperiod, and local shade obstacles are not measured."`
- **When Open-Meteo is unavailable**:
  - *Status*: `"insufficient_data"`
  - *Reason*: `"Weather and solar data unavailable from external provider (Open-Meteo). Cannot evaluate sunlight suitability."`

---

### Decision 1: Component Status Vocabulary
- **Frozen Enum**: `suitable`, `moderate`, `unsuitable`, `insufficient_data`.
- Applied identically to `checks.soil.status`, `checks.sunlight.status`, `checks.water.status`, `checks.spacing.status`, and `overall.status`.

---

### Decision 2: No Numeric Suitability Score
- Absolute ban on any numeric scores, points, percentages, or composite ratings.

---

### Decision 3: No AI/ML & No Species Ranking
- Pure deterministic JavaScript rule matching.
- Single-species evaluation per request.
- Unranked species catalog.

---

### Decision 6: Water Suitability Assessment
- Evaluates species water demand (`Low`, `Moderate`, `High`) against Open-Meteo atmospheric humidity and precipitation.
- Explicitly disclaims parcel-level groundwater tables or irrigation infrastructure.
- Status is `insufficient_data` if Open-Meteo is unavailable.

---

### Decision 7: Spacing Suitability Assessment (Advisory Requirement)
- Evaluated strictly as an **ADVISORY requirement** (`min_spacing_m`).
- `checks.spacing.status` returns `suitable`.
- `checks.spacing.reason` explicitly notes: *"Advisory requirement: [Species] requires a minimum spacing of [X] meters between adjacent trees. Physical spacing must be verified on-site during planting."*

---

### Decision 8: Missing Data Handling
- Unavailable provider data **never** defaults to `suitable` or `moderate`.
- Missing or failed provider data strictly produces `status: "insufficient_data"`.

---

### Decision 9: Partial Environmental Failure
- If one provider fails and another succeeds, returns HTTP 200 OK with `success: true`.
- Evaluates available components normally and returns `insufficient_data` for failed components.

---

### Decision 10: Overall Aggregation Precedence Rule
- Evaluated via strict deterministic hierarchy:
  $$\mathbf{unsuitable} > \mathbf{insufficient\_data} > \mathbf{moderate} > \mathbf{suitable}$$
  1. If any check is `unsuitable` $\to$ `overall.status = 'unsuitable'`.
  2. Else if any check is `insufficient_data` $\to$ `overall.status = 'insufficient_data'`.
  3. Else if any check is `moderate` $\to$ `overall.status = 'moderate'`.
  4. Else $\to$ `overall.status = 'suitable'`.

---

### Decision 11: `climate_region` Handling
- Treated purely as descriptive botanical metadata in V1.
- Non-blocking for automated pass/fail evaluation.

---

### Decision 12: API Contract Preservation
- Preserves exact public endpoints:
  - `GET /api/v1/species`
  - `GET /api/v1/suitability?lat=&lng=&species=`
- Validates query parameters (`lat` [-90, 90], `lng` [-180, 180], `species` required/trimmed).

---

### Decision 13: Database & Schema Scope
- **Zero schema changes**.
- `suitability_rules` table (Migration 003, Seed 001) is the sole source of truth.

---

### Decision 14: Milestone Boundary Safeguards
- Strictly no M9 verification, no M10 QR codes/public profiles, no frontend UI work, no new external providers, and no Git commands.

---

## Canonical Botanical Rule Matrix (Reference Seed Baseline)

| Species | Soil Type Rule | Min Spacing | Sunlight Requirement | Water Need | Climate Region (Metadata) |
|---|---|---|---|---|---|
| **Neem** | Well-drained loam | 6.00 m | Full sun | Low | Tropical / Subtropical |
| **Peepal** | Alluvial / loam | 8.00 m | Full sun | Moderate | Tropical / Subtropical |
| **Banyan** | Well-drained clay-loam | 12.00 m | Full sun – partial shade | Moderate | Tropical / Subtropical |
| **Mango** | Deep loam | 9.00 m | Full sun | Moderate | Tropical / Subtropical |
| **Jamun** | Loam / clay, near water | 8.00 m | Full sun | Moderate–High | Tropical / Subtropical |
| **Shisham** | Sandy loam / alluvial | 6.00 m | Full sun | Moderate | Subtropical / Plains |
| **Gulmohar** | Sandy loam | 7.00 m | Full sun | Low–Moderate | Tropical / Subtropical |
| **Amaltas** | Well-drained loam | 6.00 m | Full sun | Low | Tropical / Subtropical |
| **Arjun** | Riverbank / alluvial loam | 8.00 m | Full sun | High | Riparian / Subtropical |
| **Ashoka** | Well-drained loam | 4.00 m | Full sun – partial shade | Moderate | Tropical / Humid |

---

## M8 Implementation Ready Statement

The M8 Frozen Decision Record (Version 1.1) is complete, unambiguous, and fully aligned with project owner directives. All 14 decisions, the 3 explicit clarifications (soil intra-component precedence, per-rule USDA texture mapping matrix, and sunlight evaluation semantics), and the implementation limitations are formally locked.

**EcoRevive Milestone 8 is frozen and ready for implementation.**
