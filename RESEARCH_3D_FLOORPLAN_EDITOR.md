# Research: Pascal Editor for 3D Floorplans

## Repository

- **URL**: https://github.com/pascalorg/editor
- **License**: MIT (Pascal Group Inc., 2026) — fully permissive, allows modification, distribution, sublicensing, and commercial use with attribution
- **Status**: Active, modern stack

---

## What It Does

Pascal Editor is a **3D building/floorplan editor** built for the browser. It lets users create, edit, and visualize architectural floor plans and multi-story building structures in an interactive 3D environment. This is essentially the exact type of tool we need for 3D floorplans.

### Key Features

- **3D visualization** of buildings with multiple levels/stories
- **Floor plan editing** — walls, slabs, ceilings, roofs
- **Item placement** — doors, windows, lights, furniture
- **Zone management** — spatial organization within levels
- **Multiple display modes**: stacked, exploded, solo level views
- **2D/3D reference support** via guides and scans (e.g., import a 2D scan and trace over it)
- **Undo/redo** with 50-step history
- **Persistent storage** to IndexedDB

---

## Architecture

### Monorepo Structure (Turborepo + Bun)

| Package | Purpose |
|---------|---------|
| `@pascal-app/core` | Data schemas (Zod), Zustand state management, geometry systems, spatial queries |
| `@pascal-app/viewer` | 3D rendering with React Three Fiber, camera controls, post-processing |
| `apps/editor` | UI components, tools, selection management, editor-specific systems |

### Node Hierarchy (Data Model)

```
Site → Building → Level → Walls, Slabs, Ceilings, Zones, Items (Doors, Windows, Furniture)
```

13 node types are defined: `site`, `building`, `level`, `zone`, `wall`, `ceiling`, `slab`, `roof`, `door`, `window`, `guide`, `scan`, `item`

### Core Systems

Dedicated geometry/rendering systems for: `wall`, `ceiling`, `door`, `item`, `roof`, `slab`, `window`

### State Management

- **useScene** — Scene data (node CRUD, persistence to IndexedDB)
- **useViewer** — Selection state, level display mode, camera mode
- **useEditor** — Active tools, panel states, editor preferences
- **Dirty node tracking** — Marks modified nodes for efficient re-computation
- **Scene registry** — Maps node IDs to Three.js objects for fast lookup
- **Event bus** — Inter-component communication via typed event emitter

---

## Tech Stack

| Technology | Version/Purpose |
|-----------|-----------------|
| React | 19 |
| Next.js | 16 |
| Three.js | WebGPU renderer |
| React Three Fiber + Drei | Declarative 3D |
| Zustand | State management |
| Zod | Schema validation |
| Zundo | Undo/redo |
| three-bvh-csg | Boolean/CSG operations (wall openings for doors/windows) |
| Bun | Package manager |
| Biome | Linting/formatting |
| TypeScript | 5.9.3 |

---

## Feasibility Assessment

### Can We Use It? — YES

**License**: MIT — no restrictions on building commercial products on top of it. We just need to include the copyright notice.

**Alignment with our needs**: This is a purpose-built 3D floorplan editor. The data model (site → building → level → walls/doors/windows/furniture) maps directly to what we need for architectural floorplans.

### What We Get For Free

1. **Complete 3D floorplan editing** — wall drawing, room creation, multi-story buildings
2. **Door/window/furniture placement** with collision detection
3. **Multi-level building support** with stacked/exploded/solo view modes
4. **CSG boolean operations** for wall openings (doors, windows)
5. **Undo/redo system** (50 steps)
6. **IndexedDB persistence** — offline-capable storage
7. **WebGPU rendering** — modern, high-performance 3D
8. **Clean architecture** — well-separated concerns (core data, viewer, editor UI)

### What We Would Need to Build/Extend

1. **Server-side persistence** — Replace IndexedDB with our API/database backend
2. **User authentication integration** — Connect to our existing auth system
3. **Export capabilities** — Add PDF/image export of floorplans if not already present
4. **AI integration** — Hook into our AI modeling pipeline for auto-generation
5. **Collaboration features** — Real-time multi-user editing if needed
6. **Custom UI theming** — Match our application's design system
7. **Integration layer** — Embed the editor within our existing React app

### Potential Challenges

1. **Tech stack alignment** — They use Next.js 16 + Bun; we use Vite. We'd likely extract the `core` and `viewer` packages and integrate them into our Vite-based app, leaving their Next.js app shell behind.
2. **React version** — They use React 19; we need to verify our React version is compatible.
3. **WebGPU support** — WebGPU is modern but not universally supported in all browsers yet. Need to verify fallback to WebGL.
4. **Package coupling** — Need to evaluate how tightly the packages are coupled and whether we can use `core` + `viewer` independently.

---

## Recommended Approach

### Option A: Fork and Integrate (Recommended)

1. Fork the repository
2. Extract `@pascal-app/core` and `@pascal-app/viewer` packages
3. Build our own editor UI on top, integrating with our existing app
4. Replace IndexedDB persistence with our API layer
5. Add our AI modeling features on top

### Option B: Embed as Submodule/Package

1. Add as a git submodule or npm dependency
2. Import and extend the core + viewer packages
3. Build wrapper components in our app
4. Less control but easier to pull upstream updates

### Option C: Reference Implementation Only

1. Study the architecture and patterns
2. Build our own from scratch using the same stack (R3F, Zustand, Three.js)
3. Maximum control but significantly more effort

**Recommendation**: **Option A** gives us the best balance — we get a working 3D floorplan editor with a clean architecture, MIT license allowing full modification, and we can customize it to fit our product needs.

---

## Verdict

**Strongly recommended.** This is a high-quality, purpose-built 3D floorplan editor with an MIT license, modern tech stack, and clean architecture. It provides exactly the 3D floorplan editing capabilities we need, saving significant development effort compared to building from scratch. The monorepo structure makes it easy to extract and integrate the pieces we need.
