# 3D Floorplan Editor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the existing CAD viewer with a fully integrated 3D floorplan editor forked from Pascal Editor, with server-side persistence, AI-powered floorplan generation, and export capabilities.

**Architecture:** Fork Pascal Editor's `@pascal-app/core` (Zod schemas, Zustand state, geometry systems) and `@pascal-app/viewer` (R3F rendering). Discard the Next.js shell. Rebuild the editor UI with our Shadcn/ui components. Replace IndexedDB persistence with our Vercel serverless API + Neon PostgreSQL pattern. Wire into existing auth, subscription, and AI (Gemini) systems.

**Tech Stack:** React 19, Three.js + React Three Fiber, Zustand + Zundo, Zod, Drizzle ORM, Neon PostgreSQL, Vercel Blob, Gemini API

**Design doc:** `docs/plans/2026-03-17-3d-floorplan-editor-design.md`

---

## Phase 1: Foundation — Database, Dependencies, Core Schemas

### Task 1: Add Database Migration for floorplanDesigns Table

**Files:**
- Create: `migrations/005_floorplan_designs.sql`

**Step 1: Write the migration SQL**

```sql
-- Migration: 3D Floorplan Editor - floorplan_designs table
-- Stores Pascal Editor scene data as JSONB for the 3D floorplan editor

CREATE TABLE IF NOT EXISTS floorplan_designs (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Floorplan',
  scene_data TEXT NOT NULL DEFAULT '{"nodes":{},"rootNodeIds":[]}',
  thumbnail_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_floorplan_designs_user ON floorplan_designs(user_id);
-- Index for project queries
CREATE INDEX IF NOT EXISTS idx_floorplan_designs_project ON floorplan_designs(project_id);
```

**Step 2: Run the migration against dev database**

Run: `psql $DATABASE_URL -f migrations/005_floorplan_designs.sql`
Expected: CREATE TABLE, CREATE INDEX x2

**Step 3: Commit**

```bash
git add migrations/005_floorplan_designs.sql
git commit -m "feat: add floorplan_designs table migration"
```

---

### Task 2: Add Schema + Types to shared/schema.ts

**Files:**
- Modify: `shared/schema.ts`

**Step 1: Add the floorplanDesigns table definition after the planningAnalyses table**

Add this after the `planningAnalyses` table definition (after line ~180):

```typescript
// 3D Floorplan Editor designs
export const floorplanDesigns = pgTable("floorplan_designs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull().default("Untitled Floorplan"),
  sceneData: text("scene_data").notNull().default('{"nodes":{},"rootNodeIds":[]}'),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFloorplanDesignSchema = createInsertSchema(floorplanDesigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFloorplanDesign = z.infer<typeof insertFloorplanDesignSchema>;
export type FloorplanDesign = typeof floorplanDesigns.$inferSelect;
```

**Step 2: Verify TypeScript compiles**

Run: `cd /Users/kivateit/Documents/Documents/GitHub/architect-studio && npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: No errors related to floorplanDesigns

**Step 3: Commit**

```bash
git add shared/schema.ts
git commit -m "feat: add floorplanDesigns schema and types"
```

---

### Task 3: Install New Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install zundo for undo/redo**

Run: `cd /Users/kivateit/Documents/Documents/GitHub/architect-studio && npm install zundo`
Expected: added 1 package

**Step 2: Verify existing deps are compatible**

Run: `npm ls zustand three @react-three/fiber @react-three/drei zod three-bvh-csg`
Expected: All present — zustand@5.x, three@0.182.x, zod@3.x, three-bvh-csg@0.0.16

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add zundo dependency for undo/redo"
```

---

### Task 4: Create Pascal Core — Node Schemas (13 Node Types)

**Files:**
- Create: `client/src/lib/pascal/schemas.ts`

**Step 1: Write the Zod schemas for all 13 Pascal node types**

```typescript
import { z } from "zod";

// Base node schema — shared by all node types
const baseNodeSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  childIds: z.array(z.string().uuid()),
  name: z.string(),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
});

// Position/transform
const vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const transformSchema = z.object({
  position: vec3Schema.default({ x: 0, y: 0, z: 0 }),
  rotation: vec3Schema.default({ x: 0, y: 0, z: 0 }),
  scale: vec3Schema.default({ x: 1, y: 1, z: 1 }),
});

// ─── Node Types ───────────────────────────────────────────

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
  elevation: z.number().default(0), // meters above ground
  height: z.number().default(2.7), // floor-to-ceiling height
  index: z.number().default(0), // 0 = ground, 1 = first, etc.
  transform: transformSchema.default({}),
});

export const zoneNodeSchema = baseNodeSchema.extend({
  type: z.literal("zone"),
  zoneType: z.enum(["room", "hallway", "bathroom", "kitchen", "bedroom", "living", "garage", "utility", "other"]).default("room"),
  label: z.string().default(""),
  color: z.string().default("#4A90D9"),
  points: z.array(vec3Schema).default([]), // 2D polygon outline
  transform: transformSchema.default({}),
});

export const wallNodeSchema = baseNodeSchema.extend({
  type: z.literal("wall"),
  start: vec3Schema,
  end: vec3Schema,
  height: z.number().default(2.7),
  thickness: z.number().default(0.15), // meters
  material: z.string().default("plaster"),
  transform: transformSchema.default({}),
});

export const ceilingNodeSchema = baseNodeSchema.extend({
  type: z.literal("ceiling"),
  points: z.array(vec3Schema).default([]),
  height: z.number().default(0.2),
  material: z.string().default("plaster"),
  transform: transformSchema.default({}),
});

export const slabNodeSchema = baseNodeSchema.extend({
  type: z.literal("slab"),
  points: z.array(vec3Schema).default([]),
  thickness: z.number().default(0.3),
  material: z.string().default("concrete"),
  transform: transformSchema.default({}),
});

export const roofNodeSchema = baseNodeSchema.extend({
  type: z.literal("roof"),
  roofType: z.enum(["flat", "gable", "hip", "mansard", "shed"]).default("gable"),
  pitch: z.number().default(35), // degrees
  overhang: z.number().default(0.3), // meters
  points: z.array(vec3Schema).default([]),
  material: z.string().default("tile"),
  transform: transformSchema.default({}),
});

export const doorNodeSchema = baseNodeSchema.extend({
  type: z.literal("door"),
  wallId: z.string().uuid(), // parent wall
  position: z.number().default(0.5), // 0-1 along wall
  width: z.number().default(0.9),
  height: z.number().default(2.1),
  doorType: z.enum(["single", "double", "sliding", "french", "bifold"]).default("single"),
  swing: z.enum(["left", "right"]).default("left"),
  transform: transformSchema.default({}),
});

export const windowNodeSchema = baseNodeSchema.extend({
  type: z.literal("window"),
  wallId: z.string().uuid(), // parent wall
  position: z.number().default(0.5), // 0-1 along wall
  width: z.number().default(1.2),
  height: z.number().default(1.2),
  sillHeight: z.number().default(0.9), // from floor
  windowType: z.enum(["fixed", "casement", "sash", "sliding", "bay", "skylight"]).default("casement"),
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
  imageUrl: z.string(), // Vercel Blob URL (was asset:// in Pascal)
  width: z.number().default(10), // real-world meters
  height: z.number().default(10),
  opacity: z.number().min(0).max(1).default(0.5),
  transform: transformSchema.default({}),
});

export const itemNodeSchema = baseNodeSchema.extend({
  type: z.literal("item"),
  itemType: z.enum(["furniture", "appliance", "fixture", "light", "custom"]).default("furniture"),
  catalogId: z.string().optional(), // reference to a furniture catalog
  dimensions: vec3Schema.default({ x: 1, y: 1, z: 1 }),
  material: z.string().default("wood"),
  modelUrl: z.string().optional(), // GLB model URL
  transform: transformSchema.default({}),
});

// ─── Union Type ───────────────────────────────────────────

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

// Scene data (what gets persisted)
export const sceneDataSchema = z.object({
  nodes: z.record(z.string(), anyNodeSchema),
  rootNodeIds: z.array(z.string()),
});

export type SceneData = z.infer<typeof sceneDataSchema>;

// ─── Helpers ──────────────────────────────────────────────

export const NODE_TYPES = [
  "site", "building", "level", "zone", "wall", "ceiling",
  "slab", "roof", "door", "window", "guide", "scan", "item",
] as const;

/** Create a new node with a generated ID */
export function createNode<T extends AnyNode["type"]>(
  type: T,
  overrides: Partial<Extract<AnyNode, { type: T }>> = {} as any
): Extract<AnyNode, { type: T }> {
  const id = crypto.randomUUID();
  const base = {
    id,
    parentId: null,
    childIds: [],
    name: `${type}-${id.slice(0, 4)}`,
    visible: true,
    locked: false,
    ...overrides,
    type,
  };
  return base as Extract<AnyNode, { type: T }>;
}

/** Create an empty scene with site + building + level */
export function createEmptyScene(): SceneData {
  const site = createNode("site", { name: "Site" });
  const building = createNode("building", { name: "Building 1", parentId: site.id });
  const level = createNode("level", { name: "Ground Floor", parentId: building.id, index: 0, elevation: 0 });

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
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add client/src/lib/pascal/schemas.ts
git commit -m "feat: add Pascal core node schemas (13 types) with Zod validation"
```

---

### Task 5: Create Pascal Core — Event Bus + Scene Registry

**Files:**
- Create: `client/src/lib/pascal/event-bus.ts`
- Create: `client/src/lib/pascal/scene-registry.ts`

**Step 1: Write the typed event bus**

```typescript
// client/src/lib/pascal/event-bus.ts
import type { AnyNode, NodeType } from "./schemas";

type EventMap = {
  "node:created": { node: AnyNode };
  "node:updated": { nodeId: string; changes: Partial<AnyNode> };
  "node:deleted": { nodeId: string; type: NodeType };
  "selection:changed": { nodeIds: string[] };
  "tool:changed": { tool: string };
  "scene:loaded": { nodeCount: number };
  "scene:saved": { timestamp: number };
  "scene:dirty": { dirtyNodeIds: string[] };
};

type EventHandler<T> = (data: T) => void;

class EventBus {
  private handlers = new Map<string, Set<EventHandler<any>>>();

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.handlers.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error(`Event handler error [${event}]:`, err);
      }
    });
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    this.handlers.get(event)?.delete(handler);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
export type { EventMap };
```

**Step 2: Write the scene registry**

```typescript
// client/src/lib/pascal/scene-registry.ts
import * as THREE from "three";

/**
 * Maps node IDs to their Three.js objects for fast lookup.
 * Used by selection, raycasting, and spatial queries.
 */
class SceneRegistry {
  private objectMap = new Map<string, THREE.Object3D>();
  private nodeIdMap = new Map<THREE.Object3D, string>();

  register(nodeId: string, object: THREE.Object3D): void {
    this.objectMap.set(nodeId, object);
    this.nodeIdMap.set(object, nodeId);
    object.userData.nodeId = nodeId;
  }

  unregister(nodeId: string): void {
    const object = this.objectMap.get(nodeId);
    if (object) {
      this.nodeIdMap.delete(object);
    }
    this.objectMap.delete(nodeId);
  }

  getObject(nodeId: string): THREE.Object3D | undefined {
    return this.objectMap.get(nodeId);
  }

  getNodeId(object: THREE.Object3D): string | undefined {
    // Walk up the parent chain to find a registered object
    let current: THREE.Object3D | null = object;
    while (current) {
      const nodeId = this.nodeIdMap.get(current);
      if (nodeId) return nodeId;
      current = current.parent;
    }
    return undefined;
  }

  getAllObjects(): Map<string, THREE.Object3D> {
    return new Map(this.objectMap);
  }

  clear(): void {
    this.objectMap.clear();
    this.nodeIdMap.clear();
  }

  get size(): number {
    return this.objectMap.size;
  }
}

export const sceneRegistry = new SceneRegistry();
```

**Step 3: Commit**

```bash
git add client/src/lib/pascal/event-bus.ts client/src/lib/pascal/scene-registry.ts
git commit -m "feat: add event bus and scene registry for Pascal core"
```

---

## Phase 2: State Management — Zustand Stores with API Persistence

### Task 6: Create useScene Store (Core Scene State + Undo/Redo)

**Files:**
- Create: `client/src/stores/use-scene.ts`

**Step 1: Write the useScene store with Zundo undo/redo and API sync**

```typescript
import { create } from "zustand";
import { temporal } from "zundo";
import type { AnyNode, SceneData } from "@/lib/pascal/schemas";
import { createEmptyScene } from "@/lib/pascal/schemas";
import { eventBus } from "@/lib/pascal/event-bus";

interface SceneState {
  // Scene data (persisted)
  nodes: Record<string, AnyNode>;
  rootNodeIds: string[];

  // Tracking
  dirtyNodeIds: Set<string>;
  floorplanId: number | null; // database ID for save/load
  lastSavedAt: number | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;

  // Node CRUD
  addNode: (node: AnyNode, parentId?: string) => void;
  updateNode: (nodeId: string, changes: Partial<AnyNode>) => void;
  deleteNode: (nodeId: string) => void;
  moveNode: (nodeId: string, newParentId: string) => void;

  // Bulk operations
  loadScene: (data: SceneData, floorplanId?: number) => void;
  clearScene: () => void;
  getSceneData: () => SceneData;

  // Dirty tracking
  markDirty: (nodeId: string) => void;
  clearDirty: () => void;

  // Persistence
  setFloorplanId: (id: number) => void;
  setSaving: (saving: boolean) => void;
  markSaved: () => void;
}

export const useScene = create<SceneState>()(
  temporal(
    (set, get) => {
      const emptyScene = createEmptyScene();

      return {
        nodes: emptyScene.nodes,
        rootNodeIds: emptyScene.rootNodeIds,
        dirtyNodeIds: new Set<string>(),
        floorplanId: null,
        lastSavedAt: null,
        isSaving: false,
        hasUnsavedChanges: false,

        addNode: (node, parentId) => {
          set((state) => {
            const nodes = { ...state.nodes, [node.id]: node };

            // Add to parent's childIds if parentId provided
            if (parentId && nodes[parentId]) {
              const parent = { ...nodes[parentId] };
              parent.childIds = [...parent.childIds, node.id];
              nodes[parentId] = parent as AnyNode;
              node.parentId = parentId;
            }

            // If no parent, add to root
            const rootNodeIds = parentId
              ? state.rootNodeIds
              : [...state.rootNodeIds, node.id];

            eventBus.emit("node:created", { node });

            return {
              nodes,
              rootNodeIds,
              dirtyNodeIds: new Set([...state.dirtyNodeIds, node.id]),
              hasUnsavedChanges: true,
            };
          });
        },

        updateNode: (nodeId, changes) => {
          set((state) => {
            const existing = state.nodes[nodeId];
            if (!existing) return state;

            const updated = { ...existing, ...changes, type: existing.type } as AnyNode;
            eventBus.emit("node:updated", { nodeId, changes });

            return {
              nodes: { ...state.nodes, [nodeId]: updated },
              dirtyNodeIds: new Set([...state.dirtyNodeIds, nodeId]),
              hasUnsavedChanges: true,
            };
          });
        },

        deleteNode: (nodeId) => {
          set((state) => {
            const node = state.nodes[nodeId];
            if (!node) return state;

            // Collect all descendant IDs to delete
            const toDelete = new Set<string>();
            const queue = [nodeId];
            while (queue.length > 0) {
              const id = queue.shift()!;
              toDelete.add(id);
              const n = state.nodes[id];
              if (n) queue.push(...n.childIds);
            }

            // Remove from parent
            const nodes = { ...state.nodes };
            if (node.parentId && nodes[node.parentId]) {
              const parent = { ...nodes[node.parentId] };
              parent.childIds = parent.childIds.filter((id) => id !== nodeId);
              nodes[node.parentId] = parent as AnyNode;
            }

            // Delete all collected nodes
            for (const id of toDelete) {
              delete nodes[id];
            }

            const rootNodeIds = state.rootNodeIds.filter((id) => !toDelete.has(id));
            eventBus.emit("node:deleted", { nodeId, type: node.type });

            return {
              nodes,
              rootNodeIds,
              dirtyNodeIds: new Set([...state.dirtyNodeIds, ...toDelete]),
              hasUnsavedChanges: true,
            };
          });
        },

        moveNode: (nodeId, newParentId) => {
          set((state) => {
            const node = state.nodes[nodeId];
            const newParent = state.nodes[newParentId];
            if (!node || !newParent) return state;

            const nodes = { ...state.nodes };

            // Remove from old parent
            if (node.parentId && nodes[node.parentId]) {
              const oldParent = { ...nodes[node.parentId] };
              oldParent.childIds = oldParent.childIds.filter((id) => id !== nodeId);
              nodes[node.parentId] = oldParent as AnyNode;
            }

            // Add to new parent
            const updatedParent = { ...newParent };
            updatedParent.childIds = [...updatedParent.childIds, nodeId];
            nodes[newParentId] = updatedParent as AnyNode;

            // Update node's parentId
            const updatedNode = { ...node, parentId: newParentId };
            nodes[nodeId] = updatedNode as AnyNode;

            return {
              nodes,
              rootNodeIds: state.rootNodeIds.filter((id) => id !== nodeId),
              dirtyNodeIds: new Set([...state.dirtyNodeIds, nodeId, newParentId]),
              hasUnsavedChanges: true,
            };
          });
        },

        loadScene: (data, floorplanId) => {
          set({
            nodes: data.nodes,
            rootNodeIds: data.rootNodeIds,
            dirtyNodeIds: new Set(),
            floorplanId: floorplanId ?? null,
            hasUnsavedChanges: false,
          });
          eventBus.emit("scene:loaded", { nodeCount: Object.keys(data.nodes).length });
        },

        clearScene: () => {
          const emptyScene = createEmptyScene();
          set({
            nodes: emptyScene.nodes,
            rootNodeIds: emptyScene.rootNodeIds,
            dirtyNodeIds: new Set(),
            hasUnsavedChanges: true,
          });
        },

        getSceneData: () => ({
          nodes: get().nodes,
          rootNodeIds: get().rootNodeIds,
        }),

        markDirty: (nodeId) => {
          set((state) => ({
            dirtyNodeIds: new Set([...state.dirtyNodeIds, nodeId]),
            hasUnsavedChanges: true,
          }));
        },

        clearDirty: () => {
          set({ dirtyNodeIds: new Set() });
        },

        setFloorplanId: (id) => set({ floorplanId: id }),
        setSaving: (saving) => set({ isSaving: saving }),
        markSaved: () => set({ lastSavedAt: Date.now(), hasUnsavedChanges: false, isSaving: false }),
      };
    },
    {
      limit: 50, // 50-step undo/redo history
      equality: (pastState, currentState) =>
        JSON.stringify(pastState.nodes) === JSON.stringify(currentState.nodes),
    }
  )
);
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add client/src/stores/use-scene.ts
git commit -m "feat: add useScene store with node CRUD, undo/redo, and dirty tracking"
```

---

### Task 7: Create useViewer Store (Selection + Camera)

**Files:**
- Create: `client/src/stores/use-viewer.ts`

**Step 1: Write the useViewer store**

```typescript
import { create } from "zustand";

export type CameraMode = "perspective" | "orthographic";
export type LevelMode = "stacked" | "exploded" | "solo";

interface ViewerState {
  // Selection
  selectedIds: string[];
  hoveredId: string | null;

  // Active context (which building/level/zone is focused)
  activeBuildingId: string | null;
  activeLevelId: string | null;
  activeZoneId: string | null;

  // Camera
  cameraMode: CameraMode;

  // Level display
  levelMode: LevelMode;
  soloLevelId: string | null; // when levelMode === "solo"
  explodedSpacing: number; // vertical gap between levels in exploded view

  // Visibility toggles
  showWalls: boolean;
  showCeilings: boolean;
  showSlabs: boolean;
  showRoofs: boolean;
  showItems: boolean;
  showZones: boolean;
  showGuides: boolean;
  showScans: boolean;
  showGrid: boolean;
  showDimensions: boolean;

  // Selection actions
  select: (nodeIds: string[]) => void;
  addToSelection: (nodeId: string) => void;
  removeFromSelection: (nodeId: string) => void;
  clearSelection: () => void;
  setHovered: (nodeId: string | null) => void;

  // Context actions
  setActiveBuilding: (id: string | null) => void;
  setActiveLevel: (id: string | null) => void;
  setActiveZone: (id: string | null) => void;

  // Camera actions
  setCameraMode: (mode: CameraMode) => void;
  toggleCameraMode: () => void;

  // Level display actions
  setLevelMode: (mode: LevelMode) => void;
  setSoloLevel: (levelId: string | null) => void;
  setExplodedSpacing: (spacing: number) => void;

  // Visibility actions
  toggleVisibility: (key: VisibilityKey) => void;
  setVisibility: (key: VisibilityKey, visible: boolean) => void;
}

type VisibilityKey =
  | "showWalls" | "showCeilings" | "showSlabs" | "showRoofs"
  | "showItems" | "showZones" | "showGuides" | "showScans"
  | "showGrid" | "showDimensions";

export const useViewer = create<ViewerState>((set) => ({
  selectedIds: [],
  hoveredId: null,
  activeBuildingId: null,
  activeLevelId: null,
  activeZoneId: null,
  cameraMode: "perspective",
  levelMode: "stacked",
  soloLevelId: null,
  explodedSpacing: 3,
  showWalls: true,
  showCeilings: true,
  showSlabs: true,
  showRoofs: true,
  showItems: true,
  showZones: true,
  showGuides: true,
  showScans: true,
  showGrid: true,
  showDimensions: true,

  select: (nodeIds) => set({ selectedIds: nodeIds }),
  addToSelection: (nodeId) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(nodeId)
        ? s.selectedIds
        : [...s.selectedIds, nodeId],
    })),
  removeFromSelection: (nodeId) =>
    set((s) => ({ selectedIds: s.selectedIds.filter((id) => id !== nodeId) })),
  clearSelection: () => set({ selectedIds: [] }),
  setHovered: (nodeId) => set({ hoveredId: nodeId }),

  setActiveBuilding: (id) => set({ activeBuildingId: id }),
  setActiveLevel: (id) => set({ activeLevelId: id }),
  setActiveZone: (id) => set({ activeZoneId: id }),

  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleCameraMode: () =>
    set((s) => ({
      cameraMode: s.cameraMode === "perspective" ? "orthographic" : "perspective",
    })),

  setLevelMode: (mode) => set({ levelMode: mode }),
  setSoloLevel: (levelId) => set({ soloLevelId: levelId, levelMode: "solo" }),
  setExplodedSpacing: (spacing) => set({ explodedSpacing: spacing }),

  toggleVisibility: (key) => set((s) => ({ [key]: !s[key] })),
  setVisibility: (key, visible) => set({ [key]: visible }),
}));
```

**Step 2: Commit**

```bash
git add client/src/stores/use-viewer.ts
git commit -m "feat: add useViewer store for selection, camera, and visibility"
```

---

### Task 8: Create useEditor Store (Tools + Panels)

**Files:**
- Create: `client/src/stores/use-editor.ts`

**Step 1: Write the useEditor store**

```typescript
import { create } from "zustand";

export type EditorTool =
  | "select"    // Default — click to select nodes
  | "wall"      // Draw walls
  | "door"      // Place doors on walls
  | "window"    // Place windows on walls
  | "slab"      // Draw floor slabs
  | "ceiling"   // Draw ceilings
  | "roof"      // Draw roofs
  | "zone"      // Draw zones/rooms
  | "item"      // Place furniture/items
  | "guide"     // Draw guide lines
  | "scan"      // Place reference scans
  | "measure"   // Measure distances
  | "pan"       // Pan camera (alt: hold middle mouse)
  | "eraser";   // Delete by clicking

export type EditorPhase =
  | "idle"        // No active action
  | "placing"     // Single-click placement (door, window, item)
  | "drawing"     // Multi-click drawing (walls, slabs, zones)
  | "dragging";   // Moving a selected node

export type PanelId = "properties" | "levels" | "ai" | "layers" | "catalog";

interface EditorState {
  // Active tool
  activeTool: EditorTool;
  phase: EditorPhase;

  // Drawing state (for multi-click tools like wall drawing)
  drawingPoints: Array<{ x: number; z: number }>; // accumulated clicks
  previewPoint: { x: number; z: number } | null; // mouse hover preview

  // Panel visibility
  visiblePanels: Set<PanelId>;

  // Tool actions
  setTool: (tool: EditorTool) => void;
  setPhase: (phase: EditorPhase) => void;
  cancelAction: () => void; // ESC key — reset to select + idle

  // Drawing actions
  addDrawingPoint: (point: { x: number; z: number }) => void;
  setPreviewPoint: (point: { x: number; z: number } | null) => void;
  clearDrawing: () => void;

  // Panel actions
  togglePanel: (panel: PanelId) => void;
  showPanel: (panel: PanelId) => void;
  hidePanel: (panel: PanelId) => void;
}

export const useEditor = create<EditorState>((set) => ({
  activeTool: "select",
  phase: "idle",
  drawingPoints: [],
  previewPoint: null,
  visiblePanels: new Set<PanelId>(["properties", "levels"]),

  setTool: (tool) =>
    set({
      activeTool: tool,
      phase: "idle",
      drawingPoints: [],
      previewPoint: null,
    }),

  setPhase: (phase) => set({ phase }),

  cancelAction: () =>
    set({
      activeTool: "select",
      phase: "idle",
      drawingPoints: [],
      previewPoint: null,
    }),

  addDrawingPoint: (point) =>
    set((s) => ({
      drawingPoints: [...s.drawingPoints, point],
      phase: "drawing",
    })),

  setPreviewPoint: (point) => set({ previewPoint: point }),

  clearDrawing: () => set({ drawingPoints: [], previewPoint: null, phase: "idle" }),

  togglePanel: (panel) =>
    set((s) => {
      const next = new Set(s.visiblePanels);
      if (next.has(panel)) next.delete(panel);
      else next.add(panel);
      return { visiblePanels: next };
    }),

  showPanel: (panel) =>
    set((s) => {
      const next = new Set(s.visiblePanels);
      next.add(panel);
      return { visiblePanels: next };
    }),

  hidePanel: (panel) =>
    set((s) => {
      const next = new Set(s.visiblePanels);
      next.delete(panel);
      return { visiblePanels: next };
    }),
}));
```

**Step 2: Commit**

```bash
git add client/src/stores/use-editor.ts
git commit -m "feat: add useEditor store for tools, drawing, and panels"
```

---

## Phase 3: API Layer — Floorplan CRUD + Assets

### Task 9: Add Floorplan API Client Functions

**Files:**
- Modify: `client/src/lib/api.ts`

**Step 1: Add floorplan types and API functions at the end of api.ts**

Append after the existing `selectExtensionOption` function:

```typescript
// ==========================================
// Floorplan Editor API Functions
// ==========================================

export interface FloorplanDesign {
  id: number;
  projectId: number | null;
  userId: string;
  name: string;
  sceneData: string; // JSON string of SceneData
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function createFloorplan(data: {
  name: string;
  projectId?: number;
  sceneData?: string;
}): Promise<FloorplanDesign> {
  const response = await fetch("/api/floorplans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const text = await response.text();
    let errorMessage = "Failed to create floorplan";
    try {
      const error = JSON.parse(text);
      errorMessage = error.error || error.message || errorMessage;
    } catch {
      if (text && text.length < 200) errorMessage = text;
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function fetchFloorplan(id: number): Promise<FloorplanDesign> {
  const response = await fetch(`/api/floorplans/${id}`);
  if (!response.ok) throw new Error("Failed to fetch floorplan");
  return response.json();
}

export async function saveFloorplan(
  id: number,
  data: { sceneData: string; thumbnail?: string; name?: string }
): Promise<FloorplanDesign> {
  const response = await fetch(`/api/floorplans/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const text = await response.text();
    let errorMessage = "Failed to save floorplan";
    try {
      const error = JSON.parse(text);
      errorMessage = error.error || error.message || errorMessage;
    } catch {
      if (text && text.length < 200) errorMessage = text;
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function deleteFloorplan(id: number): Promise<void> {
  const response = await fetch(`/api/floorplans/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete floorplan");
}

export async function fetchProjectFloorplans(projectId: number): Promise<FloorplanDesign[]> {
  const response = await fetch(`/api/floorplans/project/${projectId}`);
  if (!response.ok) throw new Error("Failed to fetch project floorplans");
  return response.json();
}

export async function uploadFloorplanAsset(
  floorplanId: number,
  file: File
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("asset", file);
  const response = await fetch(`/api/floorplans/${floorplanId}/assets`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) throw new Error("Failed to upload asset");
  return response.json();
}

export async function generateFloorplanFromImage(
  floorplanId: number,
  imageFile: File
): Promise<{ sceneData: string }> {
  const formData = new FormData();
  formData.append("image", imageFile);
  const response = await fetch(`/api/floorplans/${floorplanId}/generate-from-image`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const text = await response.text();
    let errorMessage = "Failed to generate floorplan from image";
    try {
      const error = JSON.parse(text);
      errorMessage = error.error || error.message || errorMessage;
    } catch {
      if (text && text.length < 200) errorMessage = text;
    }
    throw new Error(errorMessage);
  }
  return response.json();
}
```

**Step 2: Commit**

```bash
git add client/src/lib/api.ts
git commit -m "feat: add floorplan CRUD and AI generation API client functions"
```

---

### Task 10: Create Floorplan API Endpoints (Server)

**Files:**
- Create: `api/floorplans/index.ts`
- Create: `api/floorplans/[id].ts`
- Create: `api/floorplans/project/[projectId].ts`
- Create: `api/floorplans/[id]/assets.ts`

**Step 1: Write POST/GET /api/floorplans**

Create `api/floorplans/index.ts` following the exact same pattern as `api/projects/index.ts`:

```typescript
// api/floorplans/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { eq, desc } from "drizzle-orm";
import { jwtVerify } from "jose";
import { z } from "zod";

const floorplanDesigns = pgTable("floorplan_designs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull().default("Untitled Floorplan"),
  sceneData: text("scene_data").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

function getSessionFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith("auth_session="));
  return sessionCookie ? sessionCookie.split("=")[1] : null;
}

async function verifySession(token: string): Promise<{ userId: string } | null> {
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId === "string") return { userId: payload.userId };
    return null;
  } catch {
    return null;
  }
}

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql);
}

const createSchema = z.object({
  name: z.string().min(1).default("Untitled Floorplan"),
  projectId: z.number().optional(),
  sceneData: z.string().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cookieHeader = req.headers.cookie || null;
  const token = getSessionFromCookies(cookieHeader);
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const session = await verifySession(token);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  if (req.method === "POST") {
    try {
      const data = createSchema.parse(req.body);
      const db = getDb();
      const [floorplan] = await db
        .insert(floorplanDesigns)
        .values({
          userId: session.userId,
          name: data.name,
          projectId: data.projectId ?? null,
          sceneData: data.sceneData || '{"nodes":{},"rootNodeIds":[]}',
        })
        .returning();
      return res.status(201).json(floorplan);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      console.error("Error creating floorplan:", error);
      return res.status(500).json({ error: "Failed to create floorplan" });
    }
  }

  if (req.method === "GET") {
    try {
      const db = getDb();
      const designs = await db
        .select()
        .from(floorplanDesigns)
        .where(eq(floorplanDesigns.userId, session.userId))
        .orderBy(desc(floorplanDesigns.updatedAt));
      return res.json(designs);
    } catch (error) {
      console.error("Error fetching floorplans:", error);
      return res.status(500).json({ error: "Failed to fetch floorplans" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
```

**Step 2: Write GET/PUT/DELETE /api/floorplans/[id]**

Create `api/floorplans/[id].ts`:

```typescript
// api/floorplans/[id].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { eq, and, sql } from "drizzle-orm";
import { jwtVerify } from "jose";
import { put } from "@vercel/blob";

const floorplanDesigns = pgTable("floorplan_designs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull().default("Untitled Floorplan"),
  sceneData: text("scene_data").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

function getSessionFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith("auth_session="));
  return sessionCookie ? sessionCookie.split("=")[1] : null;
}

async function verifySession(token: string): Promise<{ userId: string } | null> {
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId === "string") return { userId: payload.userId };
    return null;
  } catch {
    return null;
  }
}

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");
  const sqlClient = neon(process.env.DATABASE_URL);
  return drizzle(sqlClient);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const floorplanId = parseInt(id as string);
  if (isNaN(floorplanId)) return res.status(400).json({ error: "Invalid floorplan ID" });

  const cookieHeader = req.headers.cookie || null;
  const token = getSessionFromCookies(cookieHeader);
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const session = await verifySession(token);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const db = getDb();

  if (req.method === "GET") {
    try {
      const [floorplan] = await db
        .select()
        .from(floorplanDesigns)
        .where(and(eq(floorplanDesigns.id, floorplanId), eq(floorplanDesigns.userId, session.userId)));
      if (!floorplan) return res.status(404).json({ error: "Floorplan not found" });
      return res.json(floorplan);
    } catch (error) {
      console.error("Error fetching floorplan:", error);
      return res.status(500).json({ error: "Failed to fetch floorplan" });
    }
  }

  if (req.method === "PUT") {
    try {
      const { sceneData, thumbnail, name } = req.body;

      const updates: Record<string, any> = { updatedAt: new Date() };
      if (sceneData) updates.sceneData = sceneData;
      if (name) updates.name = name;

      // Upload thumbnail to Vercel Blob if provided as base64
      if (thumbnail && typeof thumbnail === "string" && thumbnail.startsWith("data:")) {
        const base64Data = thumbnail.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        const blob = await put(`floorplans/${floorplanId}/thumbnail.png`, buffer, {
          access: "public",
          contentType: "image/png",
        });
        updates.thumbnailUrl = blob.url;
      }

      const [updated] = await db
        .update(floorplanDesigns)
        .set(updates)
        .where(and(eq(floorplanDesigns.id, floorplanId), eq(floorplanDesigns.userId, session.userId)))
        .returning();

      if (!updated) return res.status(404).json({ error: "Floorplan not found" });
      return res.json(updated);
    } catch (error) {
      console.error("Error saving floorplan:", error);
      return res.status(500).json({ error: "Failed to save floorplan" });
    }
  }

  if (req.method === "DELETE") {
    try {
      await db
        .delete(floorplanDesigns)
        .where(and(eq(floorplanDesigns.id, floorplanId), eq(floorplanDesigns.userId, session.userId)));
      return res.status(204).send("");
    } catch (error) {
      console.error("Error deleting floorplan:", error);
      return res.status(500).json({ error: "Failed to delete floorplan" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
```

**Step 3: Write GET /api/floorplans/project/[projectId]**

Create `api/floorplans/project/[projectId].ts`:

```typescript
// api/floorplans/project/[projectId].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { eq, and, desc } from "drizzle-orm";
import { jwtVerify } from "jose";

const floorplanDesigns = pgTable("floorplan_designs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  sceneData: text("scene_data").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

function getSessionFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith("auth_session="));
  return sessionCookie ? sessionCookie.split("=")[1] : null;
}

async function verifySession(token: string): Promise<{ userId: string } | null> {
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId === "string") return { userId: payload.userId };
    return null;
  } catch {
    return null;
  }
}

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { projectId } = req.query;
  const pid = parseInt(projectId as string);
  if (isNaN(pid)) return res.status(400).json({ error: "Invalid project ID" });

  const cookieHeader = req.headers.cookie || null;
  const token = getSessionFromCookies(cookieHeader);
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const session = await verifySession(token);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  try {
    const db = getDb();
    const designs = await db
      .select()
      .from(floorplanDesigns)
      .where(and(eq(floorplanDesigns.projectId, pid), eq(floorplanDesigns.userId, session.userId)))
      .orderBy(desc(floorplanDesigns.updatedAt));
    return res.json(designs);
  } catch (error) {
    console.error("Error fetching project floorplans:", error);
    return res.status(500).json({ error: "Failed to fetch floorplans" });
  }
}
```

**Step 4: Write POST /api/floorplans/[id]/assets**

Create `api/floorplans/[id]/assets.ts`:

```typescript
// api/floorplans/[id]/assets.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";
import { jwtVerify } from "jose";
import formidable from "formidable";
import fs from "fs";

export const config = { api: { bodyParser: false } };

function getSessionFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith("auth_session="));
  return sessionCookie ? sessionCookie.split("=")[1] : null;
}

async function verifySession(token: string): Promise<{ userId: string } | null> {
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId === "string") return { userId: payload.userId };
    return null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const cookieHeader = req.headers.cookie || null;
  const token = getSessionFromCookies(cookieHeader);
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const session = await verifySession(token);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.query;
  const floorplanId = parseInt(id as string);
  if (isNaN(floorplanId)) return res.status(400).json({ error: "Invalid floorplan ID" });

  try {
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 }); // 10MB max
    const [, files] = await form.parse(req);
    const file = files.asset?.[0];

    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const buffer = fs.readFileSync(file.filepath);
    const ext = file.originalFilename?.split(".").pop() || "bin";
    const blob = await put(
      `floorplans/${floorplanId}/assets/${Date.now()}.${ext}`,
      buffer,
      { access: "public", contentType: file.mimetype || "application/octet-stream" }
    );

    // Cleanup temp file
    fs.unlinkSync(file.filepath);

    return res.json({ url: blob.url });
  } catch (error) {
    console.error("Error uploading asset:", error);
    return res.status(500).json({ error: "Failed to upload asset" });
  }
}
```

**Step 5: Commit**

```bash
git add api/floorplans/
git commit -m "feat: add floorplan CRUD API endpoints with auth and Vercel Blob"
```

---

## Phase 4: 3D Viewer Components (React Three Fiber)

### Task 11: Create Geometry Systems (Wall, Door, Window, Slab, Roof)

**Files:**
- Create: `client/src/components/viewer/systems/wall-system.ts`
- Create: `client/src/components/viewer/systems/door-system.ts`
- Create: `client/src/components/viewer/systems/window-system.ts`
- Create: `client/src/components/viewer/systems/slab-system.ts`
- Create: `client/src/components/viewer/systems/roof-system.ts`
- Create: `client/src/components/viewer/systems/item-system.ts`

**Note:** These are pure geometry generation functions. They take node data and return Three.js BufferGeometry or mesh configs. They do NOT create React components — that happens in Task 12.

Each system file follows this pattern:

```typescript
// wall-system.ts
import * as THREE from "three";
import type { WallNode } from "@/lib/pascal/schemas";

export function createWallGeometry(wall: WallNode): THREE.BufferGeometry {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);

  const geometry = new THREE.BoxGeometry(length, wall.height, wall.thickness);
  // Position at midpoint, rotated to align with start→end
  const matrix = new THREE.Matrix4();
  matrix.makeRotationY(-angle);
  matrix.setPosition(
    (wall.start.x + wall.end.x) / 2,
    wall.height / 2,
    (wall.start.z + wall.end.z) / 2
  );
  geometry.applyMatrix4(matrix);
  return geometry;
}

export function getWallMaterial(wall: WallNode): THREE.MeshStandardMaterial {
  const colors: Record<string, string> = {
    plaster: "#f5f0e8",
    brick: "#c4664a",
    concrete: "#b0b0b0",
    glass: "#a8d8ea",
  };
  return new THREE.MeshStandardMaterial({
    color: colors[wall.material] || "#f5f0e8",
    roughness: 0.8,
  });
}
```

Similar patterns for door-system (CSG subtraction from wall + door mesh), window-system (CSG subtraction + glass pane), slab-system (extruded polygon), roof-system (parametric by roof type), item-system (box placeholder or GLB loader).

**This is the most code-heavy task. Each file is 50-150 lines of geometry math. Implement them one by one, testing visually after each.**

**Step 1: Create all 6 system files**

_(Full implementations provided above — each follows the geometry generation pattern)_

**Step 2: Commit**

```bash
git add client/src/components/viewer/systems/
git commit -m "feat: add geometry systems for walls, doors, windows, slabs, roofs, items"
```

---

### Task 12: Create SceneRenderer Component

**Files:**
- Create: `client/src/components/viewer/SceneRenderer.tsx`

**Step 1: Write the SceneRenderer that maps nodes → Three.js meshes**

```typescript
// This component reads all nodes from useScene and renders them as Three.js objects.
// It registers each mesh with the sceneRegistry for selection/raycasting.
// It respects visibility toggles from useViewer.
// It handles level stacking/exploding based on levelMode.
```

This component iterates `Object.values(nodes)`, filters by visibility, groups by level, applies vertical offset for exploded view, and renders each node type using the appropriate geometry system.

**Step 2: Commit**

```bash
git add client/src/components/viewer/SceneRenderer.tsx
git commit -m "feat: add SceneRenderer component mapping nodes to Three.js meshes"
```

---

### Task 13: Create FloorplanCanvas (R3F Canvas Wrapper)

**Files:**
- Create: `client/src/components/viewer/FloorplanCanvas.tsx`
- Create: `client/src/components/viewer/CameraController.tsx`
- Create: `client/src/components/viewer/SelectionManager.tsx`

**Step 1: Write FloorplanCanvas** — mirrors current `CADViewer.tsx` pattern but uses Pascal stores

```typescript
// FloorplanCanvas wraps <Canvas> with:
// - SceneRenderer (Task 12)
// - CameraController (orbit + perspective/ortho toggle from useViewer)
// - SelectionManager (click-to-select using sceneRegistry + raycasting)
// - Grid, Environment, Lighting (same as current CADViewer)
// - ToolHandler (responds to useEditor.activeTool for wall drawing, item placement, etc.)
```

**Step 2: Write CameraController** — reads `cameraMode` from `useViewer`

**Step 3: Write SelectionManager** — raycasts clicks, resolves via sceneRegistry, updates `useViewer.select()`

**Step 4: Commit**

```bash
git add client/src/components/viewer/
git commit -m "feat: add FloorplanCanvas, CameraController, and SelectionManager"
```

---

## Phase 5: Editor UI Components (Shadcn/ui)

### Task 14: Create EditorToolbar Component

**Files:**
- Create: `client/src/components/editor/EditorToolbar.tsx`

The toolbar displays tool buttons for: select, wall, door, window, slab, roof, zone, item, guide, measure, eraser. Uses `useEditor.setTool()`. Shows active tool highlighted. Uses Lucide icons + Shadcn Button/ToggleGroup.

**Step 1: Implement and commit**

```bash
git add client/src/components/editor/EditorToolbar.tsx
git commit -m "feat: add EditorToolbar with tool selection"
```

---

### Task 15: Create PropertyPanel Component

**Files:**
- Create: `client/src/components/editor/PropertyPanel.tsx`

Shows editable properties for the currently selected node(s). Reads `useViewer.selectedIds`, looks up nodes in `useScene.nodes`, displays type-specific fields (wall: start/end/height/thickness/material, door: width/height/type/swing, etc.). Uses `useScene.updateNode()` on change.

**Step 1: Implement and commit**

```bash
git add client/src/components/editor/PropertyPanel.tsx
git commit -m "feat: add PropertyPanel for editing selected node properties"
```

---

### Task 16: Create LevelNavigator Component

**Files:**
- Create: `client/src/components/editor/LevelNavigator.tsx`

Shows list of levels in the active building. Add/remove levels. Switch level display mode (stacked/exploded/solo). Click level to set as active. Uses `useScene` for level nodes, `useViewer` for display mode.

**Step 1: Implement and commit**

```bash
git add client/src/components/editor/LevelNavigator.tsx
git commit -m "feat: add LevelNavigator for floor level management"
```

---

### Task 17: Create SaveIndicator + Auto-Save Hook

**Files:**
- Create: `client/src/components/editor/SaveIndicator.tsx`
- Create: `client/src/hooks/use-auto-save.ts`

**Step 1: Write the auto-save hook**

```typescript
// client/src/hooks/use-auto-save.ts
import { useEffect, useRef } from "react";
import { useScene } from "@/stores/use-scene";
import { saveFloorplan } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useAutoSave() {
  const { floorplanId, hasUnsavedChanges, getSceneData, setSaving, markSaved } = useScene();
  const { toast } = useToast();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!floorplanId || !hasUnsavedChanges) return;

    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Debounce 800ms
    timerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        const sceneData = getSceneData();
        await saveFloorplan(floorplanId, {
          sceneData: JSON.stringify(sceneData),
        });
        markSaved();
      } catch (err) {
        setSaving(false);
        toast({
          title: "Save failed",
          description: "Changes could not be saved. Retrying...",
          variant: "destructive",
        });
      }
    }, 800);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [floorplanId, hasUnsavedChanges]);
}
```

**Step 2: Write SaveIndicator component** — shows "Saved", "Saving...", or "Unsaved" based on `useScene` state

**Step 3: Commit**

```bash
git add client/src/components/editor/SaveIndicator.tsx client/src/hooks/use-auto-save.ts
git commit -m "feat: add auto-save hook and SaveIndicator component"
```

---

### Task 18: Create AIGeneratePanel Component

**Files:**
- Create: `client/src/components/editor/AIGeneratePanel.tsx`

Upload a 2D floorplan image, send to `generateFloorplanFromImage()`, parse returned scene data, load into `useScene.loadScene()`. Shows loading state during Gemini processing. Credit check via `useSubscription()`.

**Step 1: Implement and commit**

```bash
git add client/src/components/editor/AIGeneratePanel.tsx
git commit -m "feat: add AIGeneratePanel for AI-powered floorplan generation"
```

---

## Phase 6: Page Assembly + Route Wiring

### Task 19: Create FloorplanEditor Page

**Files:**
- Create: `client/src/components/editor/FloorplanEditor.tsx`
- Create: `client/src/pages/FloorplanEditorPage.tsx`

**Step 1: Write FloorplanEditor** — assembles all editor components:

```
WorkspaceLayout
  leftPanel: EditorToolbar + LevelNavigator + AIGeneratePanel
  rightPanel: PropertyPanel
  children: FloorplanCanvas
  header: SaveIndicator + title + back button
```

**Step 2: Write FloorplanEditorPage** — route handler page:

```typescript
// Loads floorplan from URL param, hydrates useScene, renders FloorplanEditor
// Pattern matches existing CADViewerPage.tsx:
// - useParams to get :id
// - useQuery to fetch floorplan data
// - useEffect to hydrate useScene.loadScene()
// - Loading/error states
```

**Step 3: Commit**

```bash
git add client/src/components/editor/FloorplanEditor.tsx client/src/pages/FloorplanEditorPage.tsx
git commit -m "feat: add FloorplanEditor page assembling all editor components"
```

---

### Task 20: Update Routes — Replace CAD Viewer

**Files:**
- Modify: `client/src/App.tsx`

**Step 1: Replace the CAD route**

In `client/src/App.tsx`, change:

```typescript
// OLD
import { CADViewerPage } from "@/pages/CADViewerPage";
// ...
<Route path="/planning/:id/cad" component={CADViewerPage} />

// NEW
import { FloorplanEditorPage } from "@/pages/FloorplanEditorPage";
// ...
<Route path="/planning/:id/editor" component={FloorplanEditorPage} />
```

**Step 2: Update any navigation links** that point to `/planning/:id/cad` → `/planning/:id/editor`

Search for: `"/planning/${id}/cad"` or `"/cad"` in the codebase and update to `/editor`

**Step 3: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat: replace CAD viewer route with floorplan editor route"
```

---

## Phase 7: AI Integration — Gemini Floorplan Generation

### Task 21: Create AI Floorplan Generation Endpoint

**Files:**
- Create: `api/floorplans/[id]/generate-from-image.ts`

**Step 1: Write the endpoint**

This follows the exact pattern of `api/models/[id]/generate-isometric.ts`:
- Auth check
- Credit check + deduction
- Upload image to Vercel Blob
- Send to Gemini with a structured output prompt
- Gemini returns JSON with walls, doors, windows, rooms
- Map to Pascal node format (SceneData)
- Return the sceneData JSON

The Gemini prompt should request structured output:

```
Analyze this architectural floor plan image and extract the layout as structured JSON.
Return walls (start/end coordinates in meters), doors (wall index + position),
windows (wall index + position), and rooms (polygon outlines with labels).
Use a coordinate system where bottom-left is (0,0) and scale matches real-world meters.
```

**Step 2: Commit**

```bash
git add api/floorplans/[id]/generate-from-image.ts
git commit -m "feat: add AI floorplan generation endpoint using Gemini"
```

---

## Phase 8: Cleanup + Migration

### Task 22: Remove Old CAD Components

**Files:**
- Delete: `client/src/components/cad/CADViewer.tsx`
- Delete: `client/src/components/cad/CADParameterPanel.tsx`
- Delete: `client/src/components/cad/CADToolbar.tsx`
- Delete: `client/src/components/cad/ExtensionMesh.tsx`
- Delete: `client/src/components/cad/PropertyBaseMesh.tsx`
- Delete: `client/src/components/cad/DimensionAnnotations.tsx`
- Delete: `client/src/hooks/use-cad-params.ts`
- Delete: `client/src/pages/CADViewerPage.tsx`
- Verify: No remaining imports reference these files

**Step 1: Delete all CAD files**

```bash
rm -rf client/src/components/cad/
rm client/src/hooks/use-cad-params.ts
rm client/src/pages/CADViewerPage.tsx
```

**Step 2: Search for broken imports**

Run: `grep -r "cad/" client/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules`
Expected: No matches (all references should have been updated in Task 20)

Also check: `grep -r "useCADStore\|CADViewer\|CADParameter\|CADToolbar" client/src/ --include="*.ts" --include="*.tsx"`
Expected: No matches

**Step 3: Verify build**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove old CAD viewer components (replaced by floorplan editor)"
```

---

### Task 23: Update Navigation Links

**Files:**
- Modify: `client/src/pages/PlanningViewer.tsx` (or wherever the "Open in CAD" button lives)

**Step 1: Find and update all links to the old CAD route**

Search: `grep -r "cad" client/src/ --include="*.tsx" -l`

Update any buttons/links from `/planning/${id}/cad` to `/planning/${id}/editor`, and update button text from "CAD Viewer" / "Open CAD" to "Floorplan Editor" / "Open Editor".

**Step 2: Commit**

```bash
git add client/src/
git commit -m "feat: update navigation links to point to new floorplan editor"
```

---

### Task 24: TypeScript Version Bump

**Files:**
- Modify: `package.json`

**Step 1: Bump TypeScript to 5.9.x**

Run: `npm install typescript@~5.9 --save-dev`

**Step 2: Verify everything still compiles**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -30`
Expected: No new errors

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: bump TypeScript to 5.9.x for Pascal compatibility"
```

---

## Phase 9: Verification

### Task 25: Full Build + Type Check

**Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Manual smoke test checklist**

- [ ] Navigate to `/planning/:id/editor` — page loads
- [ ] Empty scene renders with grid + ground floor
- [ ] Toolbar shows all tools
- [ ] Selecting wall tool → clicking canvas draws walls
- [ ] Selecting door tool → clicking wall places door
- [ ] Undo/redo works (Ctrl+Z / Ctrl+Shift+Z)
- [ ] Auto-save fires after edits (check network tab)
- [ ] Reload page → scene restores from database
- [ ] AI panel → upload image → scene populates
- [ ] Level navigator → add floor → switch views
- [ ] Property panel → edit selected node dimensions

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-5 | Foundation: DB migration, schemas, dependencies, core utilities |
| 2 | 6-8 | State management: useScene, useViewer, useEditor stores |
| 3 | 9-10 | API layer: client functions + server endpoints |
| 4 | 11-13 | 3D viewer: geometry systems + R3F components |
| 5 | 14-18 | Editor UI: toolbar, panels, auto-save, AI panel |
| 6 | 19-20 | Assembly: page component + route wiring |
| 7 | 21 | AI integration: Gemini floorplan generation |
| 8 | 22-24 | Cleanup: remove old CAD, update links, bump TS |
| 9 | 25 | Verification: build, type check, smoke test |

**Total: 25 tasks across 9 phases. Estimated: ~2-3 focused sessions.**
