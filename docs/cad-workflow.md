# CAD Pipeline Workflow

## Overview

The CAD pipeline converts structured planning analysis data (extension dimensions, PDR limits, property info) into interactive 3D geometry that users can manipulate with sliders and export as STL. Everything runs client-side — no server calls, no WASM, no AI inference.

**Core dependency:** `three-bvh-csg` (MIT, ~50KB) for CSG boolean operations on Three.js geometry.

---

## User-Facing Workflow

1. **Planning Viewer** — User completes a planning analysis and selects an extension option tier (PDR-only, moderate, or maximum)
2. **Click "View 3D CAD Model"** — Button appears in PlanningViewer once an option is selected
3. **CAD Viewer loads** — Three-panel layout: extension list (left), 3D canvas (center), parameter sliders (right)
4. **Adjust parameters** — Drag sliders for depth, width, height; change roof type and attachment side
5. **PDR warnings** — Amber badges appear when a dimension exceeds permitted development limits
6. **Toggle annotations** — Show/hide dimension labels and wireframe overlay
7. **Export STL** — Download binary STL file for use in AutoCAD, SketchUp, Revit, or 3D printing

---

## Data Flow

```
PlanningAnalysis (from API via React Query)
│
├─ extensionOptions[selectedTier].extensions[]  (type, depthM, widthM, heightM, additionalSqM)
├─ epcData                                      (totalFloorArea, builtForm)
├─ propertyAnalysis                             (stories)
└─ pdrAssessment                                (max depth/height per extension type)
      │
      ▼
extension-factory.ts
├─ extensionOptionToCADParams()  → CADExtensionParams[]   (dimensions, openings, roof, attachment)
├─ buildPropertyBase()           → PropertyBaseParams      (estimated property footprint from EPC)
└─ getPDRSliderBounds()          → PDRSliderBounds         (slider max values + PDR limit thresholds)
      │
      ▼
Zustand Store (use-cad-params.ts)
├─ sceneParams.extensions[]     (live CAD parameters, updated by sliders)
├─ sceneParams.property         (property base dimensions)
├─ showDimensions / showWireframe
└─ materialPreset
      │
      ▼
geometry-generators.ts
├─ generateExtensionGeometry()  → THREE.Group  (walls + roof + glazing + slab via CSG)
├─ generatePropertyBase()       → THREE.Group  (semi-transparent existing building outline)
└─ getExtensionPosition()       → Vector3      (placement relative to property)
      │
      ▼
R3F Components (React Three Fiber)
├─ CADViewer          (Canvas, OrbitControls, lighting, grid)
├─ ExtensionMesh      (renders one extension, memoized on params)
├─ PropertyBaseMesh   (renders existing building outline)
└─ DimensionAnnotations (drei <Html> labels showing meters)
```

---

## File Structure

### Core Engine (`client/src/lib/cad/`)

| File | Purpose |
|------|---------|
| `types.ts` | `CADExtensionParams`, `WindowParams`, `DoorParams`, `PropertyBaseParams`, `PDRSliderBounds` |
| `constants.ts` | Default dimensions — wall thickness 0.3m, storey height 2.7m, slider min/max/step |
| `geometry-generators.ts` | CSG operations: wall shell, opening cuts, glazing, roof variants, floor slab |
| `extension-factory.ts` | Converts API planning data → CAD parameters, calculates PDR slider bounds |
| `materials.ts` | PBR materials — brick, render, timber, slate, glass, concrete, existing building |
| `stl-exporter.ts` | Binary STL export via Three.js `STLExporter`, triggers browser download |

### Components (`client/src/components/cad/`)

| File | Purpose |
|------|---------|
| `CADViewer.tsx` | R3F Canvas with OrbitControls, lighting (ambient + 2 directional), shadow maps |
| `ExtensionMesh.tsx` | Renders one extension; `useMemo` keyed on params triggers geometry rebuild |
| `PropertyBaseMesh.tsx` | Semi-transparent existing building outline with wireframe edges |
| `DimensionAnnotations.tsx` | Floating labels for depth, width, height, and floor area per extension |
| `CADParameterPanel.tsx` | Right panel: Radix Sliders for each dimension + roof/side dropdowns + PDR warnings |
| `CADToolbar.tsx` | Export STL, toggle dimensions, toggle wireframe, reset buttons |

### Page & State

| File | Purpose |
|------|---------|
| `client/src/pages/CADViewerPage.tsx` | Full page with WorkspaceLayout; loads analysis via React Query, initializes store |
| `client/src/hooks/use-cad-params.ts` | Zustand store: `initFromAnalysis()`, `updateExtensionParam()`, toggles, reset |

### Integration Points

| File | Change |
|------|--------|
| `client/src/App.tsx` | Route: `/planning/:id/cad` → `CADViewerPage` |
| `client/src/pages/PlanningViewer.tsx` | "View 3D CAD Model" button navigates to CAD route |

---

## Geometry Generation Detail

### Wall Shell (CSG)
1. Create outer box (`depthM × widthM × heightM`)
2. Create inner box (inset by `wallThicknessM` on sides, `floorSlabThickness` on bottom)
3. **Subtract** inner from outer → hollow shell
4. **Subtract** attachment-side wall → open face where extension meets existing building
5. Uses `Brush` and `Evaluator` from `three-bvh-csg` with `SUBTRACTION` operation

### Opening Cuts (CSG)
- For each window/door, compute world position from `wall` + `positionAlongWall` fraction
- Create box cutter sized to opening dimensions, depth = `wallThicknessM × 2`
- **Subtract** cutter from wall shell

### Glazing
- Glass pane: `MeshPhysicalMaterial` with transmission 0.6, thickness 0.02m
- Frame: dark aluminum border around each pane
- Positioned to fill cut openings

### Roof Variants
- **Flat:** Box + parapet (0.15m) + overhang (0.3m)
- **Pitched:** `ExtrudeGeometry` with triangular cross-section at `roofPitchDeg`
- **Hipped:** Custom vertices with ridge line + 4 hip faces

### Floor Slab
- Concrete box, 0.15m thick, at ground level

---

## Default Openings by Extension Type

| Type | Doors | Windows |
|------|-------|---------|
| `rear_single_storey` | Bifold on rear wall (3m wide) | Side windows (1.2m × 1.2m) |
| `rear_two_storey` | Bifold on rear wall | 2 rear windows at upper level |
| `side` | None | Front + side windows |
| `loft` | None | 2 dormer windows on rear |
| `outbuilding` | Standard door (0.9m wide) | Front window |

---

## PDR Slider Bounds

Each extension type maps to different slider ranges from the `PDRAssessment`:

| Type | Max Depth Source | Max Height Source | PDR Depth Limit |
|------|-----------------|-------------------|-----------------|
| `rear_single_storey` | `pdr.rearSingleStorey.maxDepthM + 2` | `pdr.rearSingleStorey.maxHeightM + 1` | `pdr.rearSingleStorey.maxDepthM` |
| `rear_two_storey` | `pdr.rearTwoStorey.maxDepthM + 2` | Fixed 7m | `pdr.rearTwoStorey.maxDepthM` |
| `side` | Fixed 8m | `pdr.side.maxHeightM + 1` | Fixed 6m |
| `loft` | Fixed 4m | `pdr.loft.maxHeightM` | Fixed 3m |
| `outbuilding` | Fixed 8m | `pdr.outbuilding.maxHeightM + 1` | Fixed 6m |

Sliders allow the user to go **beyond** PDR limits (for planning permission scenarios) but show an amber warning when exceeded.

---

## Materials

| Preset | Color | Roughness | Use |
|--------|-------|-----------|-----|
| Brick | `#b5651d` | 0.85 | Default wall material |
| Render | `#e8e0d4` | 0.6 | Smooth plaster facade |
| Timber | `#8b6914` | 0.7 | Wood cladding |
| Slate | `#4a4a4a` | 0.7 | Pitched/hipped roofs |
| Glass | `#88ccee` | 0.05 | Windows and doors (transmission 0.6) |
| Concrete | `#999999` | 0.9 | Floor slab |
| Existing | `#888888` | 0.5 | Property outline (opacity 0.3) |

---

## Property Base Estimation

When no exact property dimensions are available, the factory estimates from EPC data:

```
footprint = totalFloorArea / stories
depth = sqrt(footprint / 0.8)        // assume width:depth ≈ 0.8
width = footprint / depth
height = stories × 2.7m              // standard UK storey height
```

Fallback defaults: 7m wide × 9m deep × 2.7m per storey.
