import { z } from "zod";

const baseNodeSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  childIds: z.array(z.string().uuid()),
  name: z.string(),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
});

const vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const uvScaleSchema = z.object({
  x: z.number().positive(),
  y: z.number().positive(),
});

const bimRefSchema = z.object({
  source: z.enum(["ifc", "catalog"]),
  externalId: z.string().min(1),
  className: z.string().optional(),
  propertySetKeys: z.array(z.string()).optional(),
});

const materialSlotSchema = z.object({
  slotId: z.string().min(1),
  label: z.string().min(1),
  finishId: z.string().min(1),
  finishVariantId: z.string().optional(),
});

const transformSchema = z.object({
  position: vec3Schema.default({ x: 0, y: 0, z: 0 }),
  rotation: vec3Schema.default({ x: 0, y: 0, z: 0 }),
  scale: vec3Schema.default({ x: 1, y: 1, z: 1 }),
});

export const siteNodeSchema = baseNodeSchema.extend({
  type: z.literal("site"),
  transform: transformSchema.default({}),
});

export const buildingNodeSchema = baseNodeSchema.extend({
  type: z.literal("building"),
  transform: transformSchema.default({}),
});

export const levelNodeSchema = baseNodeSchema.extend({
  type: z.literal("level"),
  elevation: z.number().default(0),
  height: z.number().default(2.7),
  index: z.number().default(0),
  assemblyId: z.string().optional(),
  transform: transformSchema.default({}),
});

export const zoneNodeSchema = baseNodeSchema.extend({
  type: z.literal("zone"),
  zoneType: z
    .enum([
      "room",
      "hallway",
      "bathroom",
      "kitchen",
      "bedroom",
      "living",
      "garage",
      "utility",
      "other",
    ])
    .default("room"),
  label: z.string().default(""),
  color: z.string().default("#4A90D9"),
  points: z.array(vec3Schema).default([]),
  assemblyId: z.string().optional(),
  transform: transformSchema.default({}),
});

export const wallNodeSchema = baseNodeSchema.extend({
  type: z.literal("wall"),
  start: vec3Schema,
  end: vec3Schema,
  height: z.number().default(2.7),
  thickness: z.number().default(0.15),
  material: z.string().default("plaster"),
  finishId: z.string().optional(),
  finishVariantId: z.string().optional(),
  assemblyId: z.string().optional(),
  uvScale: uvScaleSchema.optional(),
  transform: transformSchema.default({}),
});

export const ceilingNodeSchema = baseNodeSchema.extend({
  type: z.literal("ceiling"),
  points: z.array(vec3Schema).default([]),
  height: z.number().default(0.2),
  material: z.string().default("plaster"),
  finishId: z.string().optional(),
  finishVariantId: z.string().optional(),
  assemblyId: z.string().optional(),
  uvScale: uvScaleSchema.optional(),
  transform: transformSchema.default({}),
});

export const slabNodeSchema = baseNodeSchema.extend({
  type: z.literal("slab"),
  points: z.array(vec3Schema).default([]),
  thickness: z.number().default(0.3),
  material: z.string().default("concrete"),
  finishId: z.string().optional(),
  finishVariantId: z.string().optional(),
  assemblyId: z.string().optional(),
  uvScale: uvScaleSchema.optional(),
  transform: transformSchema.default({}),
});

export const roofNodeSchema = baseNodeSchema.extend({
  type: z.literal("roof"),
  roofType: z.enum(["flat", "gable", "hip", "mansard", "shed"]).default("gable"),
  pitch: z.number().default(35),
  overhang: z.number().default(0.3),
  points: z.array(vec3Schema).default([]),
  material: z.string().default("tile"),
  finishId: z.string().optional(),
  finishVariantId: z.string().optional(),
  assemblyId: z.string().optional(),
  uvScale: uvScaleSchema.optional(),
  transform: transformSchema.default({}),
});

export const doorNodeSchema = baseNodeSchema.extend({
  type: z.literal("door"),
  wallId: z.string().uuid(),
  position: z.number().default(0.5),
  width: z.number().default(0.9),
  height: z.number().default(2.1),
  doorType: z.enum(["single", "double", "sliding", "french", "bifold"]).default("single"),
  swing: z.enum(["left", "right"]).default("left"),
  transform: transformSchema.default({}),
});

export const windowNodeSchema = baseNodeSchema.extend({
  type: z.literal("window"),
  wallId: z.string().uuid(),
  position: z.number().default(0.5),
  width: z.number().default(1.2),
  height: z.number().default(1.2),
  sillHeight: z.number().default(0.9),
  windowType: z
    .enum(["fixed", "casement", "sash", "sliding", "bay", "skylight"])
    .default("casement"),
  transform: transformSchema.default({}),
});

export const guideNodeSchema = baseNodeSchema.extend({
  type: z.literal("guide"),
  guideType: z.enum(["line", "grid", "reference"]).default("line"),
  start: vec3Schema.default({ x: 0, y: 0, z: 0 }),
  end: vec3Schema.default({ x: 1, y: 0, z: 0 }),
  transform: transformSchema.default({}),
});

export const scanNodeSchema = baseNodeSchema.extend({
  type: z.literal("scan"),
  imageUrl: z.string(),
  width: z.number().default(10),
  height: z.number().default(10),
  opacity: z.number().min(0).max(1).default(0.5),
  transform: transformSchema.default({}),
});

export const itemNodeSchema = baseNodeSchema.extend({
  type: z.literal("item"),
  itemType: z.enum(["furniture", "appliance", "fixture", "light", "custom"]).default("furniture"),
  catalogId: z.string().optional(),
  dimensions: vec3Schema.default({ x: 1, y: 1, z: 1 }),
  material: z.string().default("wood"),
  modelUrl: z.string().optional(),
  finishId: z.string().optional(),
  finishVariantId: z.string().optional(),
  materialSlots: z.array(materialSlotSchema).default([]),
  assetQualityTier: z.enum(["placeholder", "draft", "production"]).default("placeholder"),
  assetStyleTier: z.enum(["realistic", "stylized"]).default("realistic"),
  bimRef: bimRefSchema.optional(),
  transform: transformSchema.default({}),
});

export const anyNodeSchema = z.discriminatedUnion("type", [
  siteNodeSchema,
  buildingNodeSchema,
  levelNodeSchema,
  zoneNodeSchema,
  wallNodeSchema,
  ceilingNodeSchema,
  slabNodeSchema,
  roofNodeSchema,
  doorNodeSchema,
  windowNodeSchema,
  guideNodeSchema,
  scanNodeSchema,
  itemNodeSchema,
]);

export type SiteNode = z.infer<typeof siteNodeSchema>;
export type BuildingNode = z.infer<typeof buildingNodeSchema>;
export type LevelNode = z.infer<typeof levelNodeSchema>;
export type ZoneNode = z.infer<typeof zoneNodeSchema>;
export type WallNode = z.infer<typeof wallNodeSchema>;
export type CeilingNode = z.infer<typeof ceilingNodeSchema>;
export type SlabNode = z.infer<typeof slabNodeSchema>;
export type RoofNode = z.infer<typeof roofNodeSchema>;
export type DoorNode = z.infer<typeof doorNodeSchema>;
export type WindowNode = z.infer<typeof windowNodeSchema>;
export type GuideNode = z.infer<typeof guideNodeSchema>;
export type ScanNode = z.infer<typeof scanNodeSchema>;
export type ItemNode = z.infer<typeof itemNodeSchema>;
export type AnyNode = z.infer<typeof anyNodeSchema>;
export type NodeType = AnyNode["type"];
export type Vec3 = z.infer<typeof vec3Schema>;

export const sceneDataSchema = z.object({
  nodes: z.record(z.string(), anyNodeSchema),
  rootNodeIds: z.array(z.string()),
});

export type SceneData = z.infer<typeof sceneDataSchema>;

export const NODE_TYPES = [
  "site",
  "building",
  "level",
  "zone",
  "wall",
  "ceiling",
  "slab",
  "roof",
  "door",
  "window",
  "guide",
  "scan",
  "item",
] as const;

export function createNode<T extends AnyNode["type"]>(
  type: T,
  overrides: Partial<Extract<AnyNode, { type: T }>> = {} as never
): Extract<AnyNode, { type: T }> {
  const id = crypto.randomUUID();
  const raw = {
    id,
    parentId: null,
    childIds: [],
    name: `${type}-${id.slice(0, 4)}`,
    visible: true,
    locked: false,
    ...overrides,
    type,
  };

  return anyNodeSchema.parse(raw) as Extract<AnyNode, { type: T }>;
}

export function createEmptyScene(): SceneData {
  const site = createNode("site", { name: "Site" });
  const building = createNode("building", { name: "Building 1", parentId: site.id });
  const level = createNode("level", {
    name: "Ground Floor",
    parentId: building.id,
    index: 0,
    elevation: 0,
  });

  site.childIds = [building.id];
  building.childIds = [level.id];

  return {
    nodes: {
      [site.id]: site,
      [building.id]: building,
      [level.id]: level,
    },
    rootNodeIds: [site.id],
  };
}
