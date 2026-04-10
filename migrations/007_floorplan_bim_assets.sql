-- Migration: BIM-first architecture
--
-- Evolves floorplan_designs so the canonical BIM JSON (canonical_json)
-- becomes the source of truth, with Pascal sceneData kept only as a
-- legacy compatibility bridge. Adds derived asset columns (IFC/GLB/
-- Fragments) and a source-file reference.
--
-- Existing records stay valid: canonical_json is nullable, so historical
-- Pascal-only rows keep working until they are regenerated.

ALTER TABLE floorplan_designs
  ADD COLUMN IF NOT EXISTS canonical_json TEXT,
  ADD COLUMN IF NOT EXISTS source_file_url TEXT,
  ADD COLUMN IF NOT EXISTS ifc_url TEXT,
  ADD COLUMN IF NOT EXISTS fragments_url TEXT,
  ADD COLUMN IF NOT EXISTS glb_url TEXT,
  ADD COLUMN IF NOT EXISTS diagnostics_json TEXT;
