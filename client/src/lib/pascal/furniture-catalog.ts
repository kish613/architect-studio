// ─── Furniture Catalog ─────────────────────────────────────
// Central catalog of furniture items with placeholder asset URLs.
// Used by the client for rendering and by matchCatalogItem() for
// fuzzy-matching Gemini-detected item names to known catalog entries.

const ASSET_BASE = "/assets/furniture";

export interface CatalogItem {
  id: string;
  name: string;
  category: "living" | "bedroom" | "kitchen" | "bathroom" | "office";
  modelUrl: string;
  thumbnailUrl: string;
  dimensions: { x: number; y: number; z: number };
  keywords: string[];
}

export const FURNITURE_CATALOG: CatalogItem[] = [
  // ── Living ──────────────────────────────────────────────
  {
    id: "sofa-01",
    name: "Sofa",
    category: "living",
    modelUrl: `${ASSET_BASE}/sofa-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/sofa-01.webp`,
    dimensions: { x: 2.2, y: 0.85, z: 0.9 },
    keywords: ["sofa", "couch", "settee", "loveseat"],
  },
  {
    id: "armchair-01",
    name: "Armchair",
    category: "living",
    modelUrl: `${ASSET_BASE}/armchair-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/armchair-01.webp`,
    dimensions: { x: 0.9, y: 0.85, z: 0.9 },
    keywords: ["armchair", "arm chair", "accent chair", "lounge chair"],
  },
  {
    id: "coffee-table-01",
    name: "Coffee Table",
    category: "living",
    modelUrl: `${ASSET_BASE}/coffee-table-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/coffee-table-01.webp`,
    dimensions: { x: 1.2, y: 0.45, z: 0.6 },
    keywords: ["coffee table", "center table", "cocktail table"],
  },
  {
    id: "tv-stand-01",
    name: "TV Stand",
    category: "living",
    modelUrl: `${ASSET_BASE}/tv-stand-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/tv-stand-01.webp`,
    dimensions: { x: 1.5, y: 0.5, z: 0.4 },
    keywords: ["tv stand", "tv unit", "tv cabinet", "entertainment center", "media console"],
  },
  {
    id: "bookshelf-01",
    name: "Bookshelf",
    category: "living",
    modelUrl: `${ASSET_BASE}/bookshelf-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/bookshelf-01.webp`,
    dimensions: { x: 0.8, y: 1.8, z: 0.35 },
    keywords: ["bookshelf", "bookcase", "shelf", "shelving"],
  },

  // ── Bedroom ─────────────────────────────────────────────
  {
    id: "bed-double-01",
    name: "Double Bed",
    category: "bedroom",
    modelUrl: `${ASSET_BASE}/bed-double-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/bed-double-01.webp`,
    dimensions: { x: 1.6, y: 0.5, z: 2.0 },
    keywords: ["double bed", "queen bed", "king bed", "bed"],
  },
  {
    id: "bed-single-01",
    name: "Single Bed",
    category: "bedroom",
    modelUrl: `${ASSET_BASE}/bed-single-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/bed-single-01.webp`,
    dimensions: { x: 0.9, y: 0.5, z: 2.0 },
    keywords: ["single bed", "twin bed"],
  },
  {
    id: "nightstand-01",
    name: "Nightstand",
    category: "bedroom",
    modelUrl: `${ASSET_BASE}/nightstand-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/nightstand-01.webp`,
    dimensions: { x: 0.5, y: 0.55, z: 0.4 },
    keywords: ["nightstand", "night stand", "bedside table", "night table"],
  },
  {
    id: "wardrobe-01",
    name: "Wardrobe",
    category: "bedroom",
    modelUrl: `${ASSET_BASE}/wardrobe-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/wardrobe-01.webp`,
    dimensions: { x: 1.8, y: 2.2, z: 0.6 },
    keywords: ["wardrobe", "closet", "armoire", "cupboard"],
  },
  {
    id: "desk-01",
    name: "Desk",
    category: "bedroom",
    modelUrl: `${ASSET_BASE}/desk-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/desk-01.webp`,
    dimensions: { x: 1.2, y: 0.75, z: 0.6 },
    keywords: ["desk", "writing desk", "study desk"],
  },

  // ── Kitchen ─────────────────────────────────────────────
  {
    id: "fridge-01",
    name: "Refrigerator",
    category: "kitchen",
    modelUrl: `${ASSET_BASE}/fridge-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/fridge-01.webp`,
    dimensions: { x: 0.7, y: 1.8, z: 0.7 },
    keywords: ["fridge", "refrigerator", "freezer"],
  },
  {
    id: "oven-01",
    name: "Oven",
    category: "kitchen",
    modelUrl: `${ASSET_BASE}/oven-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/oven-01.webp`,
    dimensions: { x: 0.6, y: 0.85, z: 0.6 },
    keywords: ["oven", "stove", "range", "cooktop"],
  },
  {
    id: "dining-table-01",
    name: "Dining Table",
    category: "kitchen",
    modelUrl: `${ASSET_BASE}/dining-table-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/dining-table-01.webp`,
    dimensions: { x: 1.6, y: 0.75, z: 0.9 },
    keywords: ["dining table", "kitchen table", "table"],
  },
  {
    id: "dining-chair-01",
    name: "Dining Chair",
    category: "kitchen",
    modelUrl: `${ASSET_BASE}/dining-chair-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/dining-chair-01.webp`,
    dimensions: { x: 0.45, y: 0.9, z: 0.45 },
    keywords: ["dining chair", "kitchen chair", "chair"],
  },
  {
    id: "sink-kitchen-01",
    name: "Kitchen Sink",
    category: "kitchen",
    modelUrl: `${ASSET_BASE}/sink-kitchen-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/sink-kitchen-01.webp`,
    dimensions: { x: 0.8, y: 0.2, z: 0.5 },
    keywords: ["kitchen sink", "sink"],
  },

  // ── Bathroom ────────────────────────────────────────────
  {
    id: "toilet-01",
    name: "Toilet",
    category: "bathroom",
    modelUrl: `${ASSET_BASE}/toilet-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/toilet-01.webp`,
    dimensions: { x: 0.4, y: 0.4, z: 0.65 },
    keywords: ["toilet", "wc", "water closet", "commode"],
  },
  {
    id: "bathtub-01",
    name: "Bathtub",
    category: "bathroom",
    modelUrl: `${ASSET_BASE}/bathtub-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/bathtub-01.webp`,
    dimensions: { x: 0.75, y: 0.6, z: 1.7 },
    keywords: ["bathtub", "bath", "tub"],
  },
  {
    id: "shower-01",
    name: "Shower",
    category: "bathroom",
    modelUrl: `${ASSET_BASE}/shower-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/shower-01.webp`,
    dimensions: { x: 0.9, y: 2.1, z: 0.9 },
    keywords: ["shower", "shower stall", "shower cabin"],
  },
  {
    id: "vanity-01",
    name: "Bathroom Vanity",
    category: "bathroom",
    modelUrl: `${ASSET_BASE}/vanity-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/vanity-01.webp`,
    dimensions: { x: 0.8, y: 0.85, z: 0.5 },
    keywords: ["bathroom vanity", "vanity", "bathroom sink", "washbasin", "basin"],
  },

  // ── Office ──────────────────────────────────────────────
  {
    id: "office-desk-01",
    name: "Office Desk",
    category: "office",
    modelUrl: `${ASSET_BASE}/office-desk-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/office-desk-01.webp`,
    dimensions: { x: 1.5, y: 0.75, z: 0.7 },
    keywords: ["office desk", "work desk", "computer desk"],
  },
  {
    id: "office-chair-01",
    name: "Office Chair",
    category: "office",
    modelUrl: `${ASSET_BASE}/office-chair-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/office-chair-01.webp`,
    dimensions: { x: 0.6, y: 1.1, z: 0.6 },
    keywords: ["office chair", "task chair", "swivel chair", "ergonomic chair"],
  },
];

/**
 * Fuzzy-match an item name (e.g. from Gemini output) against catalog keywords.
 * Priority: exact keyword match → substring match → null.
 */
export function matchCatalogItem(name: string): CatalogItem | null {
  const lower = name.toLowerCase().trim();
  if (!lower) return null;

  // 1. Exact keyword match
  for (const item of FURNITURE_CATALOG) {
    if (item.keywords.some((kw) => kw === lower)) {
      return item;
    }
  }

  // 2. Partial / substring match (keyword found within the name, or name found within keyword)
  for (const item of FURNITURE_CATALOG) {
    if (item.keywords.some((kw) => lower.includes(kw) || kw.includes(lower))) {
      return item;
    }
  }

  return null;
}
