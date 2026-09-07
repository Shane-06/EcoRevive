-- Seed 001: Suitability rules for 10 canonical species
-- Description: Seeds the 10 proposal species deterministic suitability rules per Database Design V1.0 Section 12.

INSERT INTO suitability_rules (species, soil_type, min_spacing_m, sunlight, water_need, climate_region)
VALUES
  ('Neem', 'Well-drained loam', 6.00, 'Full sun', 'Low', 'Tropical / Subtropical'),
  ('Peepal', 'Alluvial / loam', 8.00, 'Full sun', 'Moderate', 'Tropical / Subtropical'),
  ('Banyan', 'Well-drained clay-loam', 12.00, 'Full sun – partial shade', 'Moderate', 'Tropical / Subtropical'),
  ('Mango', 'Deep loam', 9.00, 'Full sun', 'Moderate', 'Tropical / Subtropical'),
  ('Jamun', 'Loam / clay, near water', 8.00, 'Full sun', 'Moderate–High', 'Tropical / Subtropical'),
  ('Shisham', 'Sandy loam / alluvial', 6.00, 'Full sun', 'Moderate', 'Subtropical / Plains'),
  ('Gulmohar', 'Sandy loam', 7.00, 'Full sun', 'Low–Moderate', 'Tropical / Subtropical'),
  ('Amaltas', 'Well-drained loam', 6.00, 'Full sun', 'Low', 'Tropical / Subtropical'),
  ('Arjun', 'Riverbank / alluvial loam', 8.00, 'Full sun', 'High', 'Riparian / Subtropical'),
  ('Ashoka', 'Well-drained loam', 4.00, 'Full sun – partial shade', 'Moderate', 'Tropical / Humid')
ON CONFLICT (species) DO UPDATE SET
  soil_type = EXCLUDED.soil_type,
  min_spacing_m = EXCLUDED.min_spacing_m,
  sunlight = EXCLUDED.sunlight,
  water_need = EXCLUDED.water_need,
  climate_region = EXCLUDED.climate_region,
  updated_at = CURRENT_TIMESTAMP;
