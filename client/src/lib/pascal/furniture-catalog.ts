// ─── Furniture Catalog ─────────────────────────────────────
// Central catalog of furniture items with placeholder asset URLs.
// Used by the client for rendering and by matchCatalogItem() for
// fuzzy-matching Gemini-detected item names to known catalog entries.

const ASSET_BASE = "/assets/furniture";

export interface CatalogItem {
  id: string;
  name: string;
  category: "living" | "bedroom" | "kitchen" | "bathroom" | "office" | "utility" | "decor" | "outdoor" | "garage";
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

  // ── Living (batch 3) ──────────────────────────────────────
  {
    id: "recliner-01",
    name: "Recliner",
    category: "living",
    modelUrl: `${ASSET_BASE}/recliner-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/recliner-01.webp`,
    dimensions: { x: 0.9, y: 1.0, z: 0.9 },
    keywords: ["recliner", "reclining chair", "lazy boy", "lounge recliner"],
  },
  {
    id: "l-shaped-sofa-01",
    name: "L-Shaped Sofa",
    category: "living",
    modelUrl: `${ASSET_BASE}/l-shaped-sofa-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/l-shaped-sofa-01.webp`,
    dimensions: { x: 2.8, y: 0.85, z: 2.8 },
    keywords: ["l-shaped sofa", "l shaped sofa", "l sofa", "sectional corner sofa"],
  },
  {
    id: "long-sofa-01",
    name: "Long Sofa",
    category: "living",
    modelUrl: `${ASSET_BASE}/long-sofa-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/long-sofa-01.webp`,
    dimensions: { x: 2.8, y: 0.85, z: 0.9 },
    keywords: ["long sofa", "large sofa", "four seater sofa", "4 seater"],
  },
  {
    id: "ottoman-01",
    name: "Ottoman",
    category: "living",
    modelUrl: `${ASSET_BASE}/ottoman-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/ottoman-01.webp`,
    dimensions: { x: 0.7, y: 0.4, z: 0.7 },
    keywords: ["ottoman", "footrest", "pouf", "footstool"],
  },
  {
    id: "cushion-chair-01",
    name: "Cushion Chair",
    category: "living",
    modelUrl: `${ASSET_BASE}/cushion-chair-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/cushion-chair-01.webp`,
    dimensions: { x: 0.5, y: 0.85, z: 0.5 },
    keywords: ["cushion chair", "padded chair", "upholstered chair"],
  },
  {
    id: "rounded-chair-01",
    name: "Rounded Chair",
    category: "living",
    modelUrl: `${ASSET_BASE}/rounded-chair-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/rounded-chair-01.webp`,
    dimensions: { x: 0.6, y: 0.8, z: 0.6 },
    keywords: ["rounded chair", "barrel chair", "tub chair", "round chair"],
  },

  // ── Kitchen (batch 3) ─────────────────────────────────────
  {
    id: "modern-dining-chair-01",
    name: "Modern Dining Chair",
    category: "kitchen",
    modelUrl: `${ASSET_BASE}/modern-dining-chair-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/modern-dining-chair-01.webp`,
    dimensions: { x: 0.45, y: 0.85, z: 0.5 },
    keywords: ["modern dining chair", "modern chair", "cushioned dining chair"],
  },
  {
    id: "square-coffee-table-01",
    name: "Square Coffee Table",
    category: "kitchen",
    modelUrl: `${ASSET_BASE}/square-coffee-table-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/square-coffee-table-01.webp`,
    dimensions: { x: 0.8, y: 0.45, z: 0.8 },
    keywords: ["square coffee table", "square table", "small square table"],
  },
  {
    id: "glass-table-01",
    name: "Glass Table",
    category: "kitchen",
    modelUrl: `${ASSET_BASE}/glass-table-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/glass-table-01.webp`,
    dimensions: { x: 1.4, y: 0.75, z: 0.8 },
    keywords: ["glass table", "glass dining table", "transparent table"],
  },
  {
    id: "cloth-table-01",
    name: "Cloth Table",
    category: "kitchen",
    modelUrl: `${ASSET_BASE}/cloth-table-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/cloth-table-01.webp`,
    dimensions: { x: 1.2, y: 0.75, z: 0.8 },
    keywords: ["cloth table", "tablecloth table", "covered table"],
  },
  {
    id: "mini-fridge-01",
    name: "Mini Fridge",
    category: "kitchen",
    modelUrl: `${ASSET_BASE}/mini-fridge-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/mini-fridge-01.webp`,
    dimensions: { x: 0.5, y: 0.85, z: 0.5 },
    keywords: ["mini fridge", "small fridge", "bar fridge", "compact fridge", "dorm fridge"],
  },

  // ── Bedroom (batch 3) ─────────────────────────────────────
  {
    id: "wide-bookcase-01",
    name: "Wide Bookcase",
    category: "bedroom",
    modelUrl: `${ASSET_BASE}/wide-bookcase-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/wide-bookcase-01.webp`,
    dimensions: { x: 1.2, y: 1.8, z: 0.35 },
    keywords: ["wide bookcase", "wide bookshelf", "large bookcase", "wide shelf"],
  },
  {
    id: "low-shelf-01",
    name: "Low Shelf",
    category: "bedroom",
    modelUrl: `${ASSET_BASE}/low-shelf-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/low-shelf-01.webp`,
    dimensions: { x: 0.8, y: 0.8, z: 0.35 },
    keywords: ["low shelf", "low bookcase", "low bookshelf", "short shelf"],
  },
  {
    id: "bedroom-cabinet-01",
    name: "Bedroom Cabinet",
    category: "bedroom",
    modelUrl: `${ASSET_BASE}/bedroom-cabinet-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/bedroom-cabinet-01.webp`,
    dimensions: { x: 0.8, y: 0.9, z: 0.45 },
    keywords: ["bedroom cabinet", "storage cabinet", "linen cabinet"],
  },
  {
    id: "drawer-cabinet-01",
    name: "Drawer Cabinet",
    category: "bedroom",
    modelUrl: `${ASSET_BASE}/drawer-cabinet-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/drawer-cabinet-01.webp`,
    dimensions: { x: 0.6, y: 0.7, z: 0.4 },
    keywords: ["drawer cabinet", "chest of drawers", "dresser", "drawer chest"],
  },
  {
    id: "side-table-drawers-01",
    name: "Side Table with Drawers",
    category: "bedroom",
    modelUrl: `${ASSET_BASE}/side-table-drawers-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/side-table-drawers-01.webp`,
    dimensions: { x: 0.45, y: 0.55, z: 0.4 },
    keywords: ["side table drawers", "side table with drawers", "drawer side table", "end table"],
  },

  // ── Bathroom (batch 3) ────────────────────────────────────
  {
    id: "square-sink-01",
    name: "Square Sink",
    category: "bathroom",
    modelUrl: `${ASSET_BASE}/square-sink-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/square-sink-01.webp`,
    dimensions: { x: 0.6, y: 0.85, z: 0.5 },
    keywords: ["square sink", "square basin", "modern sink", "rectangular sink"],
  },
  {
    id: "square-toilet-01",
    name: "Square Toilet",
    category: "bathroom",
    modelUrl: `${ASSET_BASE}/square-toilet-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/square-toilet-01.webp`,
    dimensions: { x: 0.4, y: 0.4, z: 0.65 },
    keywords: ["square toilet", "modern toilet", "wall hung toilet"],
  },

  // ── Decor (batch 3) ───────────────────────────────────────
  {
    id: "ceiling-fan-01",
    name: "Ceiling Fan",
    category: "decor",
    modelUrl: `${ASSET_BASE}/ceiling-fan-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/ceiling-fan-01.webp`,
    dimensions: { x: 1.2, y: 0.3, z: 1.2 },
    keywords: ["ceiling fan", "fan", "overhead fan"],
  },
  {
    id: "wall-lamp-01",
    name: "Wall Lamp",
    category: "decor",
    modelUrl: `${ASSET_BASE}/wall-lamp-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/wall-lamp-01.webp`,
    dimensions: { x: 0.15, y: 0.25, z: 0.2 },
    keywords: ["wall lamp", "sconce", "wall sconce", "wall light"],
  },
  {
    id: "square-floor-lamp-01",
    name: "Square Floor Lamp",
    category: "decor",
    modelUrl: `${ASSET_BASE}/square-floor-lamp-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/square-floor-lamp-01.webp`,
    dimensions: { x: 0.3, y: 1.6, z: 0.3 },
    keywords: ["square floor lamp", "modern floor lamp", "square lamp"],
  },
  {
    id: "round-rug-01",
    name: "Round Rug",
    category: "decor",
    modelUrl: `${ASSET_BASE}/round-rug-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/round-rug-01.webp`,
    dimensions: { x: 1.8, y: 0.01, z: 1.8 },
    keywords: ["round rug", "circular rug", "round carpet", "circle rug"],
  },
  {
    id: "square-rug-01",
    name: "Square Rug",
    category: "decor",
    modelUrl: `${ASSET_BASE}/square-rug-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/square-rug-01.webp`,
    dimensions: { x: 2.0, y: 0.01, z: 2.0 },
    keywords: ["square rug", "square carpet", "area rug square"],
  },
  {
    id: "trashcan-01",
    name: "Trash Can",
    category: "decor",
    modelUrl: `${ASSET_BASE}/trashcan-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/trashcan-01.webp`,
    dimensions: { x: 0.3, y: 0.6, z: 0.3 },
    keywords: ["trash can", "trashcan", "garbage bin", "waste bin", "bin"],
  },
  {
    id: "coat-rack-01",
    name: "Coat Rack",
    category: "decor",
    modelUrl: `${ASSET_BASE}/coat-rack-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/coat-rack-01.webp`,
    dimensions: { x: 0.5, y: 1.8, z: 0.5 },
    keywords: ["coat rack", "coat stand", "hat rack", "coat hanger stand"],
  },

  // ── Outdoor ─────────────────────────────────────────────────
  {
    id: "patio-chair-01",
    name: "Patio Chair",
    category: "outdoor",
    modelUrl: `${ASSET_BASE}/dining-chair-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/dining-chair-01.webp`,
    dimensions: { x: 0.6, y: 0.85, z: 0.6 },
    keywords: ["patio chair", "outdoor chair", "garden chair", "patio"],
  },
  {
    id: "garden-table-01",
    name: "Garden Table",
    category: "outdoor",
    modelUrl: `${ASSET_BASE}/round-table-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/round-table-01.webp`,
    dimensions: { x: 1.2, y: 0.75, z: 1.2 },
    keywords: ["garden table", "outdoor table", "patio table"],
  },
  {
    id: "outdoor-bench-01",
    name: "Outdoor Bench",
    category: "outdoor",
    modelUrl: `${ASSET_BASE}/bench-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/bench-01.webp`,
    dimensions: { x: 1.5, y: 0.45, z: 0.5 },
    keywords: ["outdoor bench", "garden bench", "park bench"],
  },
  {
    id: "planter-01",
    name: "Planter",
    category: "outdoor",
    modelUrl: `${ASSET_BASE}/plant-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/plant-01.webp`,
    dimensions: { x: 0.5, y: 0.6, z: 0.5 },
    keywords: ["planter", "flower pot", "garden planter", "outdoor planter"],
  },
  {
    id: "sun-lounger-01",
    name: "Sun Lounger",
    category: "outdoor",
    modelUrl: `${ASSET_BASE}/bench-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/bench-01.webp`,
    dimensions: { x: 0.7, y: 0.4, z: 1.9 },
    keywords: ["sun lounger", "lounger", "chaise longue", "deck chair", "sunbed"],
  },
  {
    id: "picnic-table-01",
    name: "Picnic Table",
    category: "outdoor",
    modelUrl: `${ASSET_BASE}/dining-table-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/dining-table-01.webp`,
    dimensions: { x: 1.8, y: 0.75, z: 1.4 },
    keywords: ["picnic table", "picnic", "outdoor dining table"],
  },

  // ── Garage ──────────────────────────────────────────────────
  {
    id: "workbench-01",
    name: "Workbench",
    category: "garage",
    modelUrl: `${ASSET_BASE}/desk-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/desk-01.webp`,
    dimensions: { x: 1.8, y: 0.9, z: 0.7 },
    keywords: ["workbench", "work bench", "garage bench", "workshop bench"],
  },
  {
    id: "tool-cabinet-01",
    name: "Tool Cabinet",
    category: "garage",
    modelUrl: `${ASSET_BASE}/wardrobe-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/wardrobe-01.webp`,
    dimensions: { x: 0.9, y: 1.8, z: 0.5 },
    keywords: ["tool cabinet", "tool chest", "tool storage", "garage cabinet"],
  },
  {
    id: "storage-shelf-01",
    name: "Storage Shelf",
    category: "garage",
    modelUrl: `${ASSET_BASE}/bookshelf-01.glb`,
    thumbnailUrl: `${ASSET_BASE}/bookshelf-01.webp`,
    dimensions: { x: 1.2, y: 1.8, z: 0.5 },
    keywords: ["storage shelf", "garage shelf", "utility shelf", "metal shelf"],
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
