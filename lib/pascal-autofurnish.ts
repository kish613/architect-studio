// ─── Auto-Furnish Module ──────────────────────────────────
// Places furniture in rooms based on zone type using the
// central furniture catalog.

import {
  FURNITURE_CATALOG,
  type CatalogItem,
} from "../shared/furniture-catalog.js";

// ─── Types ────────────────────────────────────────────────

export interface BBox {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export interface PlacedItem {
  catalogId: string;
  name: string;
  modelUrl: string;
  dimensions: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  materialSlots: CatalogItem["materialSlots"];
  qualityTier: CatalogItem["qualityTier"];
  styleTier: CatalogItem["styleTier"];
  bimRef?: CatalogItem["bimRef"];
}

// ─── Zone → Catalog ID Mapping ────────────────────────────

const ZONE_FURNITURE: Record<string, string[]> = {
  bedroom: ["bed-double-01", "nightstand-01", "wardrobe-01"],
  kitchen: ["fridge-01", "oven-01", "sink-kitchen-01", "dining-table-01"],
  bathroom: ["toilet-01", "vanity-01", "shower-01"],
  living: ["sofa-01", "coffee-table-01", "tv-stand-01", "floor-lamp-01"],
  office: ["office-desk-01", "office-chair-01", "bookshelf-01"],
  hallway: ["coat-rack-01"],
  room: ["sofa-01", "coffee-table-01"],
};

// ─── Helpers ──────────────────────────────────────────────

/** Margin subtracted from each side of the room when checking fit. */
const WALL_MARGIN = 0.3;

function findCatalogItem(id: string): CatalogItem | undefined {
  return FURNITURE_CATALOG.find((item) => item.id === id);
}

function fitsInRoom(
  item: CatalogItem,
  roomWidth: number,
  roomDepth: number,
): boolean {
  const availableW = roomWidth - WALL_MARGIN * 2;
  const availableD = roomDepth - WALL_MARGIN * 2;
  return item.dimensions.x <= availableW && item.dimensions.z <= availableD;
}

// ─── Public API ───────────────────────────────────────────

/**
 * Compute a bounding box from an array of polygon points.
 * Each point must have at least `x` and `z` (y is ignored for bbox purposes).
 */
export function computeZoneBBox(
  points: Array<{ x: number; z: number }>,
): BBox {
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }

  return { minX, minZ, maxX, maxZ };
}

/**
 * Given a zone type and bounding box, return an array of placed furniture
 * items drawn from the catalog. Items that do not fit (dimensions exceed
 * room size minus wall margin) are skipped.
 *
 * Items are positioned centered in the room with small offsets so they
 * don't overlap.
 */
export function autoFurnishZone(
  zoneType: string,
  bbox: BBox,
): PlacedItem[] {
  const catalogIds = ZONE_FURNITURE[zoneType];
  if (!catalogIds) return [];

  const roomWidth = bbox.maxX - bbox.minX;
  const roomDepth = bbox.maxZ - bbox.minZ;
  const centerX = (bbox.minX + bbox.maxX) / 2;
  const centerZ = (bbox.minZ + bbox.maxZ) / 2;

  const placed: PlacedItem[] = [];
  const count = catalogIds.length;

  for (let i = 0; i < count; i++) {
    const catalogItem = findCatalogItem(catalogIds[i]);
    if (!catalogItem) continue;
    if (!fitsInRoom(catalogItem, roomWidth, roomDepth)) continue;

    // Distribute items along the room center with offsets so they
    // don't stack on the same point.
    const offsetFraction = count > 1 ? (i / (count - 1)) - 0.5 : 0;
    const offsetX = offsetFraction * (roomWidth * 0.4);
    const offsetZ = offsetFraction * (roomDepth * 0.4);

    placed.push({
      catalogId: catalogItem.id,
      name: catalogItem.name,
      modelUrl: catalogItem.modelUrl,
      dimensions: { ...catalogItem.dimensions },
      position: {
        x: centerX + offsetX,
        y: 0,
        z: centerZ + offsetZ,
      },
      materialSlots: catalogItem.materialSlots,
      qualityTier: catalogItem.qualityTier,
      styleTier: catalogItem.styleTier,
      bimRef: catalogItem.bimRef,
    });
  }

  return placed;
}
