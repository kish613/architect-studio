-- Migration: track floorplan model pipeline metadata in the database
-- Keeps production schema aligned with the Pascal-first generation flow.

ALTER TABLE floorplan_models
  ADD COLUMN IF NOT EXISTS provider TEXT;

ALTER TABLE floorplan_models
  ADD COLUMN IF NOT EXISTS stage TEXT;

ALTER TABLE floorplan_models
  ADD COLUMN IF NOT EXISTS last_error TEXT;

ALTER TABLE floorplan_models
  ADD COLUMN IF NOT EXISTS last_diagnostics TEXT;

ALTER TABLE floorplan_models
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;

ALTER TABLE floorplan_models
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP;

ALTER TABLE floorplan_models
  ADD COLUMN IF NOT EXISTS scene_version INTEGER;

ALTER TABLE floorplan_models
  ADD COLUMN IF NOT EXISTS retexture_version INTEGER;

UPDATE floorplan_models
SET
  provider = COALESCE(provider, 'meshy'),
  stage = COALESCE(stage, status, 'uploaded'),
  scene_version = COALESCE(scene_version, 1),
  retexture_version = COALESCE(retexture_version, 0);

ALTER TABLE floorplan_models
  ALTER COLUMN provider SET DEFAULT 'meshy',
  ALTER COLUMN provider SET NOT NULL,
  ALTER COLUMN stage SET DEFAULT 'uploaded',
  ALTER COLUMN stage SET NOT NULL,
  ALTER COLUMN scene_version SET DEFAULT 1,
  ALTER COLUMN scene_version SET NOT NULL,
  ALTER COLUMN retexture_version SET DEFAULT 0,
  ALTER COLUMN retexture_version SET NOT NULL;
