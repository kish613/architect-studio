export type MaterialSurfaceCategory = "wall" | "slab" | "ceiling" | "roof" | "item" | "glass";
export type MaterialWearStyle = "smooth" | "textured" | "polished";
export type MaterialCostTier = "budget" | "mid" | "premium";
export type MaterialPattern =
  | "none"
  | "plaster"
  | "brick"
  | "concrete"
  | "wood"
  | "stone"
  | "tile";

export interface MaterialTextureSet {
  baseColor?: string;
  normal?: string;
  roughness?: string;
  ambientOcclusion?: string;
  orm?: string;
}

export interface MaterialVariant {
  id: string;
  label: string;
  color: string;
  roughness: number;
  metalness: number;
  clearcoat?: number;
  transmission?: number;
  opacity?: number;
  ior?: number;
  envMapIntensity?: number;
  bumpScale?: number;
  pattern?: MaterialPattern;
  repeat?: { x: number; y: number };
}

export interface MaterialDefinition {
  id: string;
  label: string;
  category: MaterialSurfaceCategory;
  defaultVariantId: string;
  legacyMaterialAliases: string[];
  wearStyle: MaterialWearStyle;
  costTier: MaterialCostTier;
  textureSet?: MaterialTextureSet;
  source: {
    provider: string;
    license: string;
    attribution?: string;
    url?: string;
  };
  variants: MaterialVariant[];
}

export interface AssemblyDefinition {
  id: string;
  label: string;
  wallFinishId: string;
  wallFinishVariantId?: string;
  slabFinishId: string;
  slabFinishVariantId?: string;
  ceilingFinishId: string;
  ceilingFinishVariantId?: string;
  roofFinishId: string;
  roofFinishVariantId?: string;
  itemFinishId: string;
  itemFinishVariantId?: string;
}

export interface CatalogMaterialSlot {
  slotId: string;
  label: string;
  finishId: string;
  finishVariantId?: string;
}

export interface AssetProvenance {
  source: string;
  license: string;
  author?: string;
  url?: string;
  notes?: string;
}

export interface BimReference {
  source: "ifc" | "catalog";
  externalId: string;
  className?: string;
  propertySetKeys?: string[];
}

export const MATERIAL_LIBRARY: MaterialDefinition[] = [
  {
    id: "wall-plaster",
    label: "Architectural Plaster",
    category: "wall",
    defaultVariantId: "warm",
    legacyMaterialAliases: ["plaster"],
    wearStyle: "smooth",
    costTier: "mid",
    source: {
      provider: "Architect Studio",
      license: "Internal",
    },
    variants: [
      {
        id: "warm",
        label: "Warm Lime",
        color: "#efe4d4",
        roughness: 0.82,
        metalness: 0,
        envMapIntensity: 0.45,
        bumpScale: 0.018,
        pattern: "plaster",
        repeat: { x: 1.6, y: 1.6 },
      },
      {
        id: "cool",
        label: "Cool White",
        color: "#eef1f4",
        roughness: 0.78,
        metalness: 0,
        envMapIntensity: 0.45,
        bumpScale: 0.015,
        pattern: "plaster",
        repeat: { x: 1.8, y: 1.8 },
      },
    ],
  },
  {
    id: "wall-brick",
    label: "Facing Brick",
    category: "wall",
    defaultVariantId: "heritage",
    legacyMaterialAliases: ["brick"],
    wearStyle: "textured",
    costTier: "mid",
    source: {
      provider: "Architect Studio",
      license: "Internal",
    },
    variants: [
      {
        id: "heritage",
        label: "Heritage Red",
        color: "#bb6a52",
        roughness: 0.9,
        metalness: 0,
        envMapIntensity: 0.35,
        bumpScale: 0.03,
        pattern: "brick",
        repeat: { x: 2.2, y: 2 },
      },
      {
        id: "whitewashed",
        label: "Whitewashed",
        color: "#d8c8b9",
        roughness: 0.88,
        metalness: 0,
        envMapIntensity: 0.35,
        bumpScale: 0.025,
        pattern: "brick",
        repeat: { x: 2.1, y: 1.9 },
      },
    ],
  },
  {
    id: "wall-stone",
    label: "Stone Veneer",
    category: "wall",
    defaultVariantId: "limestone",
    legacyMaterialAliases: ["stone"],
    wearStyle: "textured",
    costTier: "premium",
    source: {
      provider: "Architect Studio",
      license: "Internal",
    },
    variants: [
      {
        id: "limestone",
        label: "Limestone",
        color: "#c4b59e",
        roughness: 0.92,
        metalness: 0.02,
        envMapIntensity: 0.28,
        bumpScale: 0.035,
        pattern: "stone",
        repeat: { x: 1.8, y: 1.5 },
      },
      {
        id: "graphite",
        label: "Graphite",
        color: "#71706e",
        roughness: 0.9,
        metalness: 0.02,
        envMapIntensity: 0.25,
        bumpScale: 0.03,
        pattern: "stone",
        repeat: { x: 1.7, y: 1.4 },
      },
    ],
  },
  {
    id: "slab-concrete",
    label: "Concrete Floor",
    category: "slab",
    defaultVariantId: "polished",
    legacyMaterialAliases: ["concrete"],
    wearStyle: "polished",
    costTier: "mid",
    source: {
      provider: "Architect Studio",
      license: "Internal",
    },
    variants: [
      {
        id: "polished",
        label: "Polished Concrete",
        color: "#b9b1a6",
        roughness: 0.7,
        metalness: 0.04,
        clearcoat: 0.08,
        envMapIntensity: 0.35,
        bumpScale: 0.012,
        pattern: "concrete",
        repeat: { x: 1.6, y: 1.6 },
      },
      {
        id: "aggregate",
        label: "Exposed Aggregate",
        color: "#a79f96",
        roughness: 0.84,
        metalness: 0.02,
        envMapIntensity: 0.22,
        bumpScale: 0.018,
        pattern: "concrete",
        repeat: { x: 1.5, y: 1.5 },
      },
    ],
  },
  {
    id: "slab-oak",
    label: "Oak Floor",
    category: "slab",
    defaultVariantId: "natural",
    legacyMaterialAliases: ["wood"],
    wearStyle: "polished",
    costTier: "premium",
    source: {
      provider: "Architect Studio",
      license: "Internal",
    },
    variants: [
      {
        id: "natural",
        label: "Natural Oak",
        color: "#c9a57c",
        roughness: 0.58,
        metalness: 0.02,
        clearcoat: 0.12,
        envMapIntensity: 0.55,
        bumpScale: 0.018,
        pattern: "wood",
        repeat: { x: 2.5, y: 2.5 },
      },
      {
        id: "honey",
        label: "Honey Oak",
        color: "#b98c57",
        roughness: 0.54,
        metalness: 0.02,
        clearcoat: 0.14,
        envMapIntensity: 0.58,
        bumpScale: 0.018,
        pattern: "wood",
        repeat: { x: 2.4, y: 2.4 },
      },
    ],
  },
  {
    id: "ceiling-plaster",
    label: "Smooth Ceiling",
    category: "ceiling",
    defaultVariantId: "daylight",
    legacyMaterialAliases: ["plaster"],
    wearStyle: "smooth",
    costTier: "budget",
    source: {
      provider: "Architect Studio",
      license: "Internal",
    },
    variants: [
      {
        id: "daylight",
        label: "Daylight White",
        color: "#f5f4f0",
        roughness: 0.76,
        metalness: 0,
        envMapIntensity: 0.3,
        bumpScale: 0.01,
        pattern: "plaster",
        repeat: { x: 2, y: 2 },
      },
      {
        id: "warm",
        label: "Soft Warm White",
        color: "#f1ebe3",
        roughness: 0.78,
        metalness: 0,
        envMapIntensity: 0.28,
        bumpScale: 0.01,
        pattern: "plaster",
        repeat: { x: 2, y: 2 },
      },
    ],
  },
  {
    id: "roof-slate",
    label: "Slate Roof",
    category: "roof",
    defaultVariantId: "charcoal",
    legacyMaterialAliases: ["tile"],
    wearStyle: "textured",
    costTier: "premium",
    source: {
      provider: "Architect Studio",
      license: "Internal",
    },
    variants: [
      {
        id: "charcoal",
        label: "Charcoal Slate",
        color: "#49505a",
        roughness: 0.88,
        metalness: 0.08,
        envMapIntensity: 0.18,
        bumpScale: 0.02,
        pattern: "stone",
        repeat: { x: 1.8, y: 1.8 },
      },
      {
        id: "blue",
        label: "Blue Slate",
        color: "#586a74",
        roughness: 0.86,
        metalness: 0.08,
        envMapIntensity: 0.18,
        bumpScale: 0.018,
        pattern: "stone",
        repeat: { x: 1.8, y: 1.8 },
      },
    ],
  },
  {
    id: "roof-clay-tile",
    label: "Clay Roof Tile",
    category: "roof",
    defaultVariantId: "terracotta",
    legacyMaterialAliases: ["tile"],
    wearStyle: "textured",
    costTier: "premium",
    source: {
      provider: "Architect Studio",
      license: "Internal",
    },
    variants: [
      {
        id: "terracotta",
        label: "Terracotta",
        color: "#99553e",
        roughness: 0.9,
        metalness: 0.02,
        envMapIntensity: 0.18,
        bumpScale: 0.026,
        pattern: "tile",
        repeat: { x: 1.7, y: 1.7 },
      },
      {
        id: "sand",
        label: "Weathered Sand",
        color: "#b88d6f",
        roughness: 0.9,
        metalness: 0.02,
        envMapIntensity: 0.18,
        bumpScale: 0.022,
        pattern: "tile",
        repeat: { x: 1.7, y: 1.7 },
      },
    ],
  },
  {
    id: "item-oak",
    label: "Oak Joinery",
    category: "item",
    defaultVariantId: "natural",
    legacyMaterialAliases: ["wood"],
    wearStyle: "polished",
    costTier: "mid",
    source: {
      provider: "Architect Studio",
      license: "Internal",
    },
    variants: [
      {
        id: "natural",
        label: "Natural Oak",
        color: "#b89163",
        roughness: 0.56,
        metalness: 0.02,
        clearcoat: 0.16,
        envMapIntensity: 0.78,
        bumpScale: 0.015,
        pattern: "wood",
        repeat: { x: 1.8, y: 1.8 },
      },
      {
        id: "smoked",
        label: "Smoked Oak",
        color: "#7b5b43",
        roughness: 0.62,
        metalness: 0.02,
        clearcoat: 0.14,
        envMapIntensity: 0.75,
        bumpScale: 0.015,
        pattern: "wood",
        repeat: { x: 1.8, y: 1.8 },
      },
    ],
  },
  {
    id: "item-boucle",
    label: "Textile Upholstery",
    category: "item",
    defaultVariantId: "oat",
    legacyMaterialAliases: [],
    wearStyle: "textured",
    costTier: "premium",
    source: {
      provider: "Architect Studio",
      license: "Internal",
    },
    variants: [
      {
        id: "oat",
        label: "Oat Boucle",
        color: "#d7cbbe",
        roughness: 0.92,
        metalness: 0,
        clearcoat: 0.04,
        envMapIntensity: 0.18,
        bumpScale: 0.012,
        pattern: "plaster",
        repeat: { x: 1.2, y: 1.2 },
      },
      {
        id: "pebble",
        label: "Pebble Boucle",
        color: "#b1a89e",
        roughness: 0.94,
        metalness: 0,
        clearcoat: 0.04,
        envMapIntensity: 0.18,
        bumpScale: 0.012,
        pattern: "plaster",
        repeat: { x: 1.2, y: 1.2 },
      },
    ],
  },
  {
    id: "item-stone",
    label: "Stone Composite",
    category: "item",
    defaultVariantId: "travertine",
    legacyMaterialAliases: ["stone"],
    wearStyle: "textured",
    costTier: "premium",
    source: {
      provider: "Architect Studio",
      license: "Internal",
    },
    variants: [
      {
        id: "travertine",
        label: "Travertine",
        color: "#c7baa6",
        roughness: 0.82,
        metalness: 0.02,
        clearcoat: 0.05,
        envMapIntensity: 0.35,
        bumpScale: 0.02,
        pattern: "stone",
        repeat: { x: 1.3, y: 1.3 },
      },
      {
        id: "ash",
        label: "Ash Stone",
        color: "#a6a29d",
        roughness: 0.84,
        metalness: 0.02,
        clearcoat: 0.04,
        envMapIntensity: 0.32,
        bumpScale: 0.018,
        pattern: "stone",
        repeat: { x: 1.3, y: 1.3 },
      },
    ],
  },
  {
    id: "glass-clear",
    label: "Clear Glass",
    category: "glass",
    defaultVariantId: "daylight",
    legacyMaterialAliases: ["glass"],
    wearStyle: "smooth",
    costTier: "premium",
    source: {
      provider: "Architect Studio",
      license: "Internal",
    },
    variants: [
      {
        id: "daylight",
        label: "Daylight",
        color: "#b8dff2",
        roughness: 0.05,
        metalness: 0.08,
        transmission: 0.72,
        opacity: 0.45,
        ior: 1.45,
        envMapIntensity: 1.1,
        pattern: "none",
      },
    ],
  },
];

export const MATERIAL_LIBRARY_BY_ID = Object.fromEntries(
  MATERIAL_LIBRARY.map((definition) => [definition.id, definition])
) as Record<string, MaterialDefinition>;

export const MATERIAL_ASSEMBLIES: AssemblyDefinition[] = [
  {
    id: "warm-minimal",
    label: "Warm Minimal",
    wallFinishId: "wall-plaster",
    wallFinishVariantId: "warm",
    slabFinishId: "slab-oak",
    slabFinishVariantId: "honey",
    ceilingFinishId: "ceiling-plaster",
    ceilingFinishVariantId: "warm",
    roofFinishId: "roof-clay-tile",
    roofFinishVariantId: "terracotta",
    itemFinishId: "item-oak",
    itemFinishVariantId: "natural",
  },
  {
    id: "contemporary-stone",
    label: "Contemporary Stone",
    wallFinishId: "wall-stone",
    wallFinishVariantId: "graphite",
    slabFinishId: "slab-concrete",
    slabFinishVariantId: "polished",
    ceilingFinishId: "ceiling-plaster",
    ceilingFinishVariantId: "daylight",
    roofFinishId: "roof-slate",
    roofFinishVariantId: "charcoal",
    itemFinishId: "item-stone",
    itemFinishVariantId: "travertine",
  },
  {
    id: "nordic-oak",
    label: "Nordic Oak",
    wallFinishId: "wall-plaster",
    wallFinishVariantId: "cool",
    slabFinishId: "slab-oak",
    slabFinishVariantId: "natural",
    ceilingFinishId: "ceiling-plaster",
    ceilingFinishVariantId: "daylight",
    roofFinishId: "roof-slate",
    roofFinishVariantId: "blue",
    itemFinishId: "item-oak",
    itemFinishVariantId: "natural",
  },
];

export const MATERIAL_ASSEMBLIES_BY_ID = Object.fromEntries(
  MATERIAL_ASSEMBLIES.map((assembly) => [assembly.id, assembly])
) as Record<string, AssemblyDefinition>;

export const LEGACY_MATERIAL_FINISH_MAP: Record<
  Exclude<MaterialSurfaceCategory, "glass">,
  Record<string, string>
> = {
  wall: {
    plaster: "wall-plaster",
    brick: "wall-brick",
    concrete: "wall-stone",
    stone: "wall-stone",
    wood: "wall-plaster",
    glass: "glass-clear",
    tile: "wall-brick",
  },
  slab: {
    concrete: "slab-concrete",
    wood: "slab-oak",
    stone: "slab-concrete",
    plaster: "slab-concrete",
    brick: "slab-concrete",
    glass: "glass-clear",
    tile: "slab-concrete",
  },
  ceiling: {
    plaster: "ceiling-plaster",
    concrete: "ceiling-plaster",
    wood: "ceiling-plaster",
    stone: "ceiling-plaster",
    brick: "ceiling-plaster",
    glass: "glass-clear",
    tile: "ceiling-plaster",
  },
  roof: {
    tile: "roof-clay-tile",
    stone: "roof-slate",
    concrete: "roof-slate",
    plaster: "roof-clay-tile",
    brick: "roof-clay-tile",
    wood: "roof-slate",
    glass: "glass-clear",
  },
  item: {
    wood: "item-oak",
    stone: "item-stone",
    plaster: "item-boucle",
    concrete: "item-stone",
    brick: "item-stone",
    glass: "glass-clear",
    tile: "item-stone",
  },
};

export function findMaterialDefinition(finishId?: string | null): MaterialDefinition | null {
  if (!finishId) {
    return null;
  }

  return MATERIAL_LIBRARY_BY_ID[finishId] ?? null;
}

export function findMaterialVariant(
  finishId?: string | null,
  variantId?: string | null
): MaterialVariant | null {
  const definition = findMaterialDefinition(finishId);
  if (!definition) {
    return null;
  }

  const resolvedVariantId = variantId || definition.defaultVariantId;
  return (
    definition.variants.find((variant) => variant.id === resolvedVariantId) ||
    definition.variants.find((variant) => variant.id === definition.defaultVariantId) ||
    null
  );
}

export function findAssemblyDefinition(assemblyId?: string | null): AssemblyDefinition | null {
  if (!assemblyId) {
    return null;
  }

  return MATERIAL_ASSEMBLIES_BY_ID[assemblyId] ?? null;
}
