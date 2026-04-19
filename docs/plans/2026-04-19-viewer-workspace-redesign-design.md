# Viewer Workspace Redesign — Design Doc

**Date:** 2026-04-19
**Branch:** `claude/compassionate-wiles-3589df`
**Status:** Approved, ready for implementation plan.

## Context

Full rewrite of `client/src/pages/Viewer.tsx` (current: 1039 LOC) to match the modernised BIM workspace prototype delivered via Claude Design bundle `archudio-viewer`. Removes the SVG "mock" isometric stage, keeps all production functionality, adopts the saved [Architect Studio design system](../design-system/).

## Decisions (locked)

| # | Decision | Chosen |
|---|---|---|
| Q1 | Replacement strategy | Replace `Viewer.tsx` in place |
| Q2 | Generation-controls location | Top-bar Generate popover **and** ⌘K command palette |
| Q3 | Feature preservation | Keep everything (Pascal BIM, Meshy/Trellis, Isometric, Retexture, Paywall, Furniture catalog, Delete hotkey) |
| Q4 | Layouts | Ship both Studio (default) and Precision; user toggles |
| Q5 | Drawing tools | Stub for now (cursor-mode only), wire to Pascal in a follow-up |
| Q6 | Fonts | Adopt design-system token set; body = Inter (already default in `index.css`) |
| Q7 | Data wiring | Inspector, Layers, Floor switcher, Status bar all wire to real scene data |
| Q8 | Furniture catalog | Opens as a dock-tool popover in Studio; swaps Inspector slot in Precision |
| Q9 | Outer page wrapper | Full-bleed, prototype-native top bar; `<Layout>` only for loading / not-found |

## Architecture

### Component tree

```
/projects/:id → Viewer.tsx (thin, ~150 LOC)
  ├── <WorkspaceRoot layout>            grid-rows: 52px / 1fr / 40px
  │   ├── TopBar                        logo · crumb · avatar · mode-switch · ⌘K · collab · Generate · Share · Export
  │   │   └── GeneratePopover           Pascal / Isometric / Meshy-Trellis / Retexture  → existing mutations
  │   ├── StudioStage | PrecisionStage | SplitStage
  │   │   ├── (Precision) Rail + SceneTreePanel
  │   │   ├── CanvasSurface             decides: FloorplanCanvas | R3FCanvas+SceneRenderer | Model3DViewer | empty
  │   │   │   └── CanvasOrbit           3D only — drag/tilt/zoom bridge to OrbitControls
  │   │   ├── HoverTag · FloorSwitcher · HUD
  │   │   ├── (Studio) ToolDock · CamIsland · LayersIsland · PropsIsland
  │   │   ├── (Precision) Inspector     same props as PropsIsland
  │   │   ├── SectionCut                3D only
  │   │   └── FurniturePopover          triggered from dock tool
  │   ├── StatusBar                     save · dims · area · tri · FPS · layers · version
  │   └── CommandPalette                ⌘K portal
  ├── TweaksPanel                       dev-only layout switcher
  └── PaywallModal                      existing, unchanged
```

### Render decision (3D panel)

1. `hasRenderablePascal` → existing `<R3FCanvas>` + `<SceneRenderer>`
2. else `has3D` → existing `<Model3DViewer modelUrl={model.model3dUrl} />`
3. else → empty-state island with "Generate 3D" CTA that opens `GeneratePopover`

2D panel always uses existing `<FloorplanCanvas />`. Split view = 2D left + 3D right, orbit bound only on right.

### State

Preserved stores:

- `useViewer` — selection, hover, camera preset, visibility, level/exploded modes
- `useScene` — Pascal BIM nodes (loadScene / deleteNode)
- `useEditor` — furniture-catalog drag-to-place

New workspace-local state (in `Viewer.tsx`):

```ts
layout: 'studio' | 'precision'       // persists to localStorage
mode: '2d' | '3d' | 'split'
tool: 'select' | 'pan' | 'wall' | 'door' | 'window' | 'room' | 'measure' | 'comment' | 'furniture'
cutY: number                          // 0..1, drives SectionCut + wallMode
sun: number                           // 0..1 reserved for future sun-angle
hover: { label: string; meta: string } | null
cmdOpen: boolean
```

Prototype's `rot/tilt/zoom` redirect into r3f `OrbitControls` ref. Prototype camera presets `{iso, front, side, top, walk}` → existing `{isometric, front, right, top, perspective}`.

### Styling

1. `client/src/styles/tokens.css` (new) — ports `docs/design-system/project/colors_and_type.css` additions (`--ink-*`, `--line-*`, `--fg-*`, `--font-ui`, `--font-brand`, radii, shadows). Imported from top of `client/src/index.css`. Avoids redefining shadcn HSL tokens already present.
2. `client/src/components/viewer/workspace/workspace.css` — prototype's `styles.css` with every selector scoped under `.workspace-root` (one find/replace pass).
3. No Tailwind rewrite of prototype CSS — we import the file once and let it own the chrome. Shadcn components still work normally outside the workspace.

### Keyboard

| Key | Action |
|---|---|
| `V H W D N R M C` | Dock tools |
| `F` | Furniture popover |
| `2 3 \` | Plan / Model / Split |
| `⌘K / Ctrl+K` | Command palette |
| `Del / Backspace` | Delete selection (existing behaviour) |

### Generation flow preservation

`GeneratePopover` contains the four tool buttons and provider toggle exactly as the current left-sidebar:

- `generatePascalMutation` · `generateIsometricMutation` · `generate3DMutation` (Meshy/Trellis) · `retextureMutation` · `revertMutation`
- `onError` paywall + credit-limit handling unchanged
- Status polling via `useQuery.refetchInterval` unchanged
- Toast-on-complete, progress bar, `useScene.loadScene` on Pascal completion — all kept

### Data → UI mappings

| UI element | Source |
|---|---|
| Top-bar crumb | `project.name` |
| Avatars | Current user + collaborators (hard-coded demo list for now; real collab is out of scope) |
| Layers counts | `useScene.nodes` grouped by node type |
| Inspector | `useViewer.selectedIds[0]` → `useScene.getNode(id)` → kind-specific fields |
| Floor switcher | `useScene` level nodes + `useViewer.activeLevelId` |
| Status tri | r3f `gl.info.render.triangles` via a tiny hook |
| Status FPS | `@react-three/drei` `Stats` or a `requestAnimationFrame` counter |
| Status area | `scene.metadata.area` if present, else sum of level bounds |
| Section-cut value | `useViewer.wallMode` (`up`/`cutaway`/`down`) ↔ `cutY` (`0`/`0.5`/`1`) |

### Risks & mitigations

- **CSS collision** — prototype's generic `.sb-top`, `.sb-btn` etc. scoped under `.workspace-root` to avoid touching the rest of the app.
- **Camera preset name mismatch** — mapping layer in `CamIsland` (see above).
- **OrbitControls ref access** — `R3FCanvas` owns its own controls; expose a ref via a new `useViewer.setOrbitTarget` / `setOrbitAzimuth` pair, or just drive preset changes through the existing `setCameraPreset` — latter is simpler, preferred.
- **Paywall overlay z-index** — ensure `PaywallModal` renders above `CommandPalette` (`z-1001` vs `z-1000`).
- **Pascal scene reset on project unmount** — preserve `resetPascalWorkspace` cleanup in `Viewer.tsx`.
- **Split view layout thrash** — debounce window resize; use CSS grid, no JS measurement.
- **Tweaks panel in production** — gate with `import.meta.env.DEV`.

### Out of scope (follow-ups)

- Real wall/door/window drawing (wired to Pascal draw APIs) — Q5 stub
- Realtime multi-cursor collaboration — avatars are static
- Sun-angle slider with shadow casting — placeholder state only
- Saved-views timeline, minimap, annotations — prototype suggestions for later
