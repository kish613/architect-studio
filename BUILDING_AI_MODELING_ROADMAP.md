# Building-First 3D Generation Platform Roadmap (Meshy-Free)

## 1) Product Goal and Constraints

Build an in-house, building-focused AI modeling pipeline that converts floor plans and architectural intent into editable 3D building models without relying on third-party generation APIs (such as Meshy, Spline generation APIs, etc.).

### Non-negotiables
- **No external proprietary generation API dependency** in production inference.
- **Building and floor-plan quality first**, not character/organic-shape generation.
- **Human-in-the-loop workflow** so architects/designers can guide and correct outputs quickly.
- **Export to practical formats**: IFC, glTF/GLB, USD (optional), OBJ.
- **Versioned and reproducible generation** (same input + seed + model version = deterministic output where feasible).

## 2) Target User Workflow (AI-Assisted, Architect-Centric)

1. User uploads floor plan(s) (PNG/JPG/PDF/CAD-derived image) and optional project brief.
2. System normalizes plans (scale detection, wall line extraction, room segmentation).
3. User sets constraints: number of floors, floor-to-floor height, wall type presets, style profile, code region.
4. AI proposes a **parametric building graph** (rooms, walls, doors, windows, stairs, shafts, envelope).
5. User reviews in 2D/3D split view and approves or edits constraints.
6. Generator produces semantic 3D model (not just mesh) from graph.
7. Refinement agents run: clash checks, topology cleanup, facade enhancement, material tagging.
8. User performs guided edit loop (“make corridor 300mm wider”, “replace facade style”).
9. Export and downstream handoff (BIM/visualization/render).

## 3) Technical Strategy Overview

Use a **hybrid parametric + generative** architecture rather than pure text-to-mesh:

- **Perception models**: parse drawings and recover architectural primitives.
- **Structured intermediate representation (IR)**: building graph / scene graph.
- **Rule + optimization core**: enforce geometric, structural, and code constraints.
- **Generative modules**: infer missing geometry/details and style while preserving topology.
- **Editable parametric backend**: every generated object remains editable with constraints.

This is better for buildings because architectural models are governed by hard constraints and repeated structure.

## 4) System Architecture (From Scratch)

## 4.1 Input & Perception Layer

### Tasks
- Floor plan raster cleanup (denoise, deskew, thresholding).
- Symbol detection (doors, windows, stairs, fixtures).
- Wall centerline/vector extraction.
- Room polygon segmentation and adjacency graph.
- OCR for annotations/dimensions.

### Candidate open-source stack
- CV preprocessing: OpenCV.
- Segmentation/detection: Detectron2 / MMDetection / YOLOv8.
- Vectorization: custom post-processing + shapely + skeletonization.
- OCR: Tesseract / PaddleOCR.

## 4.2 Intermediate Representation (Critical)

Define a canonical **Building IR** (JSON/Protobuf):
- Entities: Site, Level, Room, Wall, Opening, Stair, Slab, Roof, Column, Beam.
- Geometry: polygon footprints, extrusions, local coordinate frames.
- Semantics: room type, wall type, material class, code tags.
- Constraints: alignment, thickness ranges, clearances, min/max dimensions.
- Provenance: which model/step generated each entity.

This IR is your long-term moat and makes model swaps manageable.

## 4.3 Geometry Synthesis Engine

Pipeline:
1. **2D-to-parametric**: convert room/wall graph into procedural building skeleton.
2. **Massing stage**: generate envelope/height profile from constraints.
3. **Element instantiation**: doors/windows/stairs/cores.
4. **Detail stage**: facade grammar, roof variants, interior partitions.
5. **Mesh realization**: watertight manifold mesh generation where needed.

Implementation ideas:
- Geometry kernel: OpenCascade or Blender geometry nodes in headless mode.
- Fast boolean/topology repair: CGAL / trimesh / libigl integrations.
- Parametric rules: Python/C++ rules engine with deterministic seeds.

## 4.4 AI Modules (Model Portfolio)

### A) Plan Parsing Model
- Input: plan image/pdf tiles.
- Output: semantic masks + vectors + symbols.
- Training data: public floorplan datasets + synthetic generation.

### B) Building Graph Completion Model
- Fills missing or ambiguous room/wall relationships.
- Graph neural network or transformer over spatial tokens.

### C) Style & Facade Generator
- Produces facade rhythm/material presets from style prompt + region metadata.
- Should output parameter sets first, textures second.

### D) Command Interpreter Agent
- Translates natural-language edits into IR patch operations.
- Example: “shift stair core north by 1m and widen hallway” -> graph diff.

### E) Quality Critic Models
- Detect impossible geometry, code-risk issues, and poor topology.
- Trained as discriminators/checkers, not generators.

## 4.5 Orchestration & Runtime

- Task queue: Redis + worker pool (Node/Python mixed acceptable).
- Pipeline orchestration: Temporal or custom DAG runner.
- Model serving: Triton Inference Server or custom FastAPI/gRPC services.
- Artifact/version store: object storage + Postgres metadata.
- Reproducibility: store prompt, parameters, IR snapshot, model version hash.

## 5) Data Strategy (Most Important for Success)

## 5.1 Data Sources
- Public datasets: CubiCasa5K, Structured3D, Matterport layouts (license permitting), RPLAN.
- Synthetic plan generator:
  - Programmatically generate millions of valid floor plans with rule variations.
  - Auto-label every entity perfectly (cheap high-quality supervision).
- Internal user feedback loop: accepted/rejected edits become training signals.

## 5.2 Annotation Schema
- Standardize wall classes, opening types, room taxonomy.
- Use polygon + centerline dual labels.
- Keep confidence/calibration fields in labels for active learning.

## 5.3 Data Flywheel
1. Generate model output.
2. Capture user edits as corrective supervision.
3. Rank difficult samples.
4. Retrain targeted modules weekly/biweekly.

## 6) Incremental Delivery Plan (12-Month Practical Roadmap)

## Phase 0 (Weeks 1-3): Foundations
- Freeze IR schema v0.1.
- Set up experiment tracking (MLflow/W&B), dataset registry, and reproducible training scaffolding.
- Build baseline floor-plan parser proof-of-concept.

**Exit criteria:** One known sample plan -> valid IR with rooms/walls/openings.

## Phase 1 (Weeks 4-10): Reliable Plan-to-IR
- Train robust wall/room/opening extraction models.
- Add geometry cleanup and snapping rules.
- Implement uncertainty flags and human correction UI.

**Exit criteria:** >90% wall graph correctness on validation benchmark.

## Phase 2 (Weeks 11-18): IR-to-3D Parametric Model
- Implement procedural extrusion/massing from IR.
- Add stairs, roofs, and multi-floor linking.
- Generate exportable glTF and IFC (basic).

**Exit criteria:** End-to-end flow from floor plan to navigable 3D building shell.

## Phase 3 (Weeks 19-28): AI-Assisted Editing & Agentic Loop
- Build natural-language edit interpreter to IR diffs.
- Add undo/redo, version graph, and conflict resolution.
- Add automatic quality critics (clash + topology checks).

**Exit criteria:** User can iteratively refine model via text edits with low failure rates.

## Phase 4 (Weeks 29-40): Style, Detail, and Production Hardening
- Facade/detail generation with constraint-aware presets.
- Material library and regional style packs.
- Performance tuning, inference optimization, and observability.

**Exit criteria:** Production-grade quality for architecture use-cases; stable exports.

## Phase 5 (Weeks 41-52): Domain Expansion
- Commercial/industrial templates.
- Structural and MEP placeholders.
- Collaboration and enterprise permissions.

## 7) Team Composition

Minimum viable core team:
- 1 Tech Lead (geometry + systems)
- 2 ML Engineers (vision + graph/generative)
- 1 Geometry/Computational Design Engineer
- 2 Full-stack Engineers (editor + backend)
- 1 Product Designer (workflow UX)
- 1 QA/Validation Engineer (geometry correctness + benchmarking)

## 8) Benchmarks and Success Metrics

### Parsing quality
- Room IoU / boundary F1.
- Wall centerline precision/recall.
- Opening detection mAP.

### 3D quality
- Topology validity rate (non-manifold/self-intersection rate).
- Constraint violation count per model.
- Export compatibility success rate (IFC/GLB import in target tools).

### UX/product quality
- Time to first usable model.
- Number of manual corrections per project.
- User acceptance score after first generation.

## 9) Risk Register and Mitigations

- **Risk:** Data licensing issues.
  - **Mitigation:** prioritize synthetic + explicitly licensed datasets.
- **Risk:** Plan parsing variance across drawing styles.
  - **Mitigation:** domain randomization + active learning loop.
- **Risk:** Geometry kernel instability.
  - **Mitigation:** deterministic validation stages + fallback meshing path.
- **Risk:** Overly “pretty” but unusable outputs.
  - **Mitigation:** prioritize semantic/parametric validity over visual realism.
- **Risk:** Long inference times.
  - **Mitigation:** stage-wise caching and asynchronous preview levels.

## 10) Build-vs-Buy Boundaries (No Proprietary API Dependence)

Allowed:
- Open-source frameworks (PyTorch, OpenCascade, Blender, CGAL).
- Self-hosted open models (fine-tuned in-house).
- Commodity cloud GPU infrastructure.

Avoid in core path:
- Black-box external generation APIs for model creation.
- Vendor-locked semantic formats you cannot fully inspect/control.

## 11) Suggested Immediate Next Steps (Next 14 Days)

1. Draft and approve Building IR v0.1 (JSON schema + examples).
2. Build small parser prototype on 200-500 curated floorplans.
3. Implement deterministic IR -> simple 3D extrusion service.
4. Add side-by-side correction UI (2D plan and 3D preview).
5. Define benchmark suite + golden test projects.
6. Review compute budget and pick self-hosting stack.

## 12) Integration Guidance for This Repository

Given current Meshy dependency patterns, migrate in parallel rather than “big bang”:

1. Introduce a new internal `generation_provider` abstraction with modes: `meshy_legacy` and `building_native`.
2. Create `building_native` service endpoints for:
   - `plan/parse`
   - `ir/generate`
   - `ir/edit`
   - `model/export`
3. Keep the current UI flow but switch backend route by feature flag.
4. Log all prompts/edits into IR patch history for future training.
5. Sunset `meshy_legacy` only after benchmark parity and controlled beta.

This parallel strategy de-risks launch while allowing rapid iteration on your owned stack.
