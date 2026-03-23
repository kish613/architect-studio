# Pascal Viewer Parity — Design Document

**Date:** 2026-03-23
**Status:** Approved
**Goal:** Match or exceed Pascal Editor's (editor.pascal.app) visual output and viewer UX across all 10 feature gaps.

## Context

We installed `@pascal-app/core` and `@pascal-app/viewer` and built a bridge layer that syncs our scene data into Pascal's stores. Pascal's `<Viewer>` renders geometry with wall mitering, CSG door/window cutouts, SSGI post-processing, animated level transitions, and a polished bottom toolbar. Our first attempt at using the Viewer produced a white screen because we hadn't set `buildingId`/`levelId` and the SSGI wasn't activating. We temporarily reverted to our own Canvas+SceneRenderer, but the user wants Pascal's full rendering pipeline.

**Decision:** Use Pascal's `<Viewer>` as-is with no material overrides. Pascal's white aesthetic with SSGI depth is the target look (matches editor.pascal.app). Focus on making the data pipeline work correctly and building all missing UI.

## Architecture

```
FloorplanCanvas.tsx
├── <Viewer> (from @pascal-app/viewer)
│   ├── Pascal internals: Canvas, Lights, PostProcessing, SceneRenderer,
│   │   WallSystem, DoorSystem, WindowSystem, SlabSystem, RoofSystem,
│   │   CeilingSystem, ItemSystem, ZoneSystem, LevelSystem, GuideSystem,
│   │   ScanSystem, WallCutout, GroundOccluder, SelectionManager,
│   │   ItemLightSystem, ViewerCamera
│   ├── <DrawingInteraction /> (our component, WebGPU-safe materials)
│   └── <EditOverlay /> (our component, drag handles)
├── <ViewerToolbar /> (new — bottom pill bar, viewer mode only)
└── Pascal selection sync via useEffect
```

**Data flow unchanged:** Our `useScene` store → `pascal-bridge.ts` → Pascal's `useScene` store → Pascal's Viewer renders it.

## Feature Specifications

### Feature 1: Switch Back to Pascal Viewer

**File:** `client/src/components/viewer/FloorplanCanvas.tsx`

Revert to `<Viewer selectionManager="default" perf={false}>` with children: `<DrawingInteraction />` and `<EditOverlay />`. Keep `initPascalSelectionSync()` in useEffect.

**Critical fix from last attempt:** The scene was empty because `buildingId` and `levelId` were null in Pascal's viewer store. The fix is already in `DevTest.tsx` (`setActiveBuilding`/`setActiveLevel`). For production, the `FloorplanEditorPage.tsx` and `Viewer.tsx` pages must also call these after `loadScene()`.

**Auto-set active building/level:** Add logic to `loadSceneIntoPascal()` in `pascal-bridge.ts` that automatically finds the first building and level node and sets them in Pascal's viewer store. This ensures geometry always renders regardless of which page loads the scene.

### Feature 2: Wall Cutaway Mode

**Already wired:** `useViewer` has `wallMode: 'up' | 'cutaway' | 'down'` with `setWallMode()` that syncs to Pascal's viewer store. Pascal's `WallCutout` system reads this and slices walls at a consistent height.

**UI needed:** A button in the bottom toolbar (see Feature 4) that cycles through wall modes. Icon: a wall with a dotted line through it.

### Feature 3: Dark/Light Theme Toggle

**How Pascal does it:** `useViewer` store has `theme: 'dark' | 'light'`. The `AnimatedBackground` component inside Viewer lerps between `#1f2433` (dark) and `#ffffff` (light). Lights also adjust intensity.

**What we need:**
- Add `theme` state to our `use-viewer.ts` store
- Add `setTheme()` / `toggleTheme()` methods that call `pascalUseViewer.getState().setTheme()`
- A moon/sun toggle button in the bottom toolbar

### Feature 4: Bottom Toolbar (Viewer Mode)

**New component:** `client/src/components/viewer/ViewerToolbar.tsx`

A floating dark pill bar positioned `absolute bottom-6 left-1/2 -translate-x-1/2` with rounded-full styling and backdrop-blur.

**Buttons (left to right):**
1. 🌙/☀️ Theme toggle (dark/light)
2. 📷 Camera preset (perspective/orthographic toggle)
3. 📐 Layers toggle (show/hide panels)
4. 🏷️ Zone labels toggle
5. 🧊 Wall cutaway cycle (up → cutaway → down)
6. 🏗️ Level mode: stacked
7. 🏗️ Level mode: exploded
8. 🏗️ Level mode: solo

Each button uses Lucide icons, has tooltip on hover, and highlights when active (gold/amber accent like Pascal uses).

**Conditional rendering:** Only shows on the Viewer page (`/projects/:id`), not on the editor page (`/planning/:id/editor`) which keeps the sidebar.

### Feature 5: Zone Labels

**How Pascal does it:** `ZoneSystem` from `@pascal-app/viewer` reads zone nodes and renders floating HTML labels (via drei's `<Html>` or custom billboard text) at the centroid of each zone polygon.

**What we need:** Ensure zone nodes are included in the bridge conversion and have proper `name`/`label` and `polygon` fields. The `ZoneSystem` is already mounted inside `<Viewer>` — it should render labels automatically if the zone data is correct.

**Bridge fix:** In `convertOurNodeToPascal()`, the zone case already maps `points` to `polygon` as `[x, z][]` tuples and includes `name` and `color`. Verify this works with Pascal's ZoneSystem.

### Feature 6: Site Boundary Outline

**Already implemented.** The `pascal-bridge.ts` computes a bounding polygon from all walls and passes it as `site.polygon.points`. Pascal's `SiteRenderer` draws an amber line outline at ground level.

### Feature 7: Animated Level Transitions

**How Pascal does it:** `LevelSystem` from `@pascal-app/viewer` reads `levelMode` from the viewer store and animates each level group's Y position using lerp. Modes:
- `stacked`: all levels at their actual elevation
- `exploded`: levels spread apart with configurable spacing
- `solo`: only the active level visible, others hidden

**What we need:** Already syncing `levelMode` to Pascal. Add exploded spacing sync. The level navigator UI already exists in our sidebar (`LevelNavigator.tsx`). For the viewer page, add level mode buttons to the bottom toolbar.

### Feature 8: Ground Occluder

**Already inside Viewer.** Pascal's `<GroundOccluder>` creates a large plane that receives shadows and creates the ground-level shadow effect. No action needed.

### Feature 9: Selection Outlines

**Already inside Viewer.** Pascal's `PostProcessing` includes an outline pass that highlights selected objects with a pulsing outline. The `SelectionManager` handles click-to-select. Our bidirectional selection sync ensures editor panels reflect the selection.

### Feature 10: SSGI + TRAA Post-Processing

**Already inside Viewer.** Pascal's `PostProcessing` component includes SSGI (screen-space global illumination) for realistic light bouncing and TRAA (temporal anti-aliasing) for smooth edges. These activate automatically when the Viewer's Canvas is rendering.

**Why it looked flat before:** The SSGI needs geometry with depth variation to show its effect. When `buildingId`/`levelId` were unset, no geometry rendered, so SSGI had nothing to work with. With the fix from Feature 1, geometry renders, and SSGI creates the architectural model look seen on editor.pascal.app.

## Pages That Need Updates

### Viewer Page (`/projects/:id`)
- Uses `<FloorplanCanvas>` (Pascal Viewer) + `<ViewerToolbar>` (new bottom bar)
- No sidebar editing panels
- Read-only model viewing with toolbar controls

### Floorplan Editor Page (`/planning/:id/editor`)
- Uses `<FloorplanCanvas>` (Pascal Viewer) inside `<FloorplanEditor>` layout
- Keeps sidebar with EditorToolbar, PropertyPanel, LevelNavigator, etc.
- No bottom toolbar (sidebar handles all controls)

### DevTest Page (`/dev-test`)
- Already fixed with `setActiveBuilding`/`setActiveLevel`
- Add `<ViewerToolbar>` for testing toolbar

## DrawingInteraction WebGPU Compatibility

The `DrawingInteraction` component renders line geometry and sphere markers for wall drawing. Inside Pascal's WebGPU Canvas:

- `<meshBasicMaterial>` — works in WebGPU (auto-compiled to node material)
- `<Line>` from drei — uses `LineMaterial` from three-stdlib, **NOT compatible** with WebGPU
- Fix: replace `<Line>` with native `<line>` + `<lineBasicMaterial>` (already done in commit `7a59e41`, needs to be re-applied since we reverted)

## Risk Mitigation

**Risk:** Pascal Viewer still shows white/empty after re-enabling.
**Mitigation:** Auto-set buildingId/levelId in `loadSceneIntoPascal()`. Add console logging to verify node counts and dirty node processing.

**Risk:** WebGPU not available on user's browser.
**Mitigation:** Pascal's Viewer may fall back to WebGL. Test on Chrome, Firefox, Safari. Add a fallback message if Canvas fails to initialize.

**Risk:** SSGI performance on low-end devices.
**Mitigation:** Pascal includes a `perf` prop. Can disable post-processing conditionally based on device capabilities.

## Files Changed Summary

| File | Change |
|------|--------|
| `client/src/components/viewer/FloorplanCanvas.tsx` | Revert to `<Viewer>`, add children |
| `client/src/components/viewer/ViewerToolbar.tsx` | **NEW** — bottom toolbar component |
| `client/src/components/viewer/DrawingInteraction.tsx` | WebGPU-safe line materials |
| `client/src/stores/use-viewer.ts` | Add theme state, toggleTheme |
| `client/src/stores/pascal-bridge.ts` | Auto-set buildingId/levelId on load |
| `client/src/pages/Viewer.tsx` | Add ViewerToolbar |
| `client/src/pages/DevTest.tsx` | Add ViewerToolbar |
| `client/src/pages/FloorplanEditorPage.tsx` | Ensure buildingId/levelId set |

## Success Criteria

1. Visiting `/dev-test` shows 3D geometry with SSGI depth and shadows (matching editor.pascal.app aesthetic)
2. Dark/light theme toggle works with smooth animated transition
3. Wall cutaway shows interior rooms when toggled
4. Zone labels float over rooms when zones toggle is active
5. Level exploded view separates floors with animated transition
6. Bottom toolbar appears on viewer page with all controls functional
7. Editor page retains sidebar layout with no bottom toolbar
8. Selection outlines highlight clicked objects
9. Site boundary amber outline visible
10. `npx vite build` passes, Vercel deploys successfully
