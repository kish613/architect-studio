/**
 * Canonical BIM JSON schema — the new source of truth for floorplan data.
 *
 * Architectural principles:
 * - This schema represents a Building Information Model (BIM), not a rendering scene.
 * - Geometry is *parametric* (walls have start/end points; slabs have outlines)
 *   rather than baked meshes. Viewer/renderer code derives meshes from this model.
 * - Building elements (walls, slabs, ceilings, roofs, stairs, columns, openings)
 *   are procedurally generated — never sourced from a catalog of freeform meshes.
 * - Doors and windows are *parametric family types*, not assets.
 * - Furniture, appliances, fixtures, decor etc. are the *only* elements that
 *   reference the curated catalog (GLB assets).
 *
 * Export pipeline (derived from this canonical model):
 *   canonical-json  ──►  IFC (.ifc)           — the master "BIM" asset
 *                   ──►  GLB / Fragments      — viewer-friendly derived assets
 *                   ──►  Pascal SceneData     — legacy editor compatibility only
 *
 * This module must stay framework-free and runnable in both the browser and
 * Vercel serverless (Node) environments. No pg / drizzle / three.js imports here.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Versioning
// ─────────────────────────────────────────────────────────────

export const CANONICAL_BIM_SCHEMA_VERSION = 1;

// ─────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────

export const vec2Schema = z.object({
  x: z.number(),
  z: z.number(),
});

export const vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export type Vec2 = z.infer<typeof vec2Schema>;
export type Vec3 = z.infer<typeof vec3Schema>;

// ─────────────────────────────────────────────────────────────
// Material / finish references
// ─────────────────────────────────────────────────────────────

/**
 * A material reference points at the canonical material library by ID.
 * It deliberately does NOT embed colours/textures — those live in the library
 * so the BIM model stays lightweight and re-theming is cheap.
 */
export const materialRefSchema = z.object({
  id: z.string().min(1),
  kind: z
    .enum([
      "plaster",
      "paint",
      "brick",
      "concrete",
      "wood",
      "tile",
      "stone",
      "metal",
      "glass",
      "fabric",
      "other",
    ])
    .default("other"),
  label: z.string().optional(),
  /** Free-form library/provider identifier for this finish. */
  libraryRef: z.string().optional(),
});

export type MaterialRef = z.infer<typeof materialRefSchema>;

// ─────────────────────────────────────────────────────────────
// Generic element metadata
// ─────────────────────────────────────────────────────────────

const baseElementSchema = z.object({
  id: z.string().min(1),
  /** IFC GlobalId if exported, otherwise undefined until IFC generation. */
  ifcGuid: z.string().optional(),
  /** Human-readable name. */
  name: z.string().optional(),
  /** ID of the containing level, if applicable. */
  levelId: z.string().optional(),
  /** Free-form tags for filtering/selection in the BIM viewer. */
  tags: z.array(z.string()).default([]),
});

// ─────────────────────────────────────────────────────────────
// Levels
// ─────────────────────────────────────────────────────────────

export const levelSchema = baseElementSchema.extend({
  /** Integer storey index: -1 = basement, 0 = ground, 1 = first floor, ... */
  index: z.number().int(),
  /** Elevation of the floor slab top, in metres. */
  elevation: z.number(),
  /** Floor-to-ceiling height, in metres. */
  height: z.number().positive().default(2.7),
});

export type Level = z.infer<typeof levelSchema>;

// ─────────────────────────────────────────────────────────────
// Walls
// ─────────────────────────────────────────────────────────────

export const wallSchema = baseElementSchema.extend({
  kind: z.literal("wall").default("wall"),
  start: vec2Schema,
  end: vec2Schema,
  /** Height of the wall from its base, in metres. */
  height: z.number().positive().default(2.7),
  /** Thickness in metres. */
  thickness: z.number().positive().default(0.15),
  /**
   * Whether this wall forms part of the building envelope.
   * Used for window-placement heuristics and massing.
   */
  isExterior: z.boolean().default(false),
  /** Optional load-bearing flag (for structural views). */
  isLoadBearing: z.boolean().default(false),
  materialId: z.string().optional(),
});

export type Wall = z.infer<typeof wallSchema>;

// ─────────────────────────────────────────────────────────────
// Door / Window — parametric family types
// ─────────────────────────────────────────────────────────────

export const doorFamilySchema = z.enum([
  "single",
  "double",
  "sliding",
  "french",
  "bifold",
  "pocket",
  "garage",
]);
export type DoorFamily = z.infer<typeof doorFamilySchema>;

export const windowFamilySchema = z.enum([
  "fixed",
  "casement",
  "sash",
  "sliding",
  "bay",
  "skylight",
  "awning",
  "picture",
]);
export type WindowFamily = z.infer<typeof windowFamilySchema>;

export const doorSchema = baseElementSchema.extend({
  kind: z.literal("door").default("door"),
  /** Host wall ID. Doors are always mounted in a wall. */
  hostWallId: z.string(),
  /** 0..1 position along the host wall (0 = start, 1 = end). */
  position: z.number().min(0).max(1).default(0.5),
  width: z.number().positive().default(0.9),
  height: z.number().positive().default(2.1),
  family: doorFamilySchema.default("single"),
  swing: z.enum(["left", "right"]).default("left"),
  materialId: z.string().optional(),
});

export type Door = z.infer<typeof doorSchema>;

export const windowSchema = baseElementSchema.extend({
  kind: z.literal("window").default("window"),
  hostWallId: z.string(),
  position: z.number().min(0).max(1).default(0.5),
  width: z.number().positive().default(1.2),
  height: z.number().positive().default(1.2),
  sillHeight: z.number().min(0).default(0.9),
  family: windowFamilySchema.default("casement"),
  materialId: z.string().optional(),
});

export type Window = z.infer<typeof windowSchema>;

// ─────────────────────────────────────────────────────────────
// Slabs, ceilings, roofs
// ─────────────────────────────────────────────────────────────

export const slabSchema = baseElementSchema.extend({
  kind: z.literal("slab").default("slab"),
  outline: z.array(vec2Schema),
  thickness: z.number().positive().default(0.3),
  materialId: z.string().optional(),
});

export type Slab = z.infer<typeof slabSchema>;

export const ceilingSchema = baseElementSchema.extend({
  kind: z.literal("ceiling").default("ceiling"),
  outline: z.array(vec2Schema),
  thickness: z.number().positive().default(0.1),
  materialId: z.string().optional(),
});

export type Ceiling = z.infer<typeof ceilingSchema>;

export const roofSchema = baseElementSchema.extend({
  kind: z.literal("roof").default("roof"),
  /** Building outline footprint the roof covers. */
  outline: z.array(vec2Schema),
  roofType: z.enum(["flat", "gable", "hip", "mansard", "shed"]).default("gable"),
  pitchDeg: z.number().min(0).max(60).default(35),
  overhang: z.number().min(0).default(0.3),
  materialId: z.string().optional(),
});

export type Roof = z.infer<typeof roofSchema>;

// ─────────────────────────────────────────────────────────────
// Rooms / zones
// ─────────────────────────────────────────────────────────────

export const roomSchema = baseElementSchema.extend({
  kind: z.literal("room").default("room"),
  label: z.string().default(""),
  roomType: z
    .enum([
      "room",
      "hallway",
      "bathroom",
      "kitchen",
      "bedroom",
      "living",
      "dining",
      "office",
      "garage",
      "utility",
      "closet",
      "stairwell",
      "other",
    ])
    .default("room"),
  outline: z.array(vec2Schema),
  /** Optional accent colour for the extract/BIM views. */
  color: z.string().optional(),
});

export type Room = z.infer<typeof roomSchema>;

// ─────────────────────────────────────────────────────────────
// Stairs & columns
// ─────────────────────────────────────────────────────────────

export const stairSchema = baseElementSchema.extend({
  kind: z.literal("stair").default("stair"),
  start: vec2Schema,
  end: vec2Schema,
  width: z.number().positive().default(1.0),
  numSteps: z.number().int().positive().default(13),
  riseTotal: z.number().positive().default(2.7),
  stairType: z.enum(["straight", "l_shaped", "u_shaped", "spiral"]).default("straight"),
  materialId: z.string().optional(),
});

export type Stair = z.infer<typeof stairSchema>;

export const columnSchema = baseElementSchema.extend({
  kind: z.literal("column").default("column"),
  position: vec2Schema,
  width: z.number().positive().default(0.3),
  depth: z.number().positive().default(0.3),
  height: z.number().positive().default(2.7),
  shape: z.enum(["rect", "round"]).default("rect"),
  materialId: z.string().optional(),
});

export type Column = z.infer<typeof columnSchema>;

// ─────────────────────────────────────────────────────────────
// Fixtures & furniture — curated catalog assets
// ─────────────────────────────────────────────────────────────

/**
 * Fixtures and furniture are the only BIM elements sourced from the
 * curated catalog. They carry a catalog reference and optional per-instance
 * overrides. Building geometry must NEVER use this path.
 */
export const catalogAssetRefSchema = z.object({
  catalogId: z.string().min(1),
  /** Preferred derived GLB URL (set by the pipeline after catalog lookup). */
  glbUrl: z.string().optional(),
  /** Approximate axis-aligned bounding box in metres. */
  dimensions: vec3Schema.default({ x: 1, y: 1, z: 1 }),
  /** Optional free-form keywords carried from the catalog for filtering. */
  keywords: z.array(z.string()).default([]),
  /** Optional provenance/license string carried from the catalog. */
  provenance: z.string().optional(),
  /** Material slot overrides referring to material library IDs. */
  materialSlots: z
    .array(
      z.object({
        slotId: z.string(),
        label: z.string().optional(),
        materialId: z.string(),
      })
    )
    .default([]),
});

export type CatalogAssetRef = z.infer<typeof catalogAssetRefSchema>;

const placedAssetBase = baseElementSchema.extend({
  position: vec3Schema,
  rotationY: z.number().default(0),
  asset: catalogAssetRefSchema,
});

export const furnitureSchema = placedAssetBase.extend({
  kind: z.literal("furniture").default("furniture"),
  category: z
    .enum([
      "seating",
      "table",
      "bed",
      "storage",
      "desk",
      "decor",
      "lighting",
      "other",
    ])
    .default("other"),
});
export type Furniture = z.infer<typeof furnitureSchema>;

export const fixtureSchema = placedAssetBase.extend({
  kind: z.literal("fixture").default("fixture"),
  category: z
    .enum([
      "toilet",
      "sink",
      "bath",
      "shower",
      "oven",
      "fridge",
      "washer",
      "other",
    ])
    .default("other"),
});
export type Fixture = z.infer<typeof fixtureSchema>;

// ─────────────────────────────────────────────────────────────
// Project metadata
// ─────────────────────────────────────────────────────────────

export const bimMetadataSchema = z.object({
  schemaVersion: z.number().int().positive().default(CANONICAL_BIM_SCHEMA_VERSION),
  units: z.literal("meters").default("meters"),
  sourceType: z.enum(["image", "pdf", "manual", "imported_ifc"]).default("image"),
  /** Original file URL (image or PDF) — this is the source of truth. */
  sourceFileUrl: z.string().optional(),
  /** Rasterised / preprocessed thumbnail we actually fed to the AI extractor. */
  processedImageUrl: z.string().optional(),
  /** 0..1 confidence the pipeline has in the extracted metric scale. */
  scaleConfidence: z.number().min(0).max(1).default(0.5),
  /** Free-form notes surfaced to the user in the extract/review view. */
  extractionNotes: z.array(z.string()).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type BimMetadata = z.infer<typeof bimMetadataSchema>;

// ─────────────────────────────────────────────────────────────
// Materials library slice
// ─────────────────────────────────────────────────────────────

export const bimMaterialsSchema = z.record(z.string(), materialRefSchema);
export type BimMaterials = z.infer<typeof bimMaterialsSchema>;

// ─────────────────────────────────────────────────────────────
// The canonical BIM model
// ─────────────────────────────────────────────────────────────

export const canonicalBimSchema = z.object({
  metadata: bimMetadataSchema,
  levels: z.array(levelSchema).default([]),
  walls: z.array(wallSchema).default([]),
  doors: z.array(doorSchema).default([]),
  windows: z.array(windowSchema).default([]),
  slabs: z.array(slabSchema).default([]),
  ceilings: z.array(ceilingSchema).default([]),
  roofs: z.array(roofSchema).default([]),
  rooms: z.array(roomSchema).default([]),
  stairs: z.array(stairSchema).default([]),
  columns: z.array(columnSchema).default([]),
  furniture: z.array(furnitureSchema).default([]),
  fixtures: z.array(fixtureSchema).default([]),
  materials: bimMaterialsSchema.default({}),
});

export type CanonicalBim = z.infer<typeof canonicalBimSchema>;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

export function createEmptyCanonicalBim(
  overrides: Partial<BimMetadata> = {}
): CanonicalBim {
  const metadata: BimMetadata = bimMetadataSchema.parse({
    schemaVersion: CANONICAL_BIM_SCHEMA_VERSION,
    units: "meters",
    sourceType: "manual",
    scaleConfidence: 0.5,
    extractionNotes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  return canonicalBimSchema.parse({
    metadata,
    levels: [
      {
        id: "level-ground",
        name: "Ground Floor",
        index: 0,
        elevation: 0,
        height: 2.7,
        tags: [],
      },
    ],
    walls: [],
    doors: [],
    windows: [],
    slabs: [],
    ceilings: [],
    roofs: [],
    rooms: [],
    stairs: [],
    columns: [],
    furniture: [],
    fixtures: [],
    materials: {},
  });
}

/** Total footprint bounding box of all walls (for quick diagnostics/previews). */
export function computeBimBounds(bim: CanonicalBim): {
  min: Vec2;
  max: Vec2;
} {
  let minX = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  const consider = (p: Vec2) => {
    if (p.x < minX) minX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.x > maxX) maxX = p.x;
    if (p.z > maxZ) maxZ = p.z;
  };

  for (const w of bim.walls) {
    consider(w.start);
    consider(w.end);
  }
  for (const s of bim.slabs) {
    for (const p of s.outline) consider(p);
  }

  if (!Number.isFinite(minX)) {
    return { min: { x: 0, z: 0 }, max: { x: 0, z: 0 } };
  }
  return { min: { x: minX, z: minZ }, max: { x: maxX, z: maxZ } };
}
