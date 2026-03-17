# 3D Floorplan Editor — Design Document

**Date**: 2026-03-17
**Status**: Approved
**Strategy**: Deep Merge (Fork Pascal Editor, extract core + viewer, integrate into Architect Studio)

---

## 1. Overview

Integrate the Pascal Editor (MIT-licensed 3D floorplan editor) into Architect Studio as the primary 3D editing experience. This replaces the existing CAD viewer with a full-featured floorplan editor supporting wall drawing, door/window placement, multi-story buildings, furniture, zones, and AI-powered floorplan generation.

**Scope**: Full fork and complete integration — all Pascal Editor capabilities, server-side persistence, AI pipeline hooks, and export features.

---

## 2. Strategy: Deep Merge

Fork Pascal Editor repository. Extract `@pascal-app/core` (data schemas, state, geometry) and `@pascal-app/viewer` (3D rendering) packages. Discard the Next.js app shell. Rebuild the editor UI layer within our existing Vite + React app, adapting Pascal's editor patterns to match our design system (Radix UI + Shadcn/ui + Tailwind).

### What We Keep From Pascal
- All 13 node type schemas (site, building, level, zone, wall, ceiling, slab, roof, door, window, guide, scan, item)
- Zustand stores (useScene, useViewer, useEditor) with Zundo undo/redo
- Geometry systems (wall, door, window, slab, roof, ceiling, item)
- CSG boolean operations for wall openings
- Scene registry (node ID → Three.js object mapping)
- Event bus for inter-component communication
- Dirty node tracking for efficient re-computation
- Spatial query utilities (raycasting, BVH)

### What We Replace
- Next.js app shell → our Vite app
- IndexedDB persistence → API + Neon PostgreSQL (JSONB)
- Binary asset storage (idb-keyval) → Vercel Blob
- Editor UI components → our Shadcn/ui components
- Biome linting → our existing linting setup

### What We Add
- Server-side persistence with auto-save
- AI floorplan generation (2D image → Gemini → 3D nodes)
- PDF/GLB/PNG export
- Integration with existing auth, subscription, and credit systems
- WebGPU → WebGL fallback renderer

---

## 3. State Management & Data Flow

### Three Zustand Stores (from Pascal, adapted)

**useScene** — Scene data (node CRUD, persistence, undo/redo)
- `nodes: Record<string, AnyNode>` — all scene nodes
- `rootNodeIds: string[]` — top-level node references
- `dirtyNodes: Set<string>` — modified nodes for efficient re-computation
- Zundo middleware providing 50-step undo/redo
- Persistence middleware rewritten: memory (session) + debounced API sync

**useViewer** — Selection state, camera, display modes
- `selectedIds` — currently selected node IDs
- `buildingId`, `levelId`, `zoneId` — active context
- `cameraMode` — perspective/orthographic toggle
- `levelMode` — stacked/exploded/solo floor views
- Wall mode and visibility toggles

**useEditor** — Active tool, panel states, editor preferences
- `activeTool` — wall/door/window/slab/item/zone/etc.
- `phase` — idle/placing/drawing
- Panel visibility toggles

### Persistence Rewrite

**Save flow:**
```
useScene change detected
  → 800ms debounce
  → PUT /api/floorplans/:id
     body: { sceneData: { nodes, rootNodeIds }, thumbnail: base64 }
  → Server: verify JWT + ownership → validate Zod → upsert Neon (JSONB)
  → Thumbnail → Vercel Blob
  → Return { updatedAt }
  → Client: update SaveIndicator
```

**Load flow:**
```
GET /api/floorplans/:id
  → Server: verify JWT + ownership → fetch from Neon
  → Client: useScene.setState(sceneData) to hydrate editor
```

**Asset handling:**
```
Pascal (current):   asset:// protocol → idb-keyval → IndexedDB
Ours (replacement): POST /api/floorplans/:id/assets → Vercel Blob → HTTPS URL
```

### Database Schema Addition

```typescript
// shared/schema.ts — new table
floorplanDesigns: {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id),
  userId: text('user_id').references(() => users.id),
  name: text('name').notNull(),
  sceneData: jsonb('scene_data').notNull(),  // Full Pascal scene state
  thumbnailUrl: text('thumbnail_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}
```

### Integration With Existing Stores
- `useAuth()` — gates editor access, provides userId for save/load
- `useSubscription()` — gates AI generation features (credit check)
- React Query — handles API calls for save/load/asset upload with optimistic updates
- `useToast()` — save confirmation, error notifications

---

## 4. Component Architecture

### Route Changes

```
REMOVED:  /planning/:id/cad  → CADViewer
ADDED:    /planning/:id/editor → FloorplanEditor
UNCHANGED: /projects/:id → Model3DViewer
```

### Component Replacement Map

| Current Component | Replaced By | Source |
|---|---|---|
| `CADViewer.tsx` | `FloorplanCanvas.tsx` | Pascal viewer adapted |
| `CADParameterPanel.tsx` | `EditorToolbar.tsx` + `PropertyPanel.tsx` | Pascal editor tools |
| `ExtensionMesh.tsx` | Pascal wall/slab/roof systems | Pascal core geometry |
| `PropertyBaseMesh.tsx` | Pascal building/level nodes | Pascal scene graph |
| `DimensionAnnotations.tsx` | Pascal guide system | Enhanced with our styling |
| `useCADParams` store | `useScene` + `useEditor` stores | Pascal stores with API sync |

### FloorplanEditor Page Structure

```
<FloorplanEditorPage>
  ├── <EditorToolbar />           — Tool selection (wall, door, window, item, zone)
  ├── <Canvas>                    — R3F canvas (from Pascal viewer)
  │   ├── <SceneRenderer />       — Renders all nodes from useScene
  │   ├── <CameraController />    — Orbit/pan, perspective/ortho toggle
  │   ├── <GridHelper />          — Floor grid
  │   ├── <SelectionManager />    — Click-to-select, multi-select
  │   └── <ToolHandler />         — Active tool interaction (draw walls, place items)
  ├── <PropertyPanel />           — Selected node properties (dimensions, material)
  ├── <LevelNavigator />          — Floor level switcher (stacked/exploded/solo)
  ├── <AIGeneratePanel />         — Upload floorplan image → AI → populate scene
  └── <SaveIndicator />           — Auto-save status, last saved timestamp
```

### AI Integration Flow

```
User uploads 2D floorplan image
  → POST /api/floorplans/:id/generate-from-image
  → Gemini analyzes image, returns structured JSON:
      { walls: [...], doors: [...], windows: [...], rooms: [...] }
  → JSON mapped to Pascal node format
  → useScene.setState() hydrates the editor
  → User can now manually edit the AI-generated floorplan in 3D
```

---

## 5. API Layer

### New Endpoints

**Floorplan CRUD:**
- `POST /api/floorplans` — Create new floorplan design
- `GET /api/floorplans/:id` — Load scene data + metadata
- `PUT /api/floorplans/:id` — Save scene data (debounced auto-save)
- `DELETE /api/floorplans/:id` — Delete floorplan design
- `GET /api/floorplans/project/:projectId` — List floorplans for a project

**Asset Management:**
- `POST /api/floorplans/:id/assets` — Upload texture/scan image → Vercel Blob
- `DELETE /api/floorplans/:id/assets/:assetId` — Remove asset

**AI Generation:**
- `POST /api/floorplans/:id/generate-from-image` — Upload 2D image → Gemini → node JSON
- `POST /api/floorplans/:id/generate-isometric` — Scene data → isometric render

**Export:**
- `POST /api/floorplans/:id/export/pdf` — Server-side PDF generation
- `POST /api/floorplans/:id/export/glb` — Export scene as GLB 3D model
- `POST /api/floorplans/:id/export/image` — Screenshot/render to PNG

### Credit Consumption
- Creating/editing floorplans: **free**
- AI generate-from-image: **1 credit**
- AI isometric render: **1 credit**
- Export to PDF/GLB/image: **free**

### Error Handling (matches existing patterns)
- 401 unauthenticated
- 403 wrong owner
- 402 insufficient credits (with `creditsRequired` in response)
- 429 rate limiting on AI endpoints
- Retry logic with `p-retry` for Gemini calls

---

## 6. Migration & Compatibility

### Tech Stack Alignment

| Pascal Uses | We Use | Resolution |
|---|---|---|
| Next.js 16 | Vite 7.1.9 | Discard Pascal's Next.js app shell. Only take core + viewer |
| Bun | npm/Vercel | Replace bun scripts with npm. No Bun-specific APIs in core/viewer |
| React 19 | React 19.2.0 | Already compatible |
| TypeScript 5.9.3 | TypeScript 5.6.3 | Bump to 5.9.x (non-breaking) |
| Three.js WebGPU | Three.js 0.182.0 | Add WebGPU renderer with WebGL fallback |
| Zustand | Zustand 5.0.9 | Already compatible |
| Zod | Zod 3.25.76 | Already compatible |
| three-bvh-csg | three-bvh-csg 0.0.16 | Already installed |
| Zundo | N/A | Add as new dependency |
| idb-keyval | N/A | Don't install — replaced by API |

### New Dependencies (minimal)
- `zundo` — Undo/redo middleware for Zustand

### File Structure After Integration

```
client/src/
├── components/
│   ├── editor/                    ← NEW (from Pascal editor UI)
│   │   ├── FloorplanEditor.tsx    — Main editor page component
│   │   ├── EditorToolbar.tsx      — Tool selection bar
│   │   ├── PropertyPanel.tsx      — Node property editor
│   │   ├── LevelNavigator.tsx     — Floor level controls
│   │   ├── AIGeneratePanel.tsx    — AI floorplan generation UI
│   │   └── SaveIndicator.tsx      — Auto-save status
│   ├── viewer/                    ← NEW (from Pascal viewer)
│   │   ├── FloorplanCanvas.tsx    — R3F Canvas wrapper
│   │   ├── SceneRenderer.tsx      — Node → Three.js mesh rendering
│   │   ├── CameraController.tsx   — Orbit/perspective controls
│   │   ├── SelectionManager.tsx   — Click/multi-select
│   │   └── systems/               — Geometry systems
│   │       ├── wall-system.ts
│   │       ├── door-system.ts
│   │       ├── window-system.ts
│   │       ├── slab-system.ts
│   │       ├── roof-system.ts
│   │       └── item-system.ts
│   ├── cad/                       ← REMOVED (replaced by editor/)
│   └── ... (existing components unchanged)
├── stores/                        ← NEW (from Pascal core)
│   ├── use-scene.ts               — Scene state + API persistence
│   ├── use-viewer.ts              — Selection + camera state
│   └── use-editor.ts              — Tool + panel state
├── lib/
│   ├── pascal/                    ← NEW (from Pascal core)
│   │   ├── schemas.ts             — Zod node schemas (13 node types)
│   │   ├── geometry.ts            — Geometry utilities
│   │   ├── spatial.ts             — Spatial queries (raycasting, BVH)
│   │   ├── scene-registry.ts      — Node ID → Three.js object map
│   │   └── event-bus.ts           — Typed event emitter
│   └── api.ts                     — Add floorplan API functions
```

### Deleted Files
- `components/cad/CADViewer.tsx`
- `components/cad/ExtensionMesh.tsx`
- `components/cad/PropertyBaseMesh.tsx`
- `components/cad/DimensionAnnotations.tsx`
- `hooks/use-cad-params.ts`

### Migration Script
- One-time migration of existing CAD parameter data → Pascal node format
- Stored as new `floorplanDesigns` rows in database

---

## 7. WebGPU / WebGL Fallback

```typescript
// lib/pascal/renderer-factory.ts
export function createRenderer() {
  if (navigator.gpu) {
    return new WebGPURenderer({ antialias: true });
  }
  // Fallback — R3F default WebGL renderer handles this automatically
  return undefined; // Let R3F use its default WebGLRenderer
}
```

Browser support: WebGPU available in Chrome 113+, Edge 113+, Firefox (behind flag). All others get WebGL automatically through R3F's default renderer.

---

## 8. Testing Strategy

- **Unit tests**: Pascal core geometry functions, node schema validation, spatial queries
- **Integration tests**: Save/load API round-trip, credit deduction, auth guards
- **Visual regression**: Snapshot tests for rendered floorplan scenes
- **E2E**: Wall drawing → door placement → save → reload → verify scene integrity

---

## 9. Risk Mitigation

| Risk | Mitigation |
|---|---|
| Pascal packages tightly coupled to Next.js | Core + viewer have clean separation; only the app shell uses Next.js |
| WebGPU not available in all browsers | Automatic WebGL fallback via R3F |
| Large scene data in JSONB column | Add size limits, lazy-load for project lists, compress if needed |
| Gemini floorplan parsing accuracy | Structured output schema + user can manually correct in editor |
| TypeScript version bump breaks something | 5.6 → 5.9 is minor; run full type-check before merging |
