# Pascal Viewer Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Switch back to Pascal's `<Viewer>` component and implement all 10 visual features to match editor.pascal.app output quality.

**Architecture:** Use Pascal's WebGPU Viewer as the sole renderer. Fix data pipeline so geometry renders (auto-set buildingId/levelId). Build a new ViewerToolbar component for the bottom pill bar. Wire all Pascal viewer controls (theme, wall cutaway, level mode, zones).

**Tech Stack:** @pascal-app/viewer, @pascal-app/core, React, Zustand, Tailwind CSS, Lucide icons

**Design doc:** `docs/plans/2026-03-23-pascal-viewer-parity-design.md`

---

### Task 1: Auto-set buildingId/levelId in pascal-bridge

The root cause of the empty Viewer: Pascal needs `buildingId` and `levelId` set in its viewer store to know what to render. Currently only DevTest.tsx sets these manually. Fix it at the bridge level so it works everywhere.

**Files:**
- Modify: `client/src/stores/pascal-bridge.ts` (line ~391, `loadSceneIntoPascal` function)

**Step 1: Add auto-detection to loadSceneIntoPascal**

At the end of `loadSceneIntoPascal()`, after `store.setScene(...)`, add:

```typescript
// Auto-set active building and level in Pascal's viewer store
// so the Viewer knows what to render
import { useViewer as pascalUseViewer } from "@pascal-app/viewer";

const buildingNode = Object.values(pascalNodes).find(n => n.type === "building");
const levelNode = Object.values(pascalNodes).find(n => n.type === "level");
if (buildingNode) {
  pascalUseViewer.getState().setSelection({
    buildingId: buildingNode.id as any,
    levelId: levelNode?.id as any ?? null,
  });
}
```

Note: The `pascalUseViewer` import needs to be added at the top of the file alongside the existing `@pascal-app/core` import.

**Step 2: Remove manual setActiveBuilding/setActiveLevel from DevTest.tsx**

In `client/src/pages/DevTest.tsx`, remove the `setActiveBuilding`/`setActiveLevel` calls and the `useViewer` import since the bridge now handles it automatically.

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: zero errors

**Step 4: Commit**

```bash
git add client/src/stores/pascal-bridge.ts client/src/pages/DevTest.tsx
git commit -m "fix: auto-set buildingId/levelId in pascal-bridge on scene load"
```

---

### Task 2: Switch FloorplanCanvas back to Pascal Viewer

**Files:**
- Modify: `client/src/components/viewer/FloorplanCanvas.tsx` (full rewrite)

**Step 1: Replace FloorplanCanvas with Pascal Viewer**

Replace the entire file content with:

```tsx
import { useEffect } from "react";
import { Viewer } from "@pascal-app/viewer";
import { DrawingInteraction } from "./DrawingInteraction";
import { EditOverlay } from "./EditOverlay";
import { initPascalSelectionSync } from "@/stores/use-viewer";

interface FloorplanCanvasProps {
  className?: string;
  showToolbar?: boolean;
}

export function FloorplanCanvas({ className = "", showToolbar = false }: FloorplanCanvasProps) {
  useEffect(() => {
    const unsub = initPascalSelectionSync();
    return unsub;
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Viewer selectionManager="default" perf={false}>
        <DrawingInteraction />
        <EditOverlay />
      </Viewer>
    </div>
  );
}
```

Note: The `showToolbar` prop is added for Task 5 (ViewerToolbar). The HUD overlay text is removed — Pascal's Viewer has its own camera controls.

**Step 2: Fix DrawingInteraction for WebGPU**

In `client/src/components/viewer/DrawingInteraction.tsx`, replace the drei `Line` import and usage with native Three.js line:

Replace:
```tsx
import { Line } from "@react-three/drei";
```
With:
```tsx
import { useMemo } from "react";
import * as THREE from "three";
```

Replace every `<Line points={...} color="..." lineWidth={...} />` with a native line using a useMemo geometry:

```tsx
function NativeLine({ points, color }: { points: [number, number, number][]; color: string }) {
  const lineObj = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(
      points.map(p => new THREE.Vector3(...p))
    );
    const material = new THREE.LineBasicMaterial({ color });
    return new THREE.Line(geometry, material);
  }, [points, color]);

  useEffect(() => {
    return () => {
      lineObj.geometry.dispose();
      (lineObj.material as THREE.Material).dispose();
    };
  }, [lineObj]);

  return <primitive object={lineObj} />;
}
```

Then replace all `<Line ... />` JSX with `<NativeLine ... />`.

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: zero errors

Start dev server, navigate to `/dev-test`, confirm the Pascal Viewer Canvas renders with geometry visible (SSGI depth, shadows defining edges).

**Step 4: Commit**

```bash
git add client/src/components/viewer/FloorplanCanvas.tsx client/src/components/viewer/DrawingInteraction.tsx
git commit -m "feat: switch back to Pascal Viewer with WebGPU-safe DrawingInteraction"
```

---

### Task 3: Add theme state and toggle to use-viewer

**Files:**
- Modify: `client/src/stores/use-viewer.ts`

**Step 1: Add theme state**

Add to the ViewerState interface:
```typescript
theme: "dark" | "light";
setTheme: (theme: "dark" | "light") => void;
toggleTheme: () => void;
```

Add to the store initializer:
```typescript
theme: "light",
setTheme: (theme) => {
  set({ theme });
  pascalUseViewer.getState().setTheme(theme);
},
toggleTheme: () => {
  const next = get().theme === "light" ? "dark" : "light";
  set({ theme: next });
  pascalUseViewer.getState().setTheme(next);
},
```

**Step 2: Verify**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add client/src/stores/use-viewer.ts
git commit -m "feat: add theme state with Pascal viewer sync"
```

---

### Task 4: Add Viewer.tsx scene loading fix

**Files:**
- Modify: `client/src/pages/Viewer.tsx` (around line 286-294)

**Step 1: Ensure Viewer page sets active building/level after loadScene**

The `loadSceneIntoPascal` in the bridge now auto-sets these. But also ensure our local `useViewer` store reflects the active building/level for the sidebar controls.

After the `loadScene(JSON.parse(model.pascalData))` call, add:

```typescript
const parsed = JSON.parse(model.pascalData);
loadScene(parsed);

// Set active building/level in our store for sidebar controls
const buildingNode = Object.values(parsed.nodes).find((n: any) => n.type === "building");
const levelNode = Object.values(parsed.nodes).find((n: any) => n.type === "level");
if (buildingNode) useViewer.getState().setActiveBuilding(buildingNode.id);
if (levelNode) useViewer.getState().setActiveLevel(levelNode.id);
```

**Step 2: Verify**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add client/src/pages/Viewer.tsx
git commit -m "fix: set active building/level on Viewer page scene load"
```

---

### Task 5: Build ViewerToolbar component

**Files:**
- Create: `client/src/components/viewer/ViewerToolbar.tsx`

**Step 1: Create the component**

```tsx
import { useViewer } from "@/stores/use-viewer";
import {
  Moon, Sun, Camera, Layers, Tag,
  BoxSelect, Combine, Square, SeparatorHorizontal
} from "lucide-react";

function ToolbarButton({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-2.5 rounded-xl transition-all duration-200 ${
        active
          ? "bg-amber-500/20 text-amber-400"
          : "text-white/60 hover:text-white hover:bg-white/10"
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-white/10" />;
}

export function ViewerToolbar() {
  const theme = useViewer((s) => s.theme);
  const toggleTheme = useViewer((s) => s.toggleTheme);
  const cameraMode = useViewer((s) => s.cameraMode);
  const toggleCameraMode = useViewer((s) => s.toggleCameraMode);
  const levelMode = useViewer((s) => s.levelMode);
  const setLevelMode = useViewer((s) => s.setLevelMode);
  const wallMode = useViewer((s) => s.wallMode);
  const setWallMode = useViewer((s) => s.setWallMode);
  const showZones = useViewer((s) => s.showZones);
  const toggleVisibility = useViewer((s) => s.toggleVisibility);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-[#1a1a2e]/90 backdrop-blur-xl border border-white/5 shadow-2xl">
        {/* Theme toggle */}
        <ToolbarButton
          icon={theme === "dark" ? Sun : Moon}
          label={theme === "dark" ? "Light mode" : "Dark mode"}
          onClick={toggleTheme}
        />
        <ToolbarButton
          icon={Camera}
          label={cameraMode === "perspective" ? "Orthographic" : "Perspective"}
          onClick={toggleCameraMode}
        />

        <ToolbarDivider />

        {/* Zone labels */}
        <ToolbarButton
          icon={Tag}
          label="Zone labels"
          active={showZones}
          onClick={() => toggleVisibility("showZones")}
        />

        {/* Wall cutaway */}
        <ToolbarButton
          icon={BoxSelect}
          label={`Walls: ${wallMode}`}
          active={wallMode === "cutaway"}
          onClick={() => {
            const modes: Array<"up" | "cutaway" | "down"> = ["up", "cutaway", "down"];
            const idx = modes.indexOf(wallMode);
            setWallMode(modes[(idx + 1) % modes.length]);
          }}
        />

        <ToolbarDivider />

        {/* Level modes */}
        <ToolbarButton
          icon={Layers}
          label="Stacked"
          active={levelMode === "stacked"}
          onClick={() => setLevelMode("stacked")}
        />
        <ToolbarButton
          icon={SeparatorHorizontal}
          label="Exploded"
          active={levelMode === "exploded"}
          onClick={() => setLevelMode("exploded")}
        />
        <ToolbarButton
          icon={Square}
          label="Solo level"
          active={levelMode === "solo"}
          onClick={() => setLevelMode("solo")}
        />
      </div>
    </div>
  );
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add client/src/components/viewer/ViewerToolbar.tsx
git commit -m "feat: add ViewerToolbar bottom pill bar component"
```

---

### Task 6: Wire ViewerToolbar into pages

**Files:**
- Modify: `client/src/components/viewer/FloorplanCanvas.tsx`
- Modify: `client/src/pages/Viewer.tsx`
- Modify: `client/src/pages/DevTest.tsx`

**Step 1: Add toolbar to FloorplanCanvas**

In FloorplanCanvas.tsx, import and conditionally render:

```tsx
import { ViewerToolbar } from "./ViewerToolbar";

// Inside the component, after the Viewer div:
{showToolbar && <ViewerToolbar />}
```

**Step 2: Pass showToolbar=true from Viewer page**

In `Viewer.tsx`, find where `<FloorplanCanvas>` is used and add `showToolbar`:

```tsx
<FloorplanCanvas className="..." showToolbar />
```

**Step 3: Add toolbar to DevTest page**

```tsx
<FloorplanCanvas className="w-full h-full" showToolbar />
```

**Step 4: Verify**

Run: `npx tsc --noEmit`
Start dev server, navigate to `/dev-test`, confirm bottom toolbar appears with all buttons.

**Step 5: Commit**

```bash
git add client/src/components/viewer/FloorplanCanvas.tsx client/src/pages/Viewer.tsx client/src/pages/DevTest.tsx
git commit -m "feat: wire ViewerToolbar into Viewer and DevTest pages"
```

---

### Task 7: Verify all 10 features work end-to-end

**Step 1: Start dev server**

```bash
npm run dev -- --port 5001
```

**Step 2: Navigate to /dev-test and verify**

1. ✅ Geometry renders (walls, slab, door, window visible via SSGI shadows)
2. ✅ Dark/light theme toggle (click moon icon, background transitions smoothly)
3. ✅ Wall cutaway (click wall icon, walls slice to show interiors)
4. ✅ Zone labels (click tag icon — may need zone nodes in test scene)
5. ✅ Level modes (stacked/exploded/solo buttons work)
6. ✅ Bottom toolbar visible and functional
7. ✅ Site boundary amber outline visible
8. ✅ Ground occluder (shadow plane at ground level)
9. ✅ Selection outlines (click a wall, outline appears)
10. ✅ SSGI depth (geometry has light/shadow definition without explicit colors)

**Step 3: Fix any issues found during verification**

If zone labels don't appear, add a zone node to the DevTest scene:

```typescript
const zone = createNode("zone", {
  name: "Living Room",
  parentId: levelId,
  label: "Living Room",
  color: "#4A90D9",
  points: [
    { x: 0.2, y: 0, z: 0.2 },
    { x: 5.8, y: 0, z: 0.2 },
    { x: 5.8, y: 0, z: 4.8 },
    { x: 0.2, y: 0, z: 4.8 },
  ],
});
```

**Step 4: Build check**

```bash
npx tsc --noEmit
npx vite build
```

Both must pass.

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: verification fixes for Pascal Viewer parity"
```

---

### Task 8: Push and deploy

**Step 1: Push to remote**

```bash
git push
```

**Step 2: Verify Vercel deployment**

Check that the Vercel preview deployment succeeds (no ERESOLVE errors — .npmrc with `legacy-peer-deps=true` handles that).

**Step 3: Final commit if any deployment fixes needed**

---

## Execution Notes

- Tasks 1-4 are the critical path — they make the Viewer actually render geometry
- Task 5 is independent UI work — can be done in parallel
- Task 6 wires everything together
- Task 7 is verification — expect to find and fix small issues
- The DrawingInteraction WebGPU fix (Task 2) was already implemented once in commit `7a59e41` — reference that commit for the exact pattern
