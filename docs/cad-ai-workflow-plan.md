# CAD AI Workflow: 2D Floorplans to 3D Architectural Models

A comprehensive pipeline design that replaces mesh-based reconstruction with precise, parametric CAD-native geometry.

---

## Phase 1 -- Input Acquisition & Preprocessing

**Goal:** Normalize diverse input formats into a clean, machine-readable representation.

| Step | Detail |
|---|---|
| **Format ingestion** | Accept PDF, DXF/DWG, scanned rasters (TIFF/PNG/JPEG), and hand-drawn sketches. Use LibreCAD/ODA File Converter for DWG-to-DXF translation so everything enters the pipeline as either vector (DXF) or raster. |
| **Raster cleanup** | For scanned/photographed drawings: deskew, binarize (adaptive thresholding), remove noise, and segment the sheet into drawing area vs. title block vs. annotations. OpenCV or scikit-image handles this. |
| **Vector normalization** | For DXF inputs: flatten block references, unify coordinate systems, strip unused layers, and convert splines to polylines within a configurable tolerance (e.g. 0.5 mm chord deviation). |
| **Scale & unit detection** | OCR the scale bar / title block (using a fine-tuned PaddleOCR or TrOCR model) and cross-reference with known paper sizes to establish real-world units (mm, ft-in). |

**Key tools:** OpenCV, scikit-image, ezdxf (Python DXF library), PaddleOCR, ODA File Converter.

---

## Phase 2 -- Automated Drawing Interpretation (AI Core)

**Goal:** Extract semantic architectural primitives -- walls, doors, windows, columns, stairs, rooms -- with dimensional accuracy.

### 2a. Symbol & Element Detection

- **Model:** A two-stage detector -- YOLOv8 or RT-DETR for fast candidate proposals, followed by a lightweight classifier head that distinguishes 30-50 architectural symbol classes (door swing, window type, fixture, etc.).
- **Training data:** FloorplanCAD dataset (~12k plans), CubiCasa5k, and a proprietary labeled set. Augment with synthetic floorplans generated from parametric grammar rules.
- **Output:** Bounding boxes + class labels + orientation for each symbol instance.

### 2b. Wall / Line Segmentation

- **Model:** A U-Net variant (HRNet backbone) trained to produce per-pixel semantic masks for: load-bearing walls, partition walls, columns, glazing lines, dimension lines.
- **Post-processing:** Skeletonize the wall mask, vectorize with the Douglas-Peucker algorithm, then snap endpoints to a detected grid (typically 100 mm or 4" module). This yields a **wall centerline graph**.

### 2c. Dimension & Annotation Extraction

- **OCR + spatial reasoning:** Run OCR on dimension strings, then associate each value with the nearest dimension line entity (leader + extension lines). A small transformer model resolves ambiguous associations.
- **Constraint graph:** Build a system of linear constraints (wall A length = 3500 mm, wall B offset = 200 mm from grid line 3, etc.) and solve with a least-squares optimizer to reconcile contradictions in hand-drawn inputs.

### 2d. Room Topology

- **Graph construction:** From the wall centerline graph, compute the minimal cycle basis to identify enclosed rooms. Classify each room (bedroom, bathroom, kitchen, corridor) using a GNN or simple heuristic rules (fixture presence, area thresholds, label OCR).

**Key tools/models:** PyTorch, Ultralytics (YOLO), HuggingFace Transformers (TrOCR), NetworkX (graph algorithms), OR-Tools / SciPy (constraint solving).

---

## Phase 3 -- Parametric 3D Model Generation

**Goal:** Produce precise B-rep (boundary representation) geometry -- not triangle meshes -- that is editable in standard CAD software.

### 3a. Wall Extrusion

- Each wall centerline segment is offset by half the detected wall thickness on both sides, creating a closed 2D profile.
- Extrude to the storey height (parsed from section drawings, schedules, or a default like 2700 mm floor-to-floor).
- Boolean-subtract door and window openings at their detected positions, sizes, and sill/head heights.

### 3b. Opening Components

- Doors and windows are inserted as **parametric families/blocks** from a component library, not modeled from scratch. Each family is driven by parameters: width, height, sill height, swing direction, frame depth.
- Library format: IFC ParametricObject or Revit .rfa templates serialized to a neutral schema.

### 3c. Slab, Ceiling & Roof

- Floor slabs: generated from room boundary polygons, extruded downward by slab thickness.
- Ceilings: offset surface from slab underside, respecting bulkheads/drops.
- Roofs (if elevation/section data available): constructed from ridge/eave lines using swept or lofted B-rep operations.

### 3d. MEP Placeholder Zones

- From detected fixture positions (sinks, toilets, electrical panels), generate bounding volumes that flag MEP routing zones for downstream coordination.

**Geometry kernel options:**

| Kernel | Pros | Cons |
|---|---|---|
| **Open Cascade (OCCT)** via PythonOCC or CadQuery | Full B-rep, STEP/IGES export, boolean ops | Steep learning curve, C++ under the hood |
| **Build123d** (Python-native wrapper over OCCT) | Clean Pythonic API, good for parametric modeling | Newer, smaller community |
| **FreeCAD scripting** | Integrated GUI for validation, IFC export via IfcOpenShell | Heavier runtime |
| **Blender + CAD add-ons** | If mesh output is acceptable as intermediate | Not true B-rep |

**Recommended:** Build123d for the generation pipeline, with OCCT as the underlying kernel. Export to STEP for CAD interop and IFC for BIM interop.

---

## Phase 4 -- Validation & Quality Assurance

**Goal:** Ensure the generated model meets architectural CAD standards before delivery.

### 4a. Geometric Validation

- **Watertight check:** Verify all solids are closed (no open shells) using OCCT shape validity checks.
- **Intersection check:** Detect colliding geometry (wall-wall, slab-wall) and auto-resolve with boolean cleanup or flag for manual review.
- **Dimensional audit:** Compare every extracted dimension against the constraint graph from Phase 2c. Flag deviations > tolerance (e.g. 5 mm for construction docs, 50 mm for schematic).

### 4b. Code & Standard Compliance

- **Rule engine:** Encode checks from local building codes (minimum room dimensions, door widths for accessibility, egress path widths) as parameterized rules. Run them against the room topology graph.
- **IFC schema validation:** If exporting to IFC, validate against the IFC4 or IFC4x3 schema using IfcOpenShell's validator.

### 4c. Visual Diff / Human-in-the-Loop

- Render a top-down projection of the 3D model and overlay it on the original 2D drawing (alpha-blended). Present a "diff view" highlighting discrepancies for an architect to approve or correct.
- Corrections feed back into the constraint graph (Phase 2c) and the model regenerates -- this is the **active learning loop** that improves the AI models over time.

### 4d. LOD (Level of Development) Tagging

- Tag each element with its LOD (100-400) per AIA/BIMForum conventions so downstream consumers know the reliability of each component.

**Key tools:** IfcOpenShell, OCCT shape analysis, a custom rule engine (can be as simple as a JSON rule set evaluated in Python).

---

## Phase 5 -- Export & Integration

| Target | Format | Tool |
|---|---|---|
| Revit | IFC4 (preferred) or .rvt via Forge/APS | IfcOpenShell, Autodesk Platform Services API |
| ArchiCAD | IFC4 | IfcOpenShell |
| AutoCAD / BricsCAD | DWG (via ODA SDK) or STEP | ODA File Converter, OCCT STEP writer |
| Rhino / Grasshopper | STEP or 3DM | PythonOCC STEP export, rhino3dm library |
| Web viewer (review) | glTF derived from IFC | IfcConvert (IfcOpenShell) or IFC.js |
| Unreal / Unity (viz) | FBX or glTF | Post-process from IFC |

---

## System Architecture (Deployment)

```
[Input Upload API]
       |
       v
[Preprocessing Worker]  -- GPU not required
       |
       v
[AI Inference Service]  -- GPU required (YOLO, U-Net, OCR)
  (containerized, horizontally scalable)
       |
       v
[Constraint Solver]     -- CPU, high memory
       |
       v
[3D Generation Engine]  -- CPU (OCCT kernel)
       |
       v
[Validation Pipeline]   -- CPU + rule engine
       |
       v
[Export Service]        -- STEP/IFC/DWG writers
       |
       v
[Storage: Blob + DB]   -- Vercel Blob for files, Neon for metadata
```

- **Orchestration:** A job queue (e.g. BullMQ backed by Upstash Redis, or a durable workflow via Vercel Workflow DevKit) manages the multi-step pipeline with retries and status tracking.
- **GPU inference:** Host on a provider with GPU instances (Replicate, Modal, or a self-managed cluster). Inference takes ~2-5 seconds per floorplan for detection + segmentation.
- **Storage:** Original drawings and generated models stored in Vercel Blob; project metadata, job status, and dimension audit logs in Neon (Postgres).

---

## AI Model Summary

| Model | Task | Architecture | Training Data |
|---|---|---|---|
| Symbol Detector | Detect doors, windows, fixtures, stairs | RT-DETR or YOLOv8-L | FloorplanCAD + CubiCasa5k + synthetic |
| Wall Segmenter | Pixel-level wall/column masks | HRNet + U-Net decoder | Same + R2V dataset |
| OCR Engine | Read dimensions, labels, room names | TrOCR or PaddleOCR v4 | Synthetic dimension strings + real crops |
| Dim Associator | Link OCR text to geometry | Small transformer (encoder-only) | Paired (text, geometry) annotations |
| Room Classifier | Label room function | GNN on topology graph | Room-labeled floorplan datasets |

All models would be fine-tuned, not trained from scratch, using transfer learning from pretrained backbones (ImageNet for vision, general OCR for text).

---

## Key Differentiators vs. Mesh-Based Approaches

1. **B-rep output** -- geometry is made of exact planes, arcs, and extrusions, not approximated triangle soups. This means walls have real thickness, openings have exact dimensions, and everything is editable in CAD.
2. **Constraint-driven accuracy** -- the dimension constraint solver reconciles the AI's pixel-level predictions with the architect's stated measurements, producing geometry that is dimensionally faithful, not just visually close.
3. **Parametric components** -- doors and windows are library instances with editable parameters, not frozen geometry. Changing a door width downstream is a parameter edit, not a remodel.
4. **Native IFC/STEP export** -- no lossy mesh-to-BRep conversion step. The model is born as precise geometry.
