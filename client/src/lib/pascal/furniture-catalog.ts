// ─── Furniture Catalog ─────────────────────────────────────
// Central catalog of furniture items with placeholder asset URLs.
// Used by the client for rendering and by matchCatalogItem() for
// fuzzy-matching Gemini-detected item names to known catalog entries.

const ASSET_BASE = "/assets/furniture";

export interface CatalogItem {
  id: string;
  name: string;
  category: "living" | "bedroom" | "kitchen" | "bathroom" | "office" | "utility" | "decor";
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

  // ── Living (additional) ───────────────────────────────────
  {
    id: "modern-sofa-01",
    name: "Modern Sofa",
    category: "living",
    modelUrl: `${ASSET_BASE}/modern-sofa-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/modern-sofa-01.webp`,
    dimensions: { x: 2.0, y: 0.75, z: 0.85 },
    keywords: ["modern sofa", "design sofa", "contemporary sofa"],
  },
  {
    id: "modern-chair-01",
    name: "Modern Chair",
    category: "living",
    modelUrl: `${ASSET_BASE}/modern-chair-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/modern-chair-01.webp`,
    dimensions: { x: 0.8, y: 0.75, z: 0.8 },
    keywords: ["modern chair", "design chair", "accent chair"],
  },
  {
    id: "corner-sofa-01",
    name: "Corner Sofa",
    category: "living",
    modelUrl: `${ASSET_BASE}/corner-sofa-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/corner-sofa-01.webp`,
    dimensions: { x: 2.5, y: 0.85, z: 2.5 },
    keywords: ["corner sofa", "sectional sofa", "l-shaped sofa", "sectional"],
  },
  {
    id: "glass-coffee-table-01",
    name: "Glass Coffee Table",
    category: "living",
    modelUrl: `${ASSET_BASE}/glass-coffee-table-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/glass-coffee-table-01.webp`,
    dimensions: { x: 1.1, y: 0.4, z: 0.55 },
    keywords: ["glass coffee table", "glass table"],
  },
  {
    id: "round-table-01",
    name: "Round Table",
    category: "living",
    modelUrl: `${ASSET_BASE}/round-table-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/round-table-01.webp`,
    dimensions: { x: 1.0, y: 0.75, z: 1.0 },
    keywords: ["round table", "circular table", "bistro table"],
  },
  {
    id: "television-01",
    name: "Television",
    category: "living",
    modelUrl: `${ASSET_BASE}/television-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/television-01.webp`,
    dimensions: { x: 1.2, y: 0.7, z: 0.08 },
    keywords: ["television", "tv", "flat screen", "screen"],
  },
  {
    id: "bench-01",
    name: "Bench",
    category: "living",
    modelUrl: `${ASSET_BASE}/bench-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/bench-01.webp`,
    dimensions: { x: 1.2, y: 0.45, z: 0.4 },
    keywords: ["bench", "cushion bench", "entryway bench", "window bench"],
  },
  {
    id: "bar-stool-01",
    name: "Bar Stool",
    category: "kitchen",
    modelUrl: `${ASSET_BASE}/bar-stool-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/bar-stool-01.webp`,
    dimensions: { x: 0.4, y: 0.75, z: 0.4 },
    keywords: ["bar stool", "counter stool", "high stool", "stool"],
  },

  // ── Kitchen (additional) ──────────────────────────────────
  {
    id: "large-fridge-01",
    name: "Large Refrigerator",
    category: "kitchen",
    modelUrl: `${ASSET_BASE}/large-fridge-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/large-fridge-01.webp`,
    dimensions: { x: 0.9, y: 1.9, z: 0.75 },
    keywords: ["large fridge", "large refrigerator", "double door fridge", "french door fridge"],
  },
  {
    id: "microwave-01",
    name: "Microwave",
    category: "kitchen",
    modelUrl: `${ASSET_BASE}/microwave-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/microwave-01.webp`,
    dimensions: { x: 0.5, y: 0.3, z: 0.35 },
    keywords: ["microwave", "microwave oven"],
  },
  {
    id: "coffee-machine-01",
    name: "Coffee Machine",
    category: "kitchen",
    modelUrl: `${ASSET_BASE}/coffee-machine-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/coffee-machine-01.webp`,
    dimensions: { x: 0.25, y: 0.35, z: 0.3 },
    keywords: ["coffee machine", "coffee maker", "espresso machine"],
  },
  {
    id: "electric-stove-01",
    name: "Electric Stove",
    category: "kitchen",
    modelUrl: `${ASSET_BASE}/electric-stove-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/electric-stove-01.webp`,
    dimensions: { x: 0.6, y: 0.85, z: 0.6 },
    keywords: ["electric stove", "electric range", "induction stove", "electric cooktop"],
  },
  {
    id: "toaster-01",
    name: "Toaster",
    category: "kitchen",
    modelUrl: `${ASSET_BASE}/toaster-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/toaster-01.webp`,
    dimensions: { x: 0.3, y: 0.2, z: 0.2 },
    keywords: ["toaster"],
  },

  // ── Bedroom (additional) ──────────────────────────────────
  {
    id: "bedside-table-01",
    name: "Bedside Table",
    category: "bedroom",
    modelUrl: `${ASSET_BASE}/bedside-table-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/bedside-table-01.webp`,
    dimensions: { x: 0.45, y: 0.5, z: 0.4 },
    keywords: ["bedside table", "bedside cabinet", "side table"],
  },

  // ── Bathroom (additional) ─────────────────────────────────
  {
    id: "round-shower-01",
    name: "Round Shower",
    category: "bathroom",
    modelUrl: `${ASSET_BASE}/round-shower-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/round-shower-01.webp`,
    dimensions: { x: 0.95, y: 2.1, z: 0.95 },
    keywords: ["round shower", "circular shower", "corner shower"],
  },
  {
    id: "bathroom-cabinet-01",
    name: "Bathroom Cabinet",
    category: "bathroom",
    modelUrl: `${ASSET_BASE}/bathroom-cabinet-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/bathroom-cabinet-01.webp`,
    dimensions: { x: 0.6, y: 0.7, z: 0.35 },
    keywords: ["bathroom cabinet", "medicine cabinet", "bathroom storage"],
  },
  {
    id: "bathroom-mirror-01",
    name: "Bathroom Mirror",
    category: "bathroom",
    modelUrl: `${ASSET_BASE}/bathroom-mirror-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/bathroom-mirror-01.webp`,
    dimensions: { x: 0.6, y: 0.8, z: 0.05 },
    keywords: ["bathroom mirror", "mirror", "vanity mirror", "wall mirror"],
  },

  // ── Office (additional) ───────────────────────────────────
  {
    id: "monitor-01",
    name: "Monitor",
    category: "office",
    modelUrl: `${ASSET_BASE}/monitor-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/monitor-01.webp`,
    dimensions: { x: 0.6, y: 0.45, z: 0.2 },
    keywords: ["monitor", "computer screen", "display", "computer monitor"],
  },
  {
    id: "laptop-01",
    name: "Laptop",
    category: "office",
    modelUrl: `${ASSET_BASE}/laptop-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/laptop-01.webp`,
    dimensions: { x: 0.35, y: 0.02, z: 0.25 },
    keywords: ["laptop", "notebook", "computer"],
  },

  // ── Utility ───────────────────────────────────────────────
  {
    id: "washing-machine-01",
    name: "Washing Machine",
    category: "utility",
    modelUrl: `${ASSET_BASE}/washing-machine-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/washing-machine-01.webp`,
    dimensions: { x: 0.6, y: 0.85, z: 0.6 },
    keywords: ["washing machine", "washer", "laundry machine"],
  },
  {
    id: "dryer-01",
    name: "Dryer",
    category: "utility",
    modelUrl: `${ASSET_BASE}/dryer-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/dryer-01.webp`,
    dimensions: { x: 0.6, y: 0.85, z: 0.6 },
    keywords: ["dryer", "tumble dryer", "clothes dryer"],
  },

  // ── Decor ─────────────────────────────────────────────────
  {
    id: "floor-lamp-01",
    name: "Floor Lamp",
    category: "decor",
    modelUrl: `${ASSET_BASE}/floor-lamp-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/floor-lamp-01.webp`,
    dimensions: { x: 0.35, y: 1.6, z: 0.35 },
    keywords: ["floor lamp", "standing lamp", "lamp"],
  },
  {
    id: "table-lamp-01",
    name: "Table Lamp",
    category: "decor",
    modelUrl: `${ASSET_BASE}/table-lamp-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/table-lamp-01.webp`,
    dimensions: { x: 0.2, y: 0.4, z: 0.2 },
    keywords: ["table lamp", "desk lamp", "bedside lamp"],
  },
  {
    id: "plant-01",
    name: "Potted Plant",
    category: "decor",
    modelUrl: `${ASSET_BASE}/plant-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/plant-01.webp`,
    dimensions: { x: 0.4, y: 0.8, z: 0.4 },
    keywords: ["plant", "potted plant", "houseplant", "indoor plant"],
  },
  {
    id: "rug-01",
    name: "Rug",
    category: "decor",
    modelUrl: `${ASSET_BASE}/rug-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/rug-01.webp`,
    dimensions: { x: 2.0, y: 0.01, z: 1.4 },
    keywords: ["rug", "carpet", "area rug", "floor rug"],
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
