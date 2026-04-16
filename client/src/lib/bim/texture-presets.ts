/**
 * Texture Presets — maps (surfaceKind, materialKind) to ambientCG texture IDs.
 *
 * The TEXTURE_PRESET_MAP is the central lookup table for determining which
 * ambientCG texture set to use for a given BIM surface type and material kind.
 */

// ─────────────────────────────────────────────────────────────
// Preset map: surface → materialKind → ambientCG ID
// ─────────────────────────────────────────────────────────────

export const TEXTURE_PRESET_MAP: Record<string, Record<string, string>> = {
  wall: {
    plaster: "PaintedPlaster017",
    brick: "Bricks076",
    concrete: "Concrete034",
    paint: "PaintedPlaster012",
    stone: "Rock030",
    wood: "Wood049",
    metal: "Metal032",
    tile: "Tiles074",
    default: "PaintedPlaster017",
  },
  slab: {
    concrete: "Concrete034",
    wood: "WoodFloor051",
    tile: "Tiles074",
    stone: "Marble006",
    brick: "Bricks076",
    metal: "Metal032",
    default: "Concrete034",
  },
  ceiling: {
    plaster: "PaintedPlaster017",
    paint: "PaintedPlaster012",
    wood: "Wood066",
    concrete: "Concrete034",
    default: "PaintedPlaster017",
  },
  roof: {
    tile: "RoofingTiles006",
    concrete: "Concrete034",
    metal: "Metal032",
    stone: "Rock030",
    wood: "Wood066",
    default: "RoofingTiles006",
  },
  stair: {
    wood: "WoodFloor051",
    concrete: "Concrete034",
    stone: "Marble006",
    metal: "Metal032",
    default: "WoodFloor051",
  },
  column: {
    concrete: "Concrete034",
    stone: "Marble006",
    metal: "Metal032",
    wood: "Wood049",
    default: "Concrete034",
  },
  door_frame: {
    wood: "Wood049",
    metal: "Metal032",
    default: "Wood049",
  },
  door_panel: {
    wood: "Wood066",
    metal: "Metal032",
    default: "Wood066",
  },
};

// ─────────────────────────────────────────────────────────────
// Texture repeat defaults per surface type
// ─────────────────────────────────────────────────────────────

const DEFAULT_REPEATS: Record<string, { x: number; y: number }> = {
  wall: { x: 2.0, y: 2.0 },
  slab: { x: 3.0, y: 3.0 },
  ceiling: { x: 2.5, y: 2.5 },
  roof: { x: 2.0, y: 2.0 },
  stair: { x: 1.0, y: 1.0 },
  column: { x: 1.0, y: 1.0 },
  door_frame: { x: 1.0, y: 1.0 },
  door_panel: { x: 1.0, y: 1.0 },
};

// ─────────────────────────────────────────────────────────────
// Resolvers
// ─────────────────────────────────────────────────────────────

/**
 * Resolve a (surface, materialKind) pair to an ambientCG texture ID.
 * Returns null if no matching preset exists.
 */
export function resolveTextureId(
  surface: string,
  materialKind?: string,
): string | null {
  const surfaceMap = TEXTURE_PRESET_MAP[surface];
  if (!surfaceMap) return null;

  if (materialKind && surfaceMap[materialKind]) {
    return surfaceMap[materialKind]!;
  }

  return surfaceMap.default ?? null;
}

/**
 * Get texture repeat values for a given surface type and optional dimensions.
 * When dimensions are provided, scales the repeat to approximate
 * real-world texture tiling (roughly 1 repeat per metre).
 */
export function getTextureRepeat(
  surface: string,
  dims?: { width: number; height: number },
): { x: number; y: number } {
  const base = DEFAULT_REPEATS[surface] ?? { x: 1.0, y: 1.0 };

  if (!dims) return base;

  // Scale repeats proportionally to real-world dimensions
  // Target: ~1 texture tile per metre for most surfaces
  return {
    x: Math.max(0.5, dims.width * base.x * 0.5),
    y: Math.max(0.5, dims.height * base.y * 0.5),
  };
}
