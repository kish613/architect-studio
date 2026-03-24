# Pascal Dual Renderer — Design Document

**Date**: 2026-03-24
**Status**: Approved
**Strategy**: Fresh re-fork of Pascal packages with dual-renderer fallback

---

## 1. Problem

The Pascal `<Viewer>` integration persistently white-screens due to three compounding issues:

1. **Missing packages** — `@pascal-app/core@0.2.0` and `@pascal-app/viewer@0.2.0` are declared in package.json but not installed in node_modules.
2. **Unresolved merge conflict** — `FloorplanCanvas.tsx` contains git conflict markers (`<<<<<<< Updated upstream` / `>>>>>>> Stashed changes`), making the file syntactically invalid.
3. **Unset buildingId/levelId** — Pascal's `<Viewer>` renders nothing when these IDs aren't set in the viewer store. The bridge fix (commit `6a39262`) was implemented but never deployed cleanly due to the merge conflict.

---

## 2. Solution: Dual Renderer with Auto-Fallback

### Architecture

```
FloorplanCanvas (RendererSwitch)
  ├─ PascalCanvas (primary)
  │    └─ <Viewer selectionManager="default">
  │    └─ DrawingInteraction + EditOverlay
  │    └─ Health probe: geometry rendered within 3s?
  │
  ├─ R3FCanvas (fallback)
  │    └─ <Canvas> + SceneRenderer + CameraController
  │    └─ PostProcessing (N8AO + Bloom + Vignette)
  │    └─ SelectionHandler + CanvasInteractionBindings
  │
  └─ ViewerToolbar (shared, conditional on showToolbar prop)
```

### Renderer Selection Logic

1. Check `localStorage` for cached renderer preference
2. If no preference or preference is "pascal": mount PascalCanvas
3. Start 3-second health check (requestAnimationFrame pixel probe)
4. If check passes: cache "pascal" preference, keep rendering
5. If check fails (white screen, WebGPU error, no geometry):
   - Cache "r3f" preference
   - Unmount PascalCanvas
   - Mount R3FCanvas
   - Show toast: "Switched to standard renderer"
6. User can manually toggle via toolbar button (overrides cached preference)

### Error Boundary Integration

- `PascalRenderBoundary` wraps only `PascalCanvas`
- On React error boundary catch: auto-switch to R3FCanvas
- On unhandled promise rejection from WebGPU: auto-switch to R3FCanvas

---

## 3. File Structure

```
client/src/components/viewer/
  FloorplanCanvas.tsx       — RendererSwitch (main export, resolves merge conflict)
  PascalCanvas.tsx          — NEW: Pascal <Viewer> renderer (extracted from upstream)
  R3FCanvas.tsx             — NEW: React Three Fiber renderer (extracted from stashed)
  RendererHealthCheck.ts    — NEW: WebGPU/geometry probe utility
  ViewerToolbar.tsx         — existing, shared by both renderers
  DrawingInteraction.tsx    — existing, shared
  EditOverlay.tsx           — existing, shared
  SceneRenderer.tsx         — existing, used by R3FCanvas
  CameraController.tsx      — existing, used by R3FCanvas
  SelectionManager.tsx      — existing, used by R3FCanvas
```

---

## 4. Pascal Bridge Fixes

The bridge (`pascal-bridge.ts`) must:

1. **Auto-set buildingId/levelId** on `loadSceneIntoPascal()` — find the first building and first level in the scene tree, set them in Pascal's viewer store immediately.
2. **Validate scene structure** before mounting — confirm at least one building node with at least one level child exists.
3. **Signal readiness** — export a `pascalReady` boolean that FloorplanCanvas can subscribe to. Only mount PascalCanvas when ready.

---

## 5. Implementation Steps (High Level)

1. Run `npm install` to add missing Pascal packages
2. Resolve merge conflict — extract both renderers to separate files
3. Build FloorplanCanvas as RendererSwitch
4. Build RendererHealthCheck utility
5. Fix pascal-bridge to auto-set buildingId/levelId and signal readiness
6. Wire PascalRenderBoundary to auto-fallback
7. Add renderer toggle to ViewerToolbar
8. Run all tests, fix breakages
9. Manual verification on /dev-test and /planning/:id/editor
10. Deploy to Vercel

---

## 6. Success Criteria

1. `npm install` completes without errors
2. No merge conflicts remain in the codebase
3. `/planning/:id/editor` shows 3D geometry (not white screen)
4. If Pascal Viewer fails, R3FCanvas renders automatically within 3 seconds
5. Renderer preference persists in localStorage across page loads
6. User can manually toggle between renderers via toolbar
7. All existing tests pass
8. Vercel deploy succeeds

---

## 7. Dependencies

- `@pascal-app/core@^0.2.0` (npm, MIT)
- `@pascal-app/viewer@^0.2.0` (npm, MIT)
- `@react-three/fiber@^9.4.2` (already installed)
- `@react-three/drei@^10.7.7` (already installed)
- `@react-three/postprocessing@^3.0.4` (already installed)
