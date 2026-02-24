-- Migration: Smart Extension Advisor
-- Adds fields for EPC data, PDR assessment, real planning search,
-- conservation/listing checks, extension options, costs, and party wall analysis

-- House number for EPC lookup
ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS house_number TEXT;

-- Workflow mode: 'classic' for existing flow, 'extend' for Smart Extension Advisor
ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS workflow_mode TEXT DEFAULT 'classic';

-- EPC Register data (JSON stored as TEXT)
ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS epc_data TEXT;

-- Real planning approval data from Perplexity (JSON stored as TEXT)
ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS real_approval_data TEXT;

-- PDR calculation results (JSON stored as TEXT)
ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS pdr_assessment TEXT;

-- Conservation area / listed building flags
ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS is_conservation_area BOOLEAN DEFAULT FALSE;
ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS is_listed_building BOOLEAN DEFAULT FALSE;
ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS listed_building_grade TEXT;
ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS conservation_area_name TEXT;

-- Property orientation (compass direction front faces)
ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS orientation TEXT;

-- Party wall assessment (JSON stored as TEXT)
ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS party_wall_assessment TEXT;

-- Neighbour impact analysis (JSON stored as TEXT)
ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS neighbour_impact TEXT;

-- Multiple extension options - 3 tiers (JSON array stored as TEXT)
ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS extension_options TEXT;

-- Selected extension option tier
ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS selected_option_tier TEXT;

-- Cost estimation (JSON stored as TEXT)
ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS cost_estimate TEXT;

-- Generated floorplans per option (JSON map: tier -> URL, stored as TEXT)
ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS generated_option_floorplans TEXT;

-- Satellite/map image URL
ALTER TABLE planning_analyses ADD COLUMN IF NOT EXISTS satellite_image_url TEXT;

-- Index for workflow mode queries
CREATE INDEX IF NOT EXISTS idx_planning_analyses_workflow ON planning_analyses(workflow_mode);
