-- Migration: Add planning_analyses table
-- Created: 2026-01-06

CREATE TABLE IF NOT EXISTS planning_analyses (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL,
  
  -- Input files
  property_image_url TEXT NOT NULL,
  floorplan_url TEXT,
  
  -- Location data
  address TEXT,
  postcode TEXT,
  latitude TEXT,
  longitude TEXT,
  
  -- AI-extracted property characteristics (JSON stored as TEXT)
  property_analysis TEXT,
  
  -- Planning search results (JSON stored as TEXT)
  approval_search_results TEXT,
  
  -- Selected modification for visualization
  selected_modification TEXT,
  
  -- Generated outputs
  generated_exterior_url TEXT,
  generated_floorplan_url TEXT,
  generated_isometric_url TEXT,
  
  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_planning_analyses_user ON planning_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_analyses_project ON planning_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_planning_analyses_status ON planning_analyses(status);
CREATE INDEX IF NOT EXISTS idx_planning_analyses_postcode ON planning_analyses(postcode);
