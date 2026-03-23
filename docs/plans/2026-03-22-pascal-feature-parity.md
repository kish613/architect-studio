# Pascal Feature Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring architect-studio's 3D viewer and editor to feature parity with the Pascal editor (https://github.com/pascalorg/editor), covering wall geometry accuracy, CSG cutouts, post-processing, selection system, interactive controls, zone visualization, item lighting, and performance tooling.

**Architecture:** We adopt Pascal's core patterns — dirty-node-driven geometry systems, CSG wall cutouts via three-bvh-csg, a typed event bus with per-node-type events, hierarchical selection with zone containment, and a frame-loop systems architecture — while keeping our existing Zustand stores, finish-resolver material system, and Vite/React setup.

**Tech Stack:** React Three Fiber, Three.js, three-bvh-csg (already installed), @react-three/postprocessing (already installed), Zustand + zundo (already installed), mitt (new dep for typed event bus)

---

## Phase 1: Wall Geometry — Mitering & CSG Cutouts

The biggest visual gap. Our walls are simple BoxGeometry with no junctions and no holes for doors/windows. Pascal uses extruded 2D shapes with mitered junctions and CSG boolean subtraction.

### Task 1.1: Wall Mitering System

**Files:**
- Create: `client/src/components/viewer/systems/wall-mitering.ts`
- Test: `client/src/components/viewer/systems/__tests__/wall-mitering.test.ts`

**Step 1: Write failing tests for junction detection**

```typescript
// wall-mitering.test.ts
import { describe, it, expect } from "vitest";
import { computeWallMiterData } from "../wall-mitering";
import type { WallNode } from "@/lib/pascal/schemas";

function makeWall(id: string, sx: number, sz: number, ex: number, ez: number, thickness = 0.15): WallNode {
  return {
    id, type: "wall", parentId: null, childIds: [], name: `wall-${id}`,
    visible: true, locked: false,
    start: { x: sx, y: 0, z: sz }, end: { x: ex, y: 0, z: ez },
    height: 2.7, thickness, material: "plaster",
    transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
  } as WallNode;
}

describe("wall mitering", () => {
  it("detects L-junction where two walls share an endpoint", () => {
    const walls = [
      makeWall("w1", 0, 0, 5, 0),  // horizontal
      makeWall("w2", 5, 0, 5, 5),  // vertical, shares (5,0)
    ];
    const data = computeWallMiterData(walls);
    expect(data.junctions.size).toBe(1);
  });

  it("detects T-junction where wall endpoint meets wall midpoint", () => {
    const walls = [
      makeWall("w1", 0, 0, 10, 0),  // long horizontal
      makeWall("w2", 5, 0, 5, 5),   // T from midpoint
    ];
    const data = computeWallMiterData(walls);
    expect(data.junctions.size).toBe(1);
  });

  it("returns miter points for L-junction", () => {
    const walls = [
      makeWall("w1", 0, 0, 5, 0),
      makeWall("w2", 5, 0, 5, 5),
    ];
    const data = computeWallMiterData(walls);
    const junctionKey = Array.from(data.junctions.keys())[0];
    const junction = data.junctions.get(junctionKey)!;
    expect(junction.wallIds.length).toBe(2);
    // Miter data should have left/right points for each wall at this junction
    const w1Data = data.junctionData.get("w1");
    expect(w1Data).toBeDefined();
    expect(w1Data!.end).toBeDefined(); // w1's end meets the junction
    expect(w1Data!.end!.left).toBeDefined();
    expect(w1Data!.end!.right).toBeDefined();
  });

  it("returns empty for isolated wall with no junctions", () => {
    const walls = [makeWall("w1", 0, 0, 5, 0)];
    const data = computeWallMiterData(walls);
    expect(data.junctions.size).toBe(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd client && npx vitest run src/components/viewer/systems/__tests__/wall-mitering.test.ts`
Expected: FAIL — module not found

**Step 3: Implement wall mitering**

```typescript
// wall-mitering.ts
import type { WallNode } from "@/lib/pascal/schemas";

interface Vec2 { x: number; z: number }

interface MiterPoint { left: Vec2; right: Vec2 }

interface WallEndpointMiter {
  start?: MiterPoint;
  end?: MiterPoint;
}

interface Junction {
  position: Vec2;
  wallIds: string[];
  isPassthrough: Map<string, boolean>; // wallId -> whether it passes through
}

export interface WallMiterData {
  junctions: Map<string, Junction>;       // junctionKey -> junction
  junctionData: Map<string, WallEndpointMiter>; // wallId -> miter data
}

const SNAP_TOLERANCE = 0.01;

function vecKey(p: Vec2): string {
  const sx = Math.round(p.x / SNAP_TOLERANCE) * SNAP_TOLERANCE;
  const sz = Math.round(p.z / SNAP_TOLERANCE) * SNAP_TOLERANCE;
  return `${sx.toFixed(3)},${sz.toFixed(3)}`;
}

function vec2Eq(a: Vec2, b: Vec2): boolean {
  return Math.abs(a.x - b.x) < SNAP_TOLERANCE && Math.abs(a.z - b.z) < SNAP_TOLERANCE;
}

function perpendicular(dir: Vec2): Vec2 {
  return { x: -dir.z, z: dir.x };
}

function normalize2(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.z * v.z);
  if (len < 1e-8) return { x: 0, z: 0 };
  return { x: v.x / len, z: v.z / len };
}

function wallDirection(wall: WallNode): Vec2 {
  return normalize2({ x: wall.end.x - wall.start.x, z: wall.end.z - wall.start.z });
}

function lineIntersection(
  p1: Vec2, d1: Vec2, p2: Vec2, d2: Vec2
): Vec2 | null {
  const det = d1.x * d2.z - d1.z * d2.x;
  if (Math.abs(det) < 1e-8) return null;
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  const t = (dx * d2.z - dz * d2.x) / det;
  return { x: p1.x + t * d1.x, z: p1.z + t * d1.z };
}

function pointOnSegment(wall: WallNode, p: Vec2): boolean {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 1e-8) return false;
  const t = ((p.x - wall.start.x) * dx + (p.z - wall.start.z) * dz) / (len * len);
  return t > SNAP_TOLERANCE / len && t < 1 - SNAP_TOLERANCE / len;
}

export function computeWallMiterData(walls: WallNode[]): WallMiterData {
  const junctions = new Map<string, Junction>();
  const junctionData = new Map<string, WallEndpointMiter>();

  // Phase 1: Detect endpoint-to-endpoint junctions
  const endpointMap = new Map<string, { wallId: string; which: "start" | "end" }[]>();
  for (const wall of walls) {
    for (const which of ["start", "end"] as const) {
      const p = wall[which];
      const key = vecKey(p);
      if (!endpointMap.has(key)) endpointMap.set(key, []);
      endpointMap.get(key)!.push({ wallId: wall.id, which });
    }
  }

  for (const [key, entries] of endpointMap) {
    if (entries.length < 2) continue;
    const firstEntry = entries[0];
    const firstWall = walls.find(w => w.id === firstEntry.wallId)!;
    const pos = firstWall[firstEntry.which];
    junctions.set(key, {
      position: { x: pos.x, z: pos.z },
      wallIds: entries.map(e => e.wallId),
      isPassthrough: new Map(entries.map(e => [e.wallId, false])),
    });
  }

  // Phase 2: Detect T-junctions (endpoint hits midpoint of another wall)
  for (const wall of walls) {
    for (const which of ["start", "end"] as const) {
      const p = wall[which];
      const key = vecKey(p);
      if (junctions.has(key)) continue; // already an endpoint junction

      for (const other of walls) {
        if (other.id === wall.id) continue;
        if (pointOnSegment(other, p)) {
          const junction: Junction = junctions.get(key) ?? {
            position: { x: p.x, z: p.z },
            wallIds: [],
            isPassthrough: new Map(),
          };
          if (!junction.wallIds.includes(wall.id)) junction.wallIds.push(wall.id);
          if (!junction.wallIds.includes(other.id)) junction.wallIds.push(other.id);
          junction.isPassthrough.set(other.id, true); // other wall passes through
          junction.isPassthrough.set(wall.id, false);
          junctions.set(key, junction);
        }
      }
    }
  }

  // Phase 3: Compute miter points for each wall at each junction
  for (const [, junction] of junctions) {
    if (junction.wallIds.length < 2) continue;

    const wallsAtJunction = junction.wallIds
      .map(id => walls.find(w => w.id === id)!)
      .filter(Boolean);

    // Sort walls by outgoing angle from junction
    const sorted = wallsAtJunction.map(w => {
      const atStart = vec2Eq(junction.position, { x: w.start.x, z: w.start.z });
      const dir = atStart
        ? wallDirection(w)
        : normalize2({ x: w.start.x - w.end.x, z: w.start.z - w.end.z });
      const angle = Math.atan2(dir.z, dir.x);
      return { wall: w, dir, angle, atStart };
    }).sort((a, b) => a.angle - b.angle);

    for (let i = 0; i < sorted.length; i++) {
      const curr = sorted[i];
      const next = sorted[(i + 1) % sorted.length];

      if (junction.isPassthrough.get(curr.wall.id)) continue;

      const halfT1 = (curr.wall.thickness ?? 0.15) / 2;
      const halfT2 = (next.wall.thickness ?? 0.15) / 2;

      const perp1 = perpendicular(curr.dir);
      const perp2 = perpendicular(next.dir);

      // Right edge of current wall, left edge of next wall
      const p1Right = { x: junction.position.x + perp1.x * halfT1, z: junction.position.z + perp1.z * halfT1 };
      const p2Left = { x: junction.position.x - perp2.x * halfT2, z: junction.position.z - perp2.z * halfT2 };

      const intersection = lineIntersection(p1Right, curr.dir, p2Left, next.dir);

      if (intersection) {
        // Store miter point for current wall's right side and next wall's left side
        const endKey = curr.atStart ? "start" : "end";
        if (!junctionData.has(curr.wall.id)) junctionData.set(curr.wall.id, {});
        const currData = junctionData.get(curr.wall.id)!;
        if (!currData[endKey]) currData[endKey] = { left: junction.position, right: junction.position };
        currData[endKey]!.right = intersection;

        const nextEndKey = next.atStart ? "start" : "end";
        if (!junctionData.has(next.wall.id)) junctionData.set(next.wall.id, {});
        const nextData = junctionData.get(next.wall.id)!;
        if (!nextData[nextEndKey]) nextData[nextEndKey] = { left: junction.position, right: junction.position };
        nextData[nextEndKey]!.left = intersection;
      }
    }
  }

  return { junctions, junctionData };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd client && npx vitest run src/components/viewer/systems/__tests__/wall-mitering.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add client/src/components/viewer/systems/wall-mitering.ts client/src/components/viewer/systems/__tests__/wall-mitering.test.ts
git commit -m "feat: add wall mitering system for junction geometry"
```

---

### Task 1.2: Extruded Wall Geometry with Miter Points

**Files:**
- Modify: `client/src/components/viewer/systems/wall-system.ts`
- Test: `client/src/components/viewer/systems/__tests__/wall-system.test.ts`

**Step 1: Write failing test for extruded wall shape**

```typescript
// wall-system.test.ts
import { describe, it, expect } from "vitest";
import { createExtrudedWallGeometry } from "../wall-system";
import type { WallNode } from "@/lib/pascal/schemas";

function makeWall(sx: number, sz: number, ex: number, ez: number): WallNode {
  return {
    id: "w1", type: "wall", parentId: null, childIds: [], name: "wall",
    visible: true, locked: false,
    start: { x: sx, y: 0, z: sz }, end: { x: ex, y: 0, z: ez },
    height: 2.7, thickness: 0.15, material: "plaster",
    transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
  } as WallNode;
}

describe("extruded wall geometry", () => {
  it("creates geometry with correct vertex count for simple wall", () => {
    const wall = makeWall(0, 0, 5, 0);
    const geo = createExtrudedWallGeometry(wall);
    expect(geo).toBeDefined();
    expect(geo.attributes.position).toBeDefined();
    // Extruded rectangle should have vertices
    expect(geo.attributes.position.count).toBeGreaterThan(0);
    geo.dispose();
  });

  it("geometry bounding box matches wall dimensions", () => {
    const wall = makeWall(0, 0, 5, 0);
    const geo = createExtrudedWallGeometry(wall);
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    // Width should be ~5m, height ~2.7m, thickness ~0.15m
    expect(box.max.x - box.min.x).toBeCloseTo(5, 0);
    expect(box.max.y - box.min.y).toBeCloseTo(2.7, 0);
    geo.dispose();
  });
});
```

**Step 2: Run to confirm failure**

Run: `cd client && npx vitest run src/components/viewer/systems/__tests__/wall-system.test.ts`

**Step 3: Implement extruded wall geometry**

Replace `createWallGeometry` in `wall-system.ts` with an extruded shape approach:

```typescript
// Add to wall-system.ts
import * as THREE from "three";
import type { WallNode } from "@/lib/pascal/schemas";
import type { WallEndpointMiter } from "./wall-mitering";
import { createFinishMaterial } from "@/lib/pascal/finish-resolver";

export function createExtrudedWallGeometry(
  wall: WallNode,
  miterData?: WallEndpointMiter
): THREE.BufferGeometry {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  if (length < 0.001) return new THREE.BufferGeometry();

  const halfThick = (wall.thickness ?? 0.15) / 2;
  const dir = { x: dx / length, z: dz / length };
  const perp = { x: -dir.z, z: dir.x };

  // Default corner points (no mitering)
  let startLeft = { x: wall.start.x - perp.x * halfThick, z: wall.start.z - perp.z * halfThick };
  let startRight = { x: wall.start.x + perp.x * halfThick, z: wall.start.z + perp.z * halfThick };
  let endLeft = { x: wall.end.x - perp.x * halfThick, z: wall.end.z - perp.z * halfThick };
  let endRight = { x: wall.end.x + perp.x * halfThick, z: wall.end.z + perp.z * halfThick };

  // Apply miter points if available
  if (miterData?.start) {
    startLeft = miterData.start.left;
    startRight = miterData.start.right;
  }
  if (miterData?.end) {
    endLeft = miterData.end.left;
    endRight = miterData.end.right;
  }

  // Create 2D footprint shape (in world XZ)
  const shape = new THREE.Shape();
  shape.moveTo(startLeft.x, startLeft.z);
  shape.lineTo(endLeft.x, endLeft.z);
  shape.lineTo(endRight.x, endRight.z);
  shape.lineTo(startRight.x, startRight.z);
  shape.closePath();

  // Extrude vertically
  const height = wall.height ?? 2.7;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
  });

  // Rotate so extrusion goes along Y axis (up) instead of Z
  geometry.rotateX(-Math.PI / 2);

  return geometry;
}

// Keep existing exports but update createWallGeometry to call the new function
export function createWallGeometry(wall: WallNode, miterData?: WallEndpointMiter): THREE.BufferGeometry {
  return createExtrudedWallGeometry(wall, miterData);
}
```

**Step 4: Run tests**

Run: `cd client && npx vitest run src/components/viewer/systems/__tests__/wall-system.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add client/src/components/viewer/systems/wall-system.ts client/src/components/viewer/systems/__tests__/wall-system.test.ts
git commit -m "feat: replace BoxGeometry walls with extruded shapes supporting miter points"
```

---

### Task 1.3: CSG Cutout System for Doors & Windows

**Files:**
- Create: `client/src/components/viewer/systems/wall-csg.ts`
- Modify: `client/src/components/viewer/systems/wall-system.ts`
- Modify: `client/src/components/viewer/systems/door-system.ts`
- Modify: `client/src/components/viewer/systems/window-system.ts`
- Test: `client/src/components/viewer/systems/__tests__/wall-csg.test.ts`

**Step 1: Write failing test for CSG subtraction**

```typescript
// wall-csg.test.ts
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { createCutoutBrush, subtractCutouts } from "../wall-csg";

describe("wall CSG cutouts", () => {
  it("creates a cutout brush from dimensions", () => {
    const brush = createCutoutBrush(0.9, 2.1, 0.15, new THREE.Vector3(2.5, 1.05, 0));
    expect(brush).toBeDefined();
    brush.geometry.computeBoundingBox();
    const box = brush.geometry.boundingBox!;
    expect(box.max.x - box.min.x).toBeCloseTo(0.9, 1);
    expect(box.max.y - box.min.y).toBeCloseTo(2.1, 1);
    brush.geometry.dispose();
  });

  it("subtractCutouts returns geometry with fewer vertices after subtraction", () => {
    // Simple wall box
    const wallGeo = new THREE.BoxGeometry(5, 2.7, 0.15);
    const cutout = createCutoutBrush(0.9, 2.1, 0.3, new THREE.Vector3(0, 1.05, 0));
    const result = subtractCutouts(wallGeo, [cutout]);
    expect(result).toBeDefined();
    expect(result.attributes.position.count).toBeGreaterThan(0);
    // The result should have more faces than original (hole adds faces)
    expect(result.attributes.position.count).toBeGreaterThan(wallGeo.attributes.position.count);
    wallGeo.dispose();
    result.dispose();
  });
});
```

**Step 2: Run to confirm failure**

**Step 3: Implement CSG cutout system**

```typescript
// wall-csg.ts
import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";

// Reuse single evaluator for performance (matches Pascal pattern)
const csgEvaluator = new Evaluator();

export function createCutoutBrush(
  width: number,
  height: number,
  wallThickness: number,
  position: THREE.Vector3
): Brush {
  // Cutout extends 1m deep to ensure clean cut through any wall thickness
  const depth = Math.max(wallThickness * 2, 1.0);
  const geometry = new THREE.BoxGeometry(width, height, depth);
  geometry.translate(position.x, position.y, position.z);
  geometry.computeBoundsTree();
  return new Brush(geometry);
}

export function subtractCutouts(
  wallGeometry: THREE.BufferGeometry,
  cutoutBrushes: Brush[]
): THREE.BufferGeometry {
  if (cutoutBrushes.length === 0) return wallGeometry;

  let resultBrush = new Brush(wallGeometry.clone());
  resultBrush.geometry.computeBoundsTree();

  for (const cutout of cutoutBrushes) {
    const newResult = csgEvaluator.evaluate(resultBrush, cutout, SUBTRACTION);
    if (resultBrush.geometry !== wallGeometry) {
      resultBrush.geometry.dispose();
    }
    resultBrush = newResult;
    resultBrush.geometry.computeBoundsTree();
  }

  const finalGeo = resultBrush.geometry;
  return finalGeo;
}
```

**Step 4: Add cutout generation to door-system.ts and window-system.ts**

Add to `door-system.ts`:

```typescript
export function createDoorCutoutBrush(door: DoorNode, wallThickness: number): Brush {
  const w = door.width ?? 0.9;
  const h = door.height ?? 2.1;
  return createCutoutBrush(w, h, wallThickness, new THREE.Vector3(0, h / 2, 0));
}
```

Add to `window-system.ts`:

```typescript
export function createWindowCutoutBrush(win: WindowNode, wallThickness: number): Brush {
  const w = win.width ?? 1.2;
  const h = win.height ?? 1.2;
  const sillH = win.sillHeight ?? 0.9;
  return createCutoutBrush(w, h, wallThickness, new THREE.Vector3(0, sillH + h / 2, 0));
}
```

**Step 5: Integrate CSG into wall rendering (SceneRenderer.tsx)**

Modify `WallMesh` to collect cutout brushes from child doors/windows and subtract them from the wall geometry before rendering. When a door or window node changes, its parent wall must be found and marked dirty.

**Step 6: Run tests, commit**

```bash
git add client/src/components/viewer/systems/wall-csg.ts \
  client/src/components/viewer/systems/__tests__/wall-csg.test.ts \
  client/src/components/viewer/systems/door-system.ts \
  client/src/components/viewer/systems/window-system.ts
git commit -m "feat: add CSG cutout system for door/window holes in walls"
```

---

### Task 1.4: Dirty Cascade — Door/Window Changes Rebuild Parent Wall

**Files:**
- Modify: `client/src/stores/use-scene.ts`
- Modify: `client/src/components/viewer/SceneRenderer.tsx`

**Step 1: Add dirty cascade logic to `updateNode`**

In `use-scene.ts`, when a node of type `door` or `window` is updated, also mark its parent wall as dirty:

```typescript
updateNode: (nodeId, changes) => {
  set((state) => {
    const existing = state.nodes[nodeId];
    if (!existing) return state;

    const updated = { ...existing, ...changes, type: existing.type } as AnyNode;
    eventBus.emit("node:updated", { nodeId, changes });

    const dirtyNodeIds = new Set(state.dirtyNodeIds);
    dirtyNodeIds.add(nodeId);

    // Dirty cascade: if a door/window changes, mark parent wall dirty
    if ((existing.type === "door" || existing.type === "window") && existing.parentId) {
      dirtyNodeIds.add(existing.parentId);
    }

    return {
      nodes: { ...state.nodes, [nodeId]: updated },
      dirtyNodeIds,
      hasUnsavedChanges: true,
    };
  });
},
```

Also add same logic to `deleteNode` and `addNode`.

**Step 2: In SceneRenderer, use dirtyNodeIds to rebuild wall geometry only when dirty**

Add a `useMemo` dependency on `dirtyNodeIds` for wall geometry that has child openings, or switch to a useEffect-based geometry update like Pascal does.

**Step 3: Commit**

```bash
git commit -m "feat: add dirty cascade — door/window changes trigger parent wall rebuild"
```

---

### Task 1.5: Integrate Wall Mitering into SceneRenderer

**Files:**
- Modify: `client/src/components/viewer/SceneRenderer.tsx`

**Step 1: Compute miter data once when walls change**

```typescript
// In SceneRenderer, add:
import { computeWallMiterData } from "./systems/wall-mitering";

// In the component body:
const miterData = useMemo(() => computeWallMiterData(walls), [walls]);
```

**Step 2: Pass miter data to each WallMesh**

```typescript
<WallMesh node={wall} miterData={miterData.junctionData.get(wall.id)} />
```

**Step 3: Update WallMesh to use miter data**

```typescript
function WallMesh({ node, miterData }: { node: WallNode; miterData?: WallEndpointMiter }) {
  // ...
  const geometry = useMemo(() => createWallGeometry(node, miterData), [node, miterData]);
  // ...
}
```

**Step 4: Verify visually, commit**

```bash
git commit -m "feat: integrate wall mitering into scene renderer"
```

---

## Phase 2: Enhanced Door & Window Geometry

Replace our simple 2-box door/window with Pascal's fully procedural geometry.

### Task 2.1: Procedural Door Geometry (Segments, Frame, Hardware)

**Files:**
- Rewrite: `client/src/components/viewer/systems/door-system.ts`
- Test: `client/src/components/viewer/systems/__tests__/door-system.test.ts`

**Step 1: Update DoorNode schema to support Pascal fields**

In `shared/pascal-scene.ts`, extend `doorNodeSchema`:

```typescript
export const doorSegmentSchema = z.object({
  type: z.enum(["panel", "glass", "empty"]).default("panel"),
  heightRatio: z.number().default(1),
  columnRatios: z.array(z.number()).default([1]),
  dividerThickness: z.number().default(0.03),
  panelDepth: z.number().default(0.01),
  panelInset: z.number().default(0.04),
});

export const doorNodeSchema = baseNodeSchema.extend({
  type: z.literal("door"),
  wallId: z.string().uuid(),
  position: z.number().default(0.5), // parametric t along wall
  width: z.number().default(0.9),
  height: z.number().default(2.1),
  doorType: z.enum(["single", "double", "sliding", "french", "bifold"]).default("single"),
  swing: z.enum(["left", "right"]).default("left"),
  // New Pascal fields:
  frameThickness: z.number().default(0.05),
  frameDepth: z.number().default(0.07),
  threshold: z.boolean().default(true),
  thresholdHeight: z.number().default(0.02),
  hingesSide: z.enum(["left", "right"]).default("left"),
  swingDirection: z.enum(["inward", "outward"]).default("inward"),
  segments: z.array(doorSegmentSchema).default([
    { type: "panel", heightRatio: 0.3, columnRatios: [1], dividerThickness: 0.03, panelDepth: 0.01, panelInset: 0.04 },
    { type: "panel", heightRatio: 0.7, columnRatios: [1], dividerThickness: 0.03, panelDepth: 0.01, panelInset: 0.04 },
  ]),
  contentPadding: z.tuple([z.number(), z.number()]).default([0.04, 0.04]),
  handle: z.boolean().default(true),
  handleHeight: z.number().default(1.05),
  handleSide: z.enum(["left", "right"]).default("right"),
  transform: transformSchema.default({}),
});
```

**Step 2: Rebuild `createDoorGeometries` to produce frame + leaf + hardware**

Build the geometry tree programmatically: frame posts (left/right/top), threshold strip, door leaf from segments array with column subdivisions, handle box, hinge cylinders. Return a `THREE.Group` rather than individual geometries.

**Step 3: Write tests for segment geometry calculations**

**Step 4: Run tests, commit**

```bash
git commit -m "feat: procedural door geometry with segments, frame, and hardware"
```

---

### Task 2.2: Procedural Window Geometry (Pane Grid, Sill, Dividers)

**Files:**
- Rewrite: `client/src/components/viewer/systems/window-system.ts`
- Modify: `shared/pascal-scene.ts` (extend WindowNode)
- Test: `client/src/components/viewer/systems/__tests__/window-system.test.ts`

**Step 1: Update WindowNode schema with Pascal fields**

```typescript
export const windowNodeSchema = baseNodeSchema.extend({
  type: z.literal("window"),
  wallId: z.string().uuid(),
  position: z.number().default(0.5),
  width: z.number().default(1.2),
  height: z.number().default(1.2),
  sillHeight: z.number().default(0.9),
  windowType: z.enum(["fixed", "casement", "sash", "sliding", "bay", "skylight"]).default("casement"),
  // New Pascal fields:
  frameThickness: z.number().default(0.05),
  frameDepth: z.number().default(0.07),
  columnRatios: z.array(z.number()).default([1]),
  rowRatios: z.array(z.number()).default([1]),
  columnDividerThickness: z.number().default(0.03),
  rowDividerThickness: z.number().default(0.03),
  sill: z.boolean().default(true),
  sillDepth: z.number().default(0.08),
  sillThickness: z.number().default(0.03),
  transform: transformSchema.default({}),
});
```

**Step 2: Implement procedural window geometry**

Build: 4 frame members, column dividers, row dividers, individual glass panes from `columnRatios × rowRatios`, sill protrusion.

**Step 3: Tests, commit**

```bash
git commit -m "feat: procedural window geometry with pane grid, dividers, and sill"
```

---

## Phase 3: Event Bus Enhancement & Node Events

Pascal's event bus is richer than ours — per-node-type events with pointer interactions.

### Task 3.1: Extend Event Bus with Per-Node-Type Events

**Files:**
- Modify: `client/src/lib/pascal/event-bus.ts`

**Step 1: Add Pascal-style events**

```typescript
// Extend the EventMap with per-node-type pointer events:
type NodePointerEvent = { nodeId: string; point: { x: number; y: number; z: number } };

type EventMap = {
  // Existing events...
  "node:created": { node: AnyNode };
  "node:updated": { nodeId: string; changes: Partial<AnyNode> };
  "node:deleted": { nodeId: string; type: NodeType };
  "selection:changed": { nodeIds: string[] };
  "tool:changed": { tool: string };
  "scene:loaded": { nodeCount: number };
  "scene:saved": { timestamp: number };
  "scene:dirty": { dirtyNodeIds: string[] };

  // New: per-node-type pointer events (matching Pascal)
  "wall:click": NodePointerEvent;
  "wall:enter": NodePointerEvent;
  "wall:leave": NodePointerEvent;
  "door:click": NodePointerEvent;
  "door:enter": NodePointerEvent;
  "door:leave": NodePointerEvent;
  "window:click": NodePointerEvent;
  "window:enter": NodePointerEvent;
  "window:leave": NodePointerEvent;
  "item:click": NodePointerEvent;
  "item:enter": NodePointerEvent;
  "item:leave": NodePointerEvent;
  "zone:click": NodePointerEvent;
  "zone:enter": NodePointerEvent;
  "zone:leave": NodePointerEvent;
  "slab:click": NodePointerEvent;
  "grid:click": { point: { x: number; y: number; z: number } };
  "grid:move": { point: { x: number; y: number; z: number } };

  // Camera events
  "camera:view": { preset: string };
  "camera:capture": {};
  "camera:top-view": {};
};
```

**Step 2: Commit**

```bash
git commit -m "feat: extend event bus with per-node-type pointer events"
```

---

### Task 3.2: Create useNodeEvents Hook

**Files:**
- Create: `client/src/hooks/use-node-events.ts`

Implement a hook that emits typed events when pointer interactions happen on a registered mesh:

```typescript
// use-node-events.ts
import { useEffect, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { eventBus } from "@/lib/pascal/event-bus";
import type { NodeType } from "@/lib/pascal/schemas";
import { useViewer } from "@/stores/use-viewer";

export function useNodeEvents(
  nodeId: string,
  nodeType: NodeType,
  meshRef: React.RefObject<THREE.Object3D | null>
) {
  const setHovered = useViewer((s) => s.setHovered);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const onPointerEnter = (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(nodeId);
      const p = e.point;
      eventBus.emit(`${nodeType}:enter` as any, { nodeId, point: { x: p.x, y: p.y, z: p.z } });
    };

    const onPointerLeave = (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(null);
      const p = e.point;
      eventBus.emit(`${nodeType}:leave` as any, { nodeId, point: { x: p.x, y: p.y, z: p.z } });
    };

    // R3F event handlers are set via JSX props, not addEventListener
    // This hook provides the handlers to be spread onto the mesh
  }, [nodeId, nodeType, meshRef, setHovered]);
}
```

**Step 3: Commit**

```bash
git commit -m "feat: add useNodeEvents hook for typed per-node pointer events"
```

---

## Phase 4: Selection System Upgrade

### Task 4.1: Hierarchical Selection with Guard Logic

**Files:**
- Modify: `client/src/stores/use-viewer.ts`

**Step 1: Add hierarchical selection guard**

When `activeBuildingId` changes, reset `activeLevelId` and `activeZoneId`. When `activeLevelId` changes, reset `activeZoneId` and `selectedIds`. When `activeZoneId` changes, reset `selectedIds`.

```typescript
setActiveBuilding: (id) => set({
  activeBuildingId: id,
  activeLevelId: null,
  activeZoneId: null,
  selectedIds: [],
  hoveredId: null,
}),
setActiveLevel: (id) => set({
  activeLevelId: id,
  activeZoneId: null,
  selectedIds: [],
  hoveredId: null,
}),
setActiveZone: (id) => set({
  activeZoneId: id,
  selectedIds: [],
  hoveredId: null,
}),
```

**Step 2: Commit**

```bash
git commit -m "feat: hierarchical selection guard — parent change resets children"
```

---

### Task 4.2: Selection Outline Effects (Post-Processing)

**Files:**
- Modify: `client/src/components/viewer/FloorplanCanvas.tsx`
- Create: `client/src/components/viewer/systems/selection-outliner.ts`

**Step 1: Replace wireframe bounding box with outline post-processing**

Use `@react-three/postprocessing` Outline effect (already available in our deps):

```typescript
import { Outline } from "@react-three/postprocessing";

// In PostProcessing component:
function PostProcessing() {
  const selectedIds = useViewer((s) => s.selectedIds);
  const hoveredId = useViewer((s) => s.hoveredId);

  const selectedObjects = useMemo(() => {
    return selectedIds
      .map(id => sceneRegistry.getObject(id))
      .filter(Boolean) as THREE.Object3D[];
  }, [selectedIds]);

  const hoveredObjects = useMemo(() => {
    if (!hoveredId) return [];
    const obj = sceneRegistry.getObject(hoveredId);
    return obj ? [obj] : [];
  }, [hoveredId]);

  return (
    <EffectComposer>
      <N8AO aoRadius={0.5} intensity={2} distanceFalloff={1} />
      {selectedObjects.length > 0 && (
        <Outline
          selection={selectedObjects}
          edgeStrength={3}
          visibleEdgeColor={0xffffff}
          hiddenEdgeColor={0xffaa00}
          blur
        />
      )}
      {hoveredObjects.length > 0 && (
        <Outline
          selection={hoveredObjects}
          edgeStrength={2}
          visibleEdgeColor={0x00ccff}
          hiddenEdgeColor={0xffaa00}
          pulseSpeed={0.5}
          blur
        />
      )}
      <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.4} intensity={0.15} />
      <Vignette darkness={0.3} offset={0.3} />
    </EffectComposer>
  );
}
```

**Step 2: Remove wireframe bounding box from ItemModelMesh**

Remove the `<boxGeometry>` + `<meshBasicMaterial wireframe>` selection indicator in `SceneRenderer.tsx:226-230`.

**Step 3: Commit**

```bash
git commit -m "feat: replace wireframe selection with outline post-processing effects"
```

---

## Phase 5: Level Display System with Animated Transitions

### Task 5.1: Lerp-Animated Level Positioning

**Files:**
- Create: `client/src/components/viewer/systems/level-system.tsx`
- Modify: `client/src/components/viewer/SceneRenderer.tsx`

**Step 1: Create LevelSystem R3F component**

A component that runs in the R3F frame loop, smoothly lerping level group Y positions toward their targets based on the current `levelMode`:

```typescript
// level-system.tsx
import { useFrame } from "@react-three/fiber";
import { useViewer } from "@/stores/use-viewer";
import { useScene } from "@/stores/use-scene";
import { sceneRegistry } from "@/lib/pascal/scene-registry";
import type { LevelNode } from "@/lib/pascal/schemas";
import * as THREE from "three";

const EXPLODED_GAP = 5;

export function LevelSystem() {
  const levelMode = useViewer((s) => s.levelMode);
  const explodedSpacing = useViewer((s) => s.explodedSpacing);
  const activeLevelId = useViewer((s) => s.activeLevelId);
  const nodes = useScene((s) => s.nodes);

  const levels = Object.values(nodes).filter(
    (n): n is LevelNode => n.type === "level"
  ).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1); // Clamp for tab backgrounding

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const obj = sceneRegistry.getObject(level.id);
      if (!obj) continue;

      // Compute target Y
      let targetY = level.elevation ?? 0;
      if (levelMode === "exploded") {
        targetY += i * (explodedSpacing ?? EXPLODED_GAP);
      }

      // Solo mode: hide non-selected levels
      const visible = levelMode !== "solo" || level.id === activeLevelId || !activeLevelId;
      obj.visible = visible;

      // Smooth lerp toward target
      obj.position.y = THREE.MathUtils.lerp(obj.position.y, targetY, dt * 12);
    }
  });

  return null;
}
```

**Step 2: Add `<LevelSystem />` to FloorplanCanvas SceneContent**

**Step 3: Remove static Y-offset calculation from SceneRenderer**

**Step 4: Commit**

```bash
git commit -m "feat: add lerp-animated level positioning system"
```

---

## Phase 6: Zone Visualization

### Task 6.1: Zone Renderer with Animated Opacity

**Files:**
- Create: `client/src/components/viewer/systems/zone-system.tsx`
- Modify: `client/src/components/viewer/SceneRenderer.tsx`

**Step 1: Create ZoneSystem**

Render zones as semi-transparent floor polygons and wall outlines. Animate opacity on hover with 50ms exit debounce. Add DOM label pins centered above each zone.

The zone geometry is built from the zone's `points` array as an extruded polygon (thin, ~0.05m) placed at floor level. Material uses `MeshBasicMaterial` with animated opacity.

**Step 2: Commit**

```bash
git commit -m "feat: add zone visualization with animated opacity and label pins"
```

---

## Phase 7: Interactive Item Controls

### Task 7.1: Interactive Controls Overlay System

**Files:**
- Create: `client/src/components/viewer/systems/interactive-system.tsx`
- Modify: `shared/pascal-scene.ts` (extend ItemNode with controls/effects)

**Step 1: Add control/effect fields to ItemNode schema**

```typescript
const itemControlSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("toggle"), label: z.string().optional() }),
  z.object({
    kind: z.literal("slider"),
    min: z.number().default(0),
    max: z.number().default(1),
    step: z.number().default(0.1),
    label: z.string().optional(),
  }),
  z.object({
    kind: z.literal("temperature"),
    min: z.number().default(16),
    max: z.number().default(30),
    unit: z.enum(["C", "F"]).default("C"),
  }),
]);

const itemEffectSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("animation"),
    clips: z.object({
      on: z.string().optional(),
      off: z.string().optional(),
      loop: z.string().optional(),
    }),
  }),
  z.object({
    kind: z.literal("light"),
    color: z.string().default("#fff2c8"),
    intensityRange: z.tuple([z.number(), z.number()]).default([0, 2]),
    distance: z.number().default(5),
    offset: z.tuple([z.number(), z.number(), z.number()]).default([0, 0.3, 0]),
  }),
]);
```

Add to `itemNodeSchema`:
```typescript
controls: z.array(itemControlSchema).default([]),
effects: z.array(itemEffectSchema).default([]),
controlValues: z.array(z.number()).default([]),
```

**Step 2: Create InteractiveSystem component**

Renders HTML overlays (via R3F `<Html>`) above items that have controls. Each overlay shows toggle buttons, sliders, or temperature dials. Positioned 0.3m above the item using `<Html occlude>`.

**Step 3: Commit**

```bash
git commit -m "feat: add interactive item controls overlay system"
```

---

## Phase 8: Item Light Pool

### Task 8.1: Dynamic Light Pool for Items

**Files:**
- Create: `client/src/components/viewer/systems/item-light-system.tsx`
- Create: `client/src/stores/use-item-light-pool.ts`

**Step 1: Create Zustand store for light registrations**

Map of nodeId → { effect config, toggle/slider indices, min/max }.

**Step 2: Create ItemLightSystem component**

Pool of 12 reusable `<pointLight>` components. Each frame:
- Score registered lights by distance/angle from camera
- Assign top 12 to pool slots
- Lerp intensity based on toggle/slider control values
- Position = item world position + offset

**Step 3: Commit**

```bash
git commit -m "feat: add dynamic item light pool with camera-prioritized allocation"
```

---

## Phase 9: Spatial Grid & Placement Validation

### Task 9.1: Floor Spatial Grid

**Files:**
- Create: `client/src/lib/pascal/spatial-grid.ts`
- Test: `client/src/lib/pascal/__tests__/spatial-grid.test.ts`

**Step 1: Implement cell-based spatial grid**

Cell size 0.5m. Methods: `insert(id, position, rotation, dimensions)`, `remove(id)`, `update(id, ...)`, `canPlace(position, rotation, dimensions, ignoreIds)`, `queryRadius(point, radius)`.

**Step 2: Tests for collision detection**

**Step 3: Commit**

```bash
git commit -m "feat: add floor spatial grid for item placement validation"
```

---

### Task 9.2: Wall Spatial Grid (Parametric Collision)

**Files:**
- Create: `client/src/lib/pascal/wall-spatial-grid.ts`
- Test: `client/src/lib/pascal/__tests__/wall-spatial-grid.test.ts`

**Step 1: Implement parametric t-range collision**

Track placements as `{ wallId, tStart, tEnd, yStart, yEnd, side }`. Method `canPlaceOnWall(wallId, t, width, wallLength, yStart, yEnd)` returns `{ valid, conflictIds }`.

**Step 2: Tests**

**Step 3: Commit**

```bash
git commit -m "feat: add wall spatial grid for door/window placement validation"
```

---

## Phase 10: Theme-Aware Lighting

### Task 10.1: Dynamic Lighting with Theme Transitions

**Files:**
- Create: `client/src/components/viewer/systems/lighting-system.tsx`
- Modify: `client/src/components/viewer/FloorplanCanvas.tsx`

**Step 1: Create LightingSystem R3F component**

Replace static `<directionalLight>` and `<ambientLight>` with a frame-loop system that lerps light colors and intensities between dark and light theme palettes. Match Pascal's configuration:

- Primary directional: dark mode = 0.8 intensity + cool blue, light mode = 4 intensity + white
- Secondary lights at [-10, 10, -10] and [-10, 10, 10]
- Ambient: dark = 0.15 + blue tint, light = 0.5 + white

**Step 2: Commit**

```bash
git commit -m "feat: add theme-aware lighting system with lerp transitions"
```

---

## Phase 11: Ground Occluder

### Task 11.1: Ground Plane with Slab Cutouts

**Files:**
- Create: `client/src/components/viewer/systems/ground-occluder.tsx`

**Step 1: Create GroundOccluder component**

Large ground plane (1000×1000) with holes cut where slabs exist. Uses `THREE.Shape` with holes from slab polygons. Material matches theme background. Uses polygon offset to prevent z-fighting.

**Step 2: Commit**

```bash
git commit -m "feat: add ground occluder with slab polygon cutouts"
```

---

## Phase 12: Performance Monitor

### Task 12.1: FPS/Draw/Triangle/Dirty Counter

**Files:**
- Create: `client/src/components/viewer/systems/perf-monitor.tsx`

**Step 1: Create PerfMonitor component**

R3F frame-loop component that samples every 0.5s:
- FPS (color-coded: red <30, yellow <55, green >55)
- Draw call count (`gl.info.render.calls`)
- Triangle count (`gl.info.render.triangles`)
- Dirty node count (`useScene.getState().dirtyNodeIds.size`)

Renders as fixed overlay via `<Html>` in top-left corner.

**Step 2: Add toggle to viewer store**

```typescript
showPerfMonitor: boolean;
togglePerfMonitor: () => void;
```

**Step 3: Commit**

```bash
git commit -m "feat: add performance monitor overlay (FPS, draw calls, triangles, dirty nodes)"
```

---

## Phase 13: Wall Display Modes

### Task 13.1: Cutaway Mode for Walls

**Files:**
- Modify: `client/src/stores/use-viewer.ts`
- Modify: `client/src/components/viewer/SceneRenderer.tsx`

**Step 1: Add wallMode to viewer store**

```typescript
wallMode: "up" | "cutaway" | "down";
setWallMode: (mode: "up" | "cutaway" | "down") => void;
```

**Step 2: Implement cutaway rendering**

- `up` = full height walls (default)
- `cutaway` = walls rendered at ~1.2m height to see interior (clip wall height)
- `down` = walls hidden entirely

**Step 3: Commit**

```bash
git commit -m "feat: add wall display modes — up, cutaway, down"
```

---

## Phase 14: Camera Improvements

### Task 14.1: Orthographic Camera Mode

**Files:**
- Modify: `client/src/components/viewer/CameraController.tsx`

**Step 1: Add orthographic camera switching**

When `cameraMode === "orthographic"`, render with `<OrthographicCamera>` at zoom 20, same position. Match Pascal's fov=50 for perspective.

**Step 2: Add camera event bus commands**

Subscribe to `camera:view`, `camera:top-view`, `camera:capture` events.

**Step 3: Commit**

```bash
git commit -m "feat: add orthographic camera mode and camera event bus integration"
```

---

## Phase 15: IndexedDB Persistence

### Task 15.1: Local Scene Persistence

**Files:**
- Create: `client/src/lib/pascal/persistence.ts`
- Modify: `client/src/stores/use-scene.ts`

**Step 1: Implement IndexedDB save/load**

Use the `idb` package (or raw IndexedDB API) to persist scene data locally. Auto-save on changes with debounce. Load on app startup if server data is unavailable.

**Step 2: Add to use-scene store**

```typescript
persistToLocal: () => Promise<void>;
loadFromLocal: (floorplanId: number) => Promise<SceneData | null>;
```

**Step 3: Commit**

```bash
git commit -m "feat: add IndexedDB persistence for local scene backup"
```

---

## Phase 16: Collection System

### Task 16.1: Node Collections

**Files:**
- Modify: `shared/pascal-scene.ts`
- Modify: `client/src/stores/use-scene.ts`

**Step 1: Add collections to scene data**

```typescript
const collectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string().optional(),
  nodeIds: z.array(z.string()),
});

// Add to sceneDataSchema:
collections: z.record(z.string(), collectionSchema).default({})
```

**Step 2: Add collection CRUD to use-scene store**

`createCollection`, `addToCollection`, `removeFromCollection`, `deleteCollection`.

**Step 3: Commit**

```bash
git commit -m "feat: add collection system for grouping nodes"
```

---

## Summary: Execution Order & Dependencies

```
Phase 1 (Wall Geometry) ← foundation, do first
  Task 1.1 → 1.2 → 1.3 → 1.4 → 1.5 (sequential)

Phase 2 (Door/Window Geometry) ← depends on Phase 1
  Task 2.1, 2.2 (parallel)

Phase 3 (Event Bus) ← independent
  Task 3.1 → 3.2 (sequential)

Phase 4 (Selection) ← depends on Phase 3
  Task 4.1, 4.2 (parallel)

Phase 5 (Level System) ← independent
  Task 5.1

Phase 6 (Zone Viz) ← independent
  Task 6.1

Phase 7 (Interactive Controls) ← independent
  Task 7.1

Phase 8 (Item Lights) ← depends on Phase 7
  Task 8.1

Phase 9 (Spatial Grid) ← independent
  Task 9.1, 9.2 (parallel)

Phase 10-16 ← all independent, can be parallelized
```

**Parallelizable groups:**
- Group A: Phase 1 + 2 (geometry accuracy)
- Group B: Phase 3 + 4 (events + selection)
- Group C: Phase 5 + 6 (level + zones)
- Group D: Phase 7 + 8 (interactive + lights)
- Group E: Phase 9 (spatial grids)
- Group F: Phase 10-16 (polish features)
