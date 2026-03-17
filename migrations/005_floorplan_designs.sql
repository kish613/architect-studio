-- Migration: 3D Floorplan Editor - floorplan_designs table
-- Stores Pascal Editor scene data as JSONB for the 3D floorplan editor

CREATE TABLE IF NOT EXISTS floorplan_designs (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Floorplan',
  scene_data TEXT NOT NULL DEFAULT '{"nodes":{},"rootNodeIds":[]}',
  thumbnail_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_floorplan_designs_user ON floorplan_designs(user_id);
-- Index for project queries
CREATE INDEX IF NOT EXISTS idx_floorplan_designs_project ON floorplan_designs(project_id);
