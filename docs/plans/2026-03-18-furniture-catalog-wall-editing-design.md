# Furniture Catalog + Wall Drag Editing

**Date:** 2026-03-18
**Status:** Approved

## Overview

Two features to make the Pascal 3D viewer interactive and visually rich:
1. A built-in furniture catalog with AI auto-placement from floorplan analysis
2. Drag-to-edit walls by their endpoints or body

## Feature 1: Furniture Catalog & AI Auto-Placement

### Built-in Catalog

~30-50 curated free GLB models hosted on Vercel Blob, organized by category:

| Category | Example Items |
|----------|---------------|
| Living | Sofa, armchair, coffee table, TV stand, bookshelf, rug |
| Bedroom | Bed (single/double/king), nightstand, wardrobe, desk, chair |
| Kitchen | Fridge, oven, dishwasher, sink, dining table, dining chair |
| Bathroom | Toilet, bathtub, shower, sink/vanity, mirror |
| Office | Desk, office chair, filing cabinet, printer |
| Outdoor | Patio table, garden chair |

Each catalog entry:
```typescript
interface CatalogItem {
  id: string;           // e.g. "sofa-modern-01"
  name: string;         // "Modern Sofa"
  category: string;     // "living"
  modelUrl: string;     // Vercel Blob URL to .glb
  thumbnailUrl: string; // Preview image
  dimensions: Vec3;     // Default bounding box {x, y, z}
  keywords: string[];   // For fuzzy matching: ["sofa", "couch", "settee"]
}
```

Catalog data lives in `client/src/lib/pascal/furniture-catalog.ts` as a static array. GLB files hosted on Vercel Blob (uploaded once manually).

### GLB Asset Sources

Free, license-compatible sources for the initial catalog:
- **Poly Haven** (CC0, public domain)
- **Kenney.nl** (CC0 game assets, low-poly furniture)
- **Quaternius** (CC0 furniture packs)
- **Sketchfab** (CC-BY models with attribution)

All models should be:
- Under 500KB each (web-optimized)
- GLB format (binary glTF)
- Pre-processed with `gltf-transform` for draco compression

### AI Auto-Placement

Gemini already extracts items with name, type, position, and dimensions from floorplans. The `buildSceneFromGemini()` function creates ItemNodes.

Enhancement: After creating an ItemNode, fuzzy-match its `name` against `catalog[].keywords`. If matched, set `catalogId` and `modelUrl` on the node. This happens server-side in the conversion function.

```
Gemini output: { name: "sofa", type: "furniture", position: {x: 3, z: 5} }
  → Match against catalog keywords: "sofa" matches "sofa-modern-01"
  → ItemNode.catalogId = "sofa-modern-01"
  → ItemNode.modelUrl = catalog["sofa-modern-01"].modelUrl
```

### Renderer Upgrade

`item-system.ts` currently renders all items as `BoxGeometry`. Add a new `ItemModelMesh` component:

- If `node.modelUrl` exists → load GLB via `useGLTF(url)`, render `<primitive>` with correct scale/position
- If no modelUrl → fall back to current box rendering
- Preload all catalog GLBs via `useGLTF.preload()` for instant display

### Catalog UI

New "Furniture" panel in the editor sidebar:
- Visual grid of thumbnails (3 columns)
- Category tabs at top (All, Living, Bedroom, Kitchen, Bathroom, Office)
- Click a catalog item → cursor becomes placement mode
- Click in scene → place item at that position
- Item becomes selected immediately for repositioning

## Feature 2: Wall Drag Editing

### Select Mode Enhancements

When `activeTool === "select"` and a wall is selected:

1. **Drag handles** — Render small spheres (r=0.15) at wall start and end points
2. **Endpoint drag** — onPointerDown on a handle, enter "dragging" phase. onPointerMove updates `wall.start` or `wall.end` via `updateNode()`. Grid snap at 0.05m.
3. **Body drag** — onPointerDown on wall body (not a handle), enter dragging. Both start and end translate by same delta.
4. **Visual feedback** — Dragged wall turns semi-transparent. Show dimension labels during drag.
5. **Grid snap** — Same 0.05m snap already used in wall drawing

### Implementation Approach

New component: `WallDragHandles.tsx`
- Renders inside `<SceneRenderer>` when a wall is selected
- Two `<mesh>` spheres at start/end positions
- `onPointerDown` starts drag, `onPointerMove` (via useFrame raycasting against ground plane) updates position
- `onPointerUp` commits the change

### Connected Elements

Doors and windows use `wallId` + `position` (0-1 normalized along wall length). When a wall moves:
- No update needed — they re-render at the correct position because their position is computed from `wall.start`/`wall.end` in real-time
- If a wall is deleted, orphaned doors/windows become invisible (wallId lookup returns null)

### Undo/Redo

Already handled by Zundo temporal middleware on `use-scene` store. Each `updateNode()` call creates a history entry.

## Files to Create/Modify

### New files:
- `client/src/lib/pascal/furniture-catalog.ts` — catalog data array
- `client/src/components/editor/FurnitureCatalogPanel.tsx` — catalog UI
- `client/src/components/viewer/WallDragHandles.tsx` — drag handles + interaction

### Modified files:
- `client/src/components/viewer/systems/item-system.ts` — GLB loading for items with modelUrl
- `client/src/components/viewer/SceneRenderer.tsx` — render WallDragHandles, render GLB items
- `api/models/[id]/generate-pascal.ts` — fuzzy match items to catalog in buildSceneFromGemini()
- `client/src/components/editor/FloorplanEditor.tsx` — add FurnitureCatalogPanel
- `client/src/stores/use-editor.ts` — add "furniture" panel to visiblePanels

## Constraints

- No external API dependencies (all assets bundled/hosted)
- No user upload feature in v1
- GLB files must be under 500KB each
- Must work on mobile (touch drag for walls)
- Performance: instancing for repeated furniture items (e.g. 6 dining chairs)

## Success Criteria

1. After Pascal generation, furniture appears as 3D models (not boxes) in correct positions
2. Users can drag wall endpoints to reshape rooms
3. Users can open furniture catalog and place additional items
4. All changes are undoable
5. Build passes, deploys to Vercel without errors
