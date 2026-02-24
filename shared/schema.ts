import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth.js";

// Subscription plans
export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'studio';

// Subscription status
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing';

// User subscriptions table
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  generationsUsed: integer("generations_used").notNull().default(0),
  generationsLimit: integer("generations_limit").notNull().default(2), // Free tier: 2 generations
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  subscriptionStatus: text("subscription_status").$type<SubscriptionStatus>().default("active"),
  gracePeriodEndsAt: timestamp("grace_period_ends_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  lastModified: timestamp("last_modified").notNull().defaultNow(),
});

export const floorplanModels = pgTable("floorplan_models", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  originalUrl: text("original_url").notNull(),
  isometricUrl: text("isometric_url"),
  isometricPrompt: text("isometric_prompt"),
  model3dUrl: text("model_3d_url"),
  baseModel3dUrl: text("base_model_3d_url"),
  meshyTaskId: text("meshy_task_id"),
  texturePrompt: text("texture_prompt"),
  retextureTaskId: text("retexture_task_id"),
  retextureUsed: boolean("retexture_used").notNull().default(false),
  status: text("status").notNull().default("uploaded"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  lastModified: true,
});

export const insertFloorplanModelSchema = createInsertSchema(floorplanModels).omit({
  id: true,
  createdAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertFloorplanModel = z.infer<typeof insertFloorplanModelSchema>;
export type FloorplanModel = typeof floorplanModels.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;

export type ModelStatus = 'uploaded' | 'generating_isometric' | 'isometric_ready' | 'generating_3d' | 'retexturing' | 'completed' | 'failed';

// Plan limits
export const PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  free: 2,
  starter: 5,
  pro: 20,
  studio: 60,
};

// Planning Analysis Status
export type PlanningAnalysisStatus =
  | 'pending' | 'analyzing' | 'searching' | 'awaiting_selection' | 'generating' | 'completed' | 'failed'
  // Smart Extension Advisor statuses
  | 'epc_lookup' | 'pdr_calculating' | 'searching_real' | 'options_ready';

// Workflow mode
export type WorkflowMode = 'classic' | 'extend';

// Extension option tiers
export type ExtensionOptionTier = 'pdr_only' | 'moderate_planning' | 'maximum_extension';

// Planning Analyses table
export const planningAnalyses = pgTable("planning_analyses", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  
  // Input files
  propertyImageUrl: text("property_image_url").notNull(),
  floorplanUrl: text("floorplan_url"),
  
  // Location data
  address: text("address"),
  postcode: text("postcode"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  
  // AI-extracted property characteristics (JSON)
  propertyAnalysis: text("property_analysis"),
  
  // Planning search results (JSON)
  approvalSearchResults: text("approval_search_results"),
  
  // Selected modification for visualization
  selectedModification: text("selected_modification"),
  
  // Generated outputs
  generatedExteriorUrl: text("generated_exterior_url"),
  generatedFloorplanUrl: text("generated_floorplan_url"),
  generatedIsometricUrl: text("generated_isometric_url"),
  
  // Smart Extension Advisor fields
  houseNumber: text("house_number"),
  workflowMode: text("workflow_mode").$type<WorkflowMode>().default("classic"),

  // EPC Register data (JSON)
  epcData: text("epc_data"),

  // Real planning approval data from Perplexity (JSON)
  realApprovalData: text("real_approval_data"),

  // PDR assessment (JSON)
  pdrAssessment: text("pdr_assessment"),

  // Conservation area / listed building
  isConservationArea: boolean("is_conservation_area").default(false),
  isListedBuilding: boolean("is_listed_building").default(false),
  listedBuildingGrade: text("listed_building_grade"),
  conservationAreaName: text("conservation_area_name"),

  // Property orientation
  orientation: text("orientation"),

  // Party wall assessment (JSON)
  partyWallAssessment: text("party_wall_assessment"),

  // Neighbour impact analysis (JSON)
  neighbourImpact: text("neighbour_impact"),

  // Extension options - 3 tiers (JSON array)
  extensionOptions: text("extension_options"),

  // Selected extension option tier
  selectedOptionTier: text("selected_option_tier").$type<ExtensionOptionTier>(),

  // Cost estimation (JSON)
  costEstimate: text("cost_estimate"),

  // Generated floorplans per option (JSON map: tier → URL)
  generatedOptionFloorplans: text("generated_option_floorplans"),

  // Satellite/map image
  satelliteImageUrl: text("satellite_image_url"),

  // Processing status
  status: text("status").$type<PlanningAnalysisStatus>().notNull().default("pending"),
  errorMessage: text("error_message"),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlanningAnalysisSchema = createInsertSchema(planningAnalyses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlanningAnalysis = z.infer<typeof insertPlanningAnalysisSchema>;
export type PlanningAnalysis = typeof planningAnalyses.$inferSelect;

// Type for property analysis JSON
export interface PropertyAnalysisData {
  propertyType: 'terraced' | 'semi-detached' | 'detached' | 'flat' | 'bungalow' | 'other';
  architecturalStyle: string;
  estimatedEra: string;
  materials: string[];
  existingFeatures: string[];
  stories: number;
  estimatedSqFt: number;
  extensionPotential: {
    rear: 'high' | 'medium' | 'low' | 'none';
    side: 'high' | 'medium' | 'low' | 'none';
    loft: 'high' | 'medium' | 'low' | 'none';
    garage: 'high' | 'medium' | 'low' | 'none';
  };
}

// Type for approval search results JSON
export interface ApprovalSearchResults {
  searchRadius: number;
  totalFound: number;
  approvals: Array<{
    applicationRef: string;
    address: string;
    distance: number;
    modificationType: string;
    description: string;
    decisionDate: string;
    estimatedSqFt?: number;
  }>;
  modificationSummary: {
    [key: string]: {
      count: number;
      avgApprovalRate: number;
    };
  };
}

// ==========================================
// Smart Extension Advisor Types
// ==========================================

// EPC Register data
export interface EPCData {
  lmkKey: string;
  address: string;
  postcode: string;
  buildingReference: string;
  propertyType: string;
  builtForm: string;
  totalFloorArea: number; // square metres
  numberOfHabitableRooms: number;
  currentEnergyRating: string;
  potentialEnergyRating: string;
  constructionAgeBand: string;
  wallsDescription: string;
  roofDescription: string;
  windowsDescription: string;
  mainHeatDescription: string;
  transactionType: string;
  environmentImpactCurrent: number;
  co2EmissionsCurrent: number;
}

// PDR Assessment
export interface PDRAssessment {
  propertyCategory: 'detached' | 'semi_detached' | 'terraced' | 'bungalow' | 'flat' | 'other';

  rearExtension: {
    singleStoreyMaxDepthM: number;
    singleStoreyMaxHeightM: number;
    twoStoreyMaxDepthM: number;
    twoStoreyMinDistFromBoundaryM: number;
    priorApprovalMaxDepthM: number;
    permitted: boolean;
    notes: string[];
  };

  sideExtension: {
    maxWidthPercentOfOriginal: number;
    singleStoreyOnly: boolean;
    maxHeightM: number;
    minDistFromBoundaryM: number;
    permitted: boolean;
    notes: string[];
  };

  loftConversion: {
    maxAdditionalVolumeM3: number;
    dormerAllowed: boolean;
    frontDormerAllowed: boolean;
    sideWindowObscuredGlazed: boolean;
    permitted: boolean;
    notes: string[];
  };

  outbuilding: {
    maxCoveragePercent: number;
    maxHeightNearBoundaryM: number;
    maxHeightElsewhereM: number;
    permitted: boolean;
    notes: string[];
  };

  conservationAreaRestrictions: string[];
  listedBuildingRestrictions: string[];
  overallPDRSummary: string;
}

// Extension type
export type ExtensionType =
  | 'rear_single_storey'
  | 'rear_two_storey'
  | 'side'
  | 'loft'
  | 'wraparound'
  | 'basement'
  | 'outbuilding';

// Individual extension details within an option
export interface ExtensionDetail {
  type: ExtensionType;
  description: string;
  additionalSqM: number;
  depthM?: number;
  widthM?: number;
  heightM?: number;
}

// Extension option (one of 3 tiers)
export interface ExtensionOption {
  tier: ExtensionOptionTier;
  label: string;
  description: string;
  requiresPlanningPermission: boolean;
  extensions: ExtensionDetail[];
  totalAdditionalSqM: number;
  estimatedCostGBP: {
    low: number;
    mid: number;
    high: number;
  };
  approvalLikelihood: 'very_high' | 'high' | 'moderate' | 'low';
  planningNotes: string[];
  partyWallRequired: boolean;
  buildingRegsRequired: boolean;
  timelineWeeks: { min: number; max: number };
}

// Cost estimation
export interface CostEstimate {
  costPerSqmByType: Record<ExtensionType, { low: number; mid: number; high: number }>;
  region: string;
  regionMultiplier: number;
  lastUpdated: string;
}

// Party wall assessment
export interface PartyWallAssessment {
  required: boolean;
  affectedBoundaries: Array<{
    side: 'left' | 'right' | 'rear';
    reason: string;
    noticeRequired: boolean;
    estimatedSurveyorCostGBP: number;
  }>;
  totalEstimatedCostGBP: number;
  notes: string[];
}

// Neighbour impact analysis
export interface NeighbourImpactAnalysis {
  fortyFiveDegreeRule: {
    passed: boolean;
    affectedNeighbours: string[];
    notes: string;
  };
  overshadowing: {
    severity: 'none' | 'minor' | 'moderate' | 'significant';
    affectedDirection: string;
    notes: string;
  };
  overlooking: {
    risk: 'none' | 'low' | 'moderate' | 'high';
    mitigations: string[];
  };
  overallRisk: 'low' | 'moderate' | 'high';
  recommendations: string[];
}

// Real planning approval data from Perplexity
export interface RealApprovalData {
  searchSummary: string;
  councilName: string;
  councilPlanningPortalUrl: string;
  recentApprovals: Array<{
    applicationRef: string;
    address: string;
    description: string;
    decision: string;
    decisionDate: string;
    modificationType: string;
    source: string;
  }>;
  areaCharacteristics: string;
  commonExtensionTypes: string[];
  knownRestrictions: string[];
}
