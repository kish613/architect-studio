# Furniture Catalog + Wall Drag Editing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a built-in 3D furniture catalog with AI auto-placement, and let users drag-edit wall endpoints to reshape rooms.

**Architecture:** Two independent feature tracks. Track A (furniture) adds a static catalog of GLB models, fuzzy-matches Gemini-detected items to catalog entries, and renders GLB models instead of boxes. Track B (wall editing) adds drag handles to selected walls, allowing endpoint or body dragging with grid snap and undo support.

**Tech Stack:** React Three Fiber, drei (useGLTF), Zustand, Three.js raycasting, Vercel Blob (GLB hosting)

---

## Track A: Furniture Catalog & Auto-Placement

### Task 1: Create furniture catalog data

**Files:**
- Create: `client/src/lib/pascal/furniture-catalog.ts`

**Step 1: Create the catalog module**

```typescript
// client/src/lib/pascal/furniture-catalog.ts

export interface CatalogItem {
  id: string;
  name: string;
  category: "living" | "bedroom" | "kitchen" | "bathroom" | "office" | "outdoor";
  modelUrl: string;
  thumbnailUrl: string;
  dimensions: { x: number; y: number; z: number };
  keywords: string[];
}

// Placeholder URLs — replace with real Vercel Blob URLs after uploading GLBs
const BLOB_BASE = "https://your-blob-store.vercel-storage.com/furniture";

export const FURNITURE_CATALOG: CatalogItem[] = [
  // Living
  { id: "sofa-01", name: "Modern Sofa", category: "living", modelUrl: `${BLOB_BASE}/sofa-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/sofa-01.webp`, dimensions: { x: 2.2, y: 0.85, z: 0.9 }, keywords: ["sofa", "couch", "settee", "loveseat"] },
  { id: "armchair-01", name: "Armchair", category: "living", modelUrl: `${BLOB_BASE}/armchair-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/armchair-01.webp`, dimensions: { x: 0.85, y: 0.9, z: 0.85 }, keywords: ["armchair", "chair", "lounge chair", "accent chair"] },
  { id: "coffee-table-01", name: "Coffee Table", category: "living", modelUrl: `${BLOB_BASE}/coffee-table-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/coffee-table-01.webp`, dimensions: { x: 1.2, y: 0.45, z: 0.6 }, keywords: ["coffee table", "center table", "low table"] },
  { id: "tv-stand-01", name: "TV Stand", category: "living", modelUrl: `${BLOB_BASE}/tv-stand-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/tv-stand-01.webp`, dimensions: { x: 1.5, y: 0.5, z: 0.4 }, keywords: ["tv stand", "tv unit", "media console", "entertainment center", "television"] },
  { id: "bookshelf-01", name: "Bookshelf", category: "living", modelUrl: `${BLOB_BASE}/bookshelf-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/bookshelf-01.webp`, dimensions: { x: 0.8, y: 1.8, z: 0.3 }, keywords: ["bookshelf", "bookcase", "shelf", "shelving"] },

  // Bedroom
  { id: "bed-double-01", name: "Double Bed", category: "bedroom", modelUrl: `${BLOB_BASE}/bed-double-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/bed-double-01.webp`, dimensions: { x: 1.6, y: 0.6, z: 2.1 }, keywords: ["bed", "double bed", "queen bed", "king bed"] },
  { id: "bed-single-01", name: "Single Bed", category: "bedroom", modelUrl: `${BLOB_BASE}/bed-single-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/bed-single-01.webp`, dimensions: { x: 0.9, y: 0.5, z: 2.0 }, keywords: ["single bed", "twin bed", "child bed"] },
  { id: "nightstand-01", name: "Nightstand", category: "bedroom", modelUrl: `${BLOB_BASE}/nightstand-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/nightstand-01.webp`, dimensions: { x: 0.5, y: 0.55, z: 0.4 }, keywords: ["nightstand", "bedside table", "side table", "night table"] },
  { id: "wardrobe-01", name: "Wardrobe", category: "bedroom", modelUrl: `${BLOB_BASE}/wardrobe-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/wardrobe-01.webp`, dimensions: { x: 1.2, y: 2.0, z: 0.6 }, keywords: ["wardrobe", "closet", "armoire", "cupboard"] },
  { id: "desk-01", name: "Desk", category: "bedroom", modelUrl: `${BLOB_BASE}/desk-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/desk-01.webp`, dimensions: { x: 1.2, y: 0.75, z: 0.6 }, keywords: ["desk", "writing desk", "study desk", "work desk"] },

  // Kitchen
  { id: "fridge-01", name: "Refrigerator", category: "kitchen", modelUrl: `${BLOB_BASE}/fridge-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/fridge-01.webp`, dimensions: { x: 0.7, y: 1.8, z: 0.7 }, keywords: ["fridge", "refrigerator", "freezer"] },
  { id: "oven-01", name: "Oven", category: "kitchen", modelUrl: `${BLOB_BASE}/oven-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/oven-01.webp`, dimensions: { x: 0.6, y: 0.9, z: 0.6 }, keywords: ["oven", "stove", "cooker", "range"] },
  { id: "dining-table-01", name: "Dining Table", category: "kitchen", modelUrl: `${BLOB_BASE}/dining-table-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/dining-table-01.webp`, dimensions: { x: 1.6, y: 0.76, z: 0.9 }, keywords: ["dining table", "kitchen table", "eating table"] },
  { id: "dining-chair-01", name: "Dining Chair", category: "kitchen", modelUrl: `${BLOB_BASE}/dining-chair-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/dining-chair-01.webp`, dimensions: { x: 0.45, y: 0.9, z: 0.5 }, keywords: ["dining chair", "kitchen chair", "chair"] },
  { id: "sink-kitchen-01", name: "Kitchen Sink", category: "kitchen", modelUrl: `${BLOB_BASE}/sink-kitchen-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/sink-kitchen-01.webp`, dimensions: { x: 0.6, y: 0.2, z: 0.5 }, keywords: ["sink", "kitchen sink", "basin"] },

  // Bathroom
  { id: "toilet-01", name: "Toilet", category: "bathroom", modelUrl: `${BLOB_BASE}/toilet-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/toilet-01.webp`, dimensions: { x: 0.4, y: 0.7, z: 0.7 }, keywords: ["toilet", "wc", "lavatory", "loo"] },
  { id: "bathtub-01", name: "Bathtub", category: "bathroom", modelUrl: `${BLOB_BASE}/bathtub-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/bathtub-01.webp`, dimensions: { x: 0.75, y: 0.6, z: 1.7 }, keywords: ["bathtub", "bath", "tub"] },
  { id: "shower-01", name: "Shower", category: "bathroom", modelUrl: `${BLOB_BASE}/shower-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/shower-01.webp`, dimensions: { x: 0.9, y: 2.1, z: 0.9 }, keywords: ["shower", "shower cabin", "shower enclosure"] },
  { id: "sink-vanity-01", name: "Bathroom Vanity", category: "bathroom", modelUrl: `${BLOB_BASE}/sink-vanity-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/sink-vanity-01.webp`, dimensions: { x: 0.8, y: 0.85, z: 0.5 }, keywords: ["vanity", "bathroom sink", "washbasin", "basin"] },

  // Office
  { id: "office-desk-01", name: "Office Desk", category: "office", modelUrl: `${BLOB_BASE}/office-desk-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/office-desk-01.webp`, dimensions: { x: 1.4, y: 0.75, z: 0.7 }, keywords: ["office desk", "computer desk", "work desk"] },
  { id: "office-chair-01", name: "Office Chair", category: "office", modelUrl: `${BLOB_BASE}/office-chair-01.glb`, thumbnailUrl: `${BLOB_BASE}/thumbs/office-chair-01.webp`, dimensions: { x: 0.6, y: 1.1, z: 0.6 }, keywords: ["office chair", "swivel chair", "task chair", "computer chair"] },
];

/**
 * Fuzzy-match an item name from Gemini against the catalog.
 * Returns the best match or null.
 */
export function matchCatalogItem(name: string): CatalogItem | null {
  const lower = name.toLowerCase().trim();

  // Exact keyword match first
  for (const item of FURNITURE_CATALOG) {
    for (const keyword of item.keywords) {
      if (lower === keyword || lower.includes(keyword) || keyword.includes(lower)) {
        return item;
      }
    }
  }

  // Partial word match
  const words = lower.split(/\s+/);
  for (const item of FURNITURE_CATALOG) {
    for (const keyword of item.keywords) {
      for (const word of words) {
        if (word.length > 3 && keyword.includes(word)) {
          return item;
        }
      }
    }
  }

  return null;
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --project client/tsconfig.json 2>&1 | head -20` or just `npx vite build`

**Step 3: Commit**

```bash
git add client/src/lib/pascal/furniture-catalog.ts
git commit -m "feat: add furniture catalog data with fuzzy matching"
```

---

### Task 2: AI auto-placement — match Gemini items to catalog

**Files:**
- Modify: `api/models/[id]/generate-pascal.ts` (lines 207-215, item creation loop)

**Step 1: Add catalog import and matching to buildSceneFromGemini()**

The catalog is a frontend module, so for the API we need a server-side copy of `matchCatalogItem()` and the catalog data. Add the matching function and a minimal catalog map inline at the top of the file (or import from a shared location).

In the item creation loop (line 207-215), after creating the itemNode, add:

```typescript
// After: const itemNode: ItemNode = { ... }
// Add catalog matching:
const catalogMatch = matchItemToCatalog(item.name);
if (catalogMatch) {
  itemNode.catalogId = catalogMatch.id;
  itemNode.modelUrl = catalogMatch.modelUrl;
  itemNode.dimensions = catalogMatch.dimensions;
}
```

Add the matching function above `buildSceneFromGemini()`:

```typescript
const CATALOG_KEYWORDS: Record<string, { id: string; modelUrl: string; dimensions: { x: number; y: number; z: number } }> = {
  "sofa": { id: "sofa-01", modelUrl: "https://your-blob-store.vercel-storage.com/furniture/sofa-01.glb", dimensions: { x: 2.2, y: 0.85, z: 0.9 } },
  "couch": { id: "sofa-01", modelUrl: "https://your-blob-store.vercel-storage.com/furniture/sofa-01.glb", dimensions: { x: 2.2, y: 0.85, z: 0.9 } },
  "bed": { id: "bed-double-01", modelUrl: "https://your-blob-store.vercel-storage.com/furniture/bed-double-01.glb", dimensions: { x: 1.6, y: 0.6, z: 2.1 } },
  "toilet": { id: "toilet-01", modelUrl: "https://your-blob-store.vercel-storage.com/furniture/toilet-01.glb", dimensions: { x: 0.4, y: 0.7, z: 0.7 } },
  "fridge": { id: "fridge-01", modelUrl: "https://your-blob-store.vercel-storage.com/furniture/fridge-01.glb", dimensions: { x: 0.7, y: 1.8, z: 0.7 } },
  "table": { id: "dining-table-01", modelUrl: "https://your-blob-store.vercel-storage.com/furniture/dining-table-01.glb", dimensions: { x: 1.6, y: 0.76, z: 0.9 } },
  "chair": { id: "dining-chair-01", modelUrl: "https://your-blob-store.vercel-storage.com/furniture/dining-chair-01.glb", dimensions: { x: 0.45, y: 0.9, z: 0.5 } },
  "bathtub": { id: "bathtub-01", modelUrl: "https://your-blob-store.vercel-storage.com/furniture/bathtub-01.glb", dimensions: { x: 0.75, y: 0.6, z: 1.7 } },
  "shower": { id: "shower-01", modelUrl: "https://your-blob-store.vercel-storage.com/furniture/shower-01.glb", dimensions: { x: 0.9, y: 2.1, z: 0.9 } },
  "wardrobe": { id: "wardrobe-01", modelUrl: "https://your-blob-store.vercel-storage.com/furniture/wardrobe-01.glb", dimensions: { x: 1.2, y: 2.0, z: 0.6 } },
  "desk": { id: "desk-01", modelUrl: "https://your-blob-store.vercel-storage.com/furniture/desk-01.glb", dimensions: { x: 1.2, y: 0.75, z: 0.6 } },
  "oven": { id: "oven-01", modelUrl: "https://your-blob-store.vercel-storage.com/furniture/oven-01.glb", dimensions: { x: 0.6, y: 0.9, z: 0.6 } },
  "sink": { id: "sink-kitchen-01", modelUrl: "https://your-blob-store.vercel-storage.com/furniture/sink-kitchen-01.glb", dimensions: { x: 0.6, y: 0.2, z: 0.5 } },
};

function matchItemToCatalog(name: string): { id: string; modelUrl: string; dimensions: { x: number; y: number; z: number } } | null {
  const lower = name.toLowerCase();
  for (const [keyword, match] of Object.entries(CATALOG_KEYWORDS)) {
    if (lower.includes(keyword)) return match;
  }
  return null;
}
```

**Step 2: Verify build**

Run: `npx vite build`

**Step 3: Commit**

```bash
git add api/models/\[id\]/generate-pascal.ts
git commit -m "feat: auto-match Gemini items to furniture catalog"
```

---

### Task 3: Render GLB models for catalog items

**Files:**
- Modify: `client/src/components/viewer/SceneRenderer.tsx` (ItemMesh component, lines 160-185)
- Modify: `client/src/components/viewer/systems/item-system.ts`

**Step 1: Create a GLB item renderer in SceneRenderer.tsx**

Add a new component `ItemModelMesh` that uses `useGLTF` when `modelUrl` exists:

```typescript
import { useGLTF, Center } from "@react-three/drei";

function ItemModelMesh({ node }: { node: ItemNode }) {
  const selectedIds = useViewer((s) => s.selectedIds);
  const isSelected = selectedIds.includes(node.id);
  const { scene } = useGLTF(node.modelUrl!);
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  const { position } = getItemTransform(node);
  const d = node.dimensions ?? { x: 1, y: 1, z: 1 };

  return (
    <group
      position={position}
      ref={(g) => {
        if (g) sceneRegistry.register(node.id, g);
        else sceneRegistry.unregister(node.id);
      }}
      userData={{ nodeId: node.id }}
    >
      <primitive object={clonedScene} scale={[d.x, d.y, d.z]} />
      {isSelected && (
        <mesh>
          <boxGeometry args={[d.x * 1.02, d.y * 1.02, d.z * 1.02]} />
          <meshBasicMaterial color="#4A90FF" wireframe transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}
```

**Step 2: Update ItemMesh to delegate to ItemModelMesh when modelUrl exists**

Replace the current `ItemMesh` rendering logic:

```typescript
function ItemMesh({ node }: { node: ItemNode }) {
  if (node.modelUrl) {
    return <ItemModelMesh node={node} />;
  }
  // ... existing box rendering code
}
```

**Step 3: Add useGLTF import to SceneRenderer.tsx**

Add `useGLTF` to the drei import line.

**Step 4: Build and verify**

Run: `npx vite build`

**Step 5: Commit**

```bash
git add client/src/components/viewer/SceneRenderer.tsx
git commit -m "feat: render GLB models for catalog furniture items"
```

---

### Task 4: Furniture catalog panel UI

**Files:**
- Create: `client/src/components/editor/FurnitureCatalogPanel.tsx`
- Modify: `client/src/components/editor/FloorplanEditor.tsx` (add panel to left sidebar)

**Step 1: Create the panel component**

```typescript
// client/src/components/editor/FurnitureCatalogPanel.tsx
import { useState } from "react";
import { FURNITURE_CATALOG, type CatalogItem } from "@/lib/pascal/furniture-catalog";
import { useScene } from "@/stores/use-scene";
import { useViewer } from "@/stores/use-viewer";
import { createNode } from "@/lib/pascal/schemas";
import { Package } from "lucide-react";

const CATEGORIES = ["all", "living", "bedroom", "kitchen", "bathroom", "office"] as const;

export function FurnitureCatalogPanel() {
  const [category, setCategory] = useState<string>("all");
  const { addNode, nodes } = useScene();
  const { activeLevelId } = useViewer();

  const filtered = category === "all"
    ? FURNITURE_CATALOG
    : FURNITURE_CATALOG.filter((item) => item.category === category);

  const placeItem = (catalogItem: CatalogItem) => {
    const itemNode = createNode("item", {
      name: catalogItem.name,
      parentId: activeLevelId ?? undefined,
      itemType: "furniture",
      catalogId: catalogItem.id,
      modelUrl: catalogItem.modelUrl,
      dimensions: catalogItem.dimensions,
      transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    });
    addNode(itemNode);
  };

  return (
    <div className="bg-[#111] rounded-2xl border border-white/5 p-3">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-semibold text-white uppercase tracking-wider">Furniture</span>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 mb-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-2 py-1 rounded-md text-[10px] capitalize transition-all ${
              category === cat
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-black/20 text-white/40 border border-transparent hover:bg-white/5"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Item grid */}
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {filtered.map((item) => (
          <button
            key={item.id}
            onClick={() => placeItem(item)}
            className="flex flex-col items-center p-2 rounded-lg bg-black/20 border border-white/5 hover:bg-white/10 hover:border-amber-500/30 transition-all group"
          >
            <div className="w-full aspect-square bg-black/30 rounded-md mb-1.5 flex items-center justify-center text-white/20 group-hover:text-amber-400 transition-colors">
              <Package className="w-6 h-6" />
            </div>
            <span className="text-[10px] text-white/60 group-hover:text-white text-center leading-tight">
              {item.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Add to FloorplanEditor.tsx left panel (after AIGeneratePanel, line 78)**

```typescript
import { FurnitureCatalogPanel } from "@/components/editor/FurnitureCatalogPanel";

// In the left panel JSX, after <AIGeneratePanel />:
<FurnitureCatalogPanel />
```

**Step 3: Build and verify**

Run: `npx vite build`

**Step 4: Commit**

```bash
git add client/src/components/editor/FurnitureCatalogPanel.tsx client/src/components/editor/FloorplanEditor.tsx
git commit -m "feat: add furniture catalog panel with category filtering"
```

---

## Track B: Wall Drag Editing

### Task 5: Wall drag handles component

**Files:**
- Create: `client/src/components/viewer/WallDragHandles.tsx`

**Step 1: Create the drag handles component**

This component renders when a wall is selected and provides draggable spheres at endpoints.

```typescript
// client/src/components/viewer/WallDragHandles.tsx
import { useRef, useState, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScene } from "@/stores/use-scene";
import { useViewer } from "@/stores/use-viewer";
import type { WallNode } from "@/lib/pascal/schemas";

const HANDLE_RADIUS = 0.15;
const HANDLE_COLOR = "#FF6B35";
const HANDLE_HOVER_COLOR = "#FFB800";
const SNAP_GRID = 0.05;
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function snap(v: number): number {
  return Math.round(v / SNAP_GRID) * SNAP_GRID;
}

function DragHandle({
  position,
  onDrag,
}: {
  position: [number, number, number];
  onDrag: (newPos: { x: number; z: number }) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const { camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const intersection = useRef(new THREE.Vector3());

  const getGroundPoint = useCallback(
    (e: PointerEvent): { x: number; z: number } | null => {
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.current.setFromCamera(mouse, camera);
      if (raycaster.current.ray.intersectPlane(groundPlane, intersection.current)) {
        return { x: snap(intersection.current.x), z: snap(intersection.current.z) };
      }
      return null;
    },
    [camera, gl]
  );

  const handlePointerDown = useCallback(
    (e: THREE.Event) => {
      e.stopPropagation();
      setDragging(true);
      gl.domElement.setPointerCapture((e as any).pointerId);

      const onMove = (ev: PointerEvent) => {
        const pt = getGroundPoint(ev);
        if (pt) onDrag(pt);
      };

      const onUp = () => {
        setDragging(false);
        gl.domElement.removeEventListener("pointermove", onMove);
        gl.domElement.removeEventListener("pointerup", onUp);
      };

      gl.domElement.addEventListener("pointermove", onMove);
      gl.domElement.addEventListener("pointerup", onUp);
    },
    [gl, getGroundPoint, onDrag]
  );

  return (
    <mesh
      position={position}
      onPointerDown={handlePointerDown}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[HANDLE_RADIUS, 16, 16]} />
      <meshStandardMaterial
        color={dragging ? "#FFFFFF" : hovered ? HANDLE_HOVER_COLOR : HANDLE_COLOR}
        emissive={dragging ? "#FF6B35" : hovered ? HANDLE_HOVER_COLOR : HANDLE_COLOR}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

export function WallDragHandles({ wall }: { wall: WallNode }) {
  const updateNode = useScene((s) => s.updateNode);

  const handleStartDrag = useCallback(
    (pos: { x: number; z: number }) => {
      updateNode(wall.id, { start: { x: pos.x, y: 0, z: pos.z } } as any);
    },
    [wall.id, updateNode]
  );

  const handleEndDrag = useCallback(
    (pos: { x: number; z: number }) => {
      updateNode(wall.id, { end: { x: pos.x, y: 0, z: pos.z } } as any);
    },
    [wall.id, updateNode]
  );

  const h = (wall.height ?? 2.7) / 2;

  return (
    <group>
      <DragHandle
        position={[wall.start.x, h, wall.start.z]}
        onDrag={handleStartDrag}
      />
      <DragHandle
        position={[wall.end.x, h, wall.end.z]}
        onDrag={handleEndDrag}
      />
    </group>
  );
}
```

**Step 2: Build and verify**

Run: `npx vite build`

**Step 3: Commit**

```bash
git add client/src/components/viewer/WallDragHandles.tsx
git commit -m "feat: add wall drag handles with grid snapping"
```

---

### Task 6: Integrate drag handles into SceneRenderer

**Files:**
- Modify: `client/src/components/viewer/SceneRenderer.tsx`

**Step 1: Import and render WallDragHandles**

Add import:
```typescript
import { WallDragHandles } from "./WallDragHandles";
```

In the SceneRenderer return JSX, after the walls rendering block, add:

```typescript
{/* Drag handles for selected walls */}
{walls
  .filter((w) => selectedIds.includes(w.id))
  .map((w) => (
    <WallDragHandles key={`handles-${w.id}`} wall={w} />
  ))}
```

Need to bring `selectedIds` into SceneRenderer (it's already used by child components but not the parent):

```typescript
const selectedIds = useViewer((s) => s.selectedIds);
```

**Step 2: Build and verify**

Run: `npx vite build`

**Step 3: Commit**

```bash
git add client/src/components/viewer/SceneRenderer.tsx
git commit -m "feat: show drag handles on selected walls in viewer"
```

---

### Task 7: Source and upload GLB furniture assets

**Files:**
- No code changes — asset acquisition task

**Step 1: Download free CC0 furniture GLBs**

Source from Quaternius, Kenney.nl, or Poly Haven. Need at minimum:
- sofa, armchair, coffee table, TV stand, bookshelf
- double bed, single bed, nightstand, wardrobe, desk
- fridge, oven, dining table, dining chair, kitchen sink
- toilet, bathtub, shower, bathroom vanity
- office desk, office chair

**Step 2: Optimize with gltf-transform**

```bash
npx @gltf-transform/cli optimize input.glb output.glb --compress draco
```

Target: each GLB under 500KB.

**Step 3: Upload to Vercel Blob**

Upload via Vercel dashboard or CLI. Update URLs in `furniture-catalog.ts` and `generate-pascal.ts` CATALOG_KEYWORDS.

**Step 4: Generate thumbnail images**

Render each model in a simple Three.js scene, screenshot as 200x200 WebP. Upload alongside GLBs.

**Step 5: Commit updated URLs**

```bash
git add client/src/lib/pascal/furniture-catalog.ts api/models/\[id\]/generate-pascal.ts
git commit -m "feat: add real GLB URLs for furniture catalog"
```

---

## Final Integration

### Task 8: End-to-end verification

**Step 1: Build**

Run: `npx vite build` — must pass with no errors.

**Step 2: Test furniture auto-placement**

1. Upload a floorplan image
2. Click "Run Geometric Pipeline"
3. After generation, switch to 3D view
4. Verify: furniture items appear as 3D models (not boxes) in correct room positions

**Step 3: Test wall dragging**

1. In the 3D view or editor, click a wall to select it
2. Verify: orange spheres appear at wall endpoints
3. Drag a sphere — wall endpoint follows cursor with grid snap
4. Release — wall stays in new position
5. Ctrl+Z — wall returns to original position (undo)

**Step 4: Test catalog panel**

1. Open the editor for a floorplan
2. In the left sidebar, find the Furniture panel
3. Click a category tab (Kitchen, Bathroom, etc.)
4. Click an item — it appears at origin in the scene
5. Verify the item renders as a 3D model if it has a modelUrl

**Step 5: Final commit and push**

```bash
git push origin main
```
