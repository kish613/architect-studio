# Viewer Workspace Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `client/src/pages/Viewer.tsx` with a new full-bleed BIM workspace that matches the Claude Design prototype (Studio + Precision layouts), preserving all current functionality (Pascal BIM, Meshy/Trellis 3D, Isometric, Retexture, Paywall, Furniture catalog, Delete hotkey) and using only real r3f for 3D — no SVG "mock" stage.

**Architecture:** Thin page component orchestrates existing stores (`useViewer`, `useScene`, `useEditor`) + react-query mutations; chrome lives in `client/src/components/viewer/workspace/*`. Prototype's CSS ported verbatim and scoped under `.workspace-root`. Design-system tokens added via `client/src/styles/tokens.css`. 3D stage decides between R3FCanvas+SceneRenderer (Pascal), Model3DViewer (Meshy/Trellis GLB), or empty-state CTA.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind + shadcn/ui, Zustand stores, TanStack Query, @react-three/fiber, @react-three/drei, wouter, Lucide icons, vitest + @testing-library/react + happy-dom.

**Reference design docs:**
- [../design-system/project/SKILL.md](../design-system/project/SKILL.md) — non-negotiables
- [../design-system/project/README.md](../design-system/project/README.md) — full brand/visual spec
- [2026-04-19-viewer-workspace-redesign-design.md](2026-04-19-viewer-workspace-redesign-design.md) — approved design decisions
- Prototype source bundle (temp): `/tmp/design/archudio-viewer/project/viewer/` (`viewer.jsx`, `stage.jsx` ignore 3D SVG, `canvas_extras.jsx`, `styles.css`, `tokens.css`)

**Guiding rules:**
- DRY · YAGNI · TDD where it buys something (pure logic), component smoke tests elsewhere, visual verification via `preview_*` tools.
- Commit after every Task. Use the repo's existing commit style (`feat: …`, `refactor: …`) ending with `Co-Authored-By: Claude ...` only if the user requests.
- **Don't** delete `Viewer.tsx` until the new viewer renders and the smoke test passes. Use a feature branch, not main.
- **Don't** touch existing `Model3DViewer`, `R3FCanvas`, `SceneRenderer`, `FloorplanCanvas`, `FurnitureCatalogPanel`, `PaywallModal`, or the three Zustand stores. The new chrome wraps them.

---

## Phase 0 — Foundation

### Task 0.1: Add design-system tokens to the app

**Files:**
- Create: `client/src/styles/tokens.css`
- Modify: `client/src/index.css` (add one `@import` at top)

**Step 1:** Create `client/src/styles/tokens.css` with **only the tokens missing from `index.css`** (current `index.css` already defines `--primary`, `--font-sans`, `--font-display`, `--font-poppins`). Add the rest verbatim from [docs/design-system/project/colors_and_type.css](../design-system/project/colors_and_type.css):

```css
/* Imported from the saved design system. Only tokens not already in index.css. */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap');

:root {
  /* Fonts — alias role-based families */
  --font-ui: 'Poppins', 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  --font-brand: 'Montserrat', 'Space Grotesk', sans-serif;

  /* Type scale */
  --fs-12: 0.75rem; --fs-13: 0.8125rem; --fs-14: 0.875rem; --fs-16: 1rem;
  --fs-18: 1.125rem; --fs-20: 1.25rem; --fs-24: 1.5rem; --fs-32: 2rem;
  --fs-40: 2.5rem; --fs-48: 3rem; --fs-64: 4rem;

  --lh-tight: 1.05; --lh-snug: 1.2; --lh-body: 1.5; --lh-loose: 1.65;
  --tracking-tight: -0.02em; --tracking-normal: 0; --tracking-wide: 0.08em;

  /* Ink canvas — NEW */
  --ink-0: #0A0A0A; --ink-1: #0F0F0F; --ink-2: #111111;
  --ink-3: #161616; --ink-4: #1a1a1a; --ink-5: #222222; --ink-6: #2A2A2A;

  /* Hairlines */
  --line-1: rgba(255,255,255,0.04);
  --line-2: rgba(255,255,255,0.08);
  --line-3: rgba(255,255,255,0.15);
  --line-4: rgba(255,255,255,0.25);

  /* Foreground tiers */
  --fg-1: rgba(255,255,255,0.92);
  --fg-2: rgba(255,255,255,0.70);
  --fg-3: rgba(255,255,255,0.50);
  --fg-4: rgba(255,255,255,0.30);

  /* Brand scale (primary already exists, add scale) */
  --brand-50:#FFF5EB; --brand-100:#FFE4CC; --brand-200:#FFC48F; --brand-300:#FFA352;
  --brand-400:#FB8530; --brand-500:#F97316; --brand-600:#EA580C; --brand-700:#C2410C;
  --brand-800:#9A3412; --brand-900:#7C2D12;

  /* Blueprint */
  --bp-navy:#003087; --bp-cyan:#00AEEF; --bp-cyan-2:#0891B2; --bp-cyan-3:#06B6D4;

  /* Success / warning aliases the prototype uses */
  --success:#10B981; --success-fg:#6EE7B7; --warning:#F59E0B; --danger:#DC2626;

  /* Radii */
  --r-xs:4px; --r-sm:8px; --r-md:12px; --r-lg:16px; --r-xl:20px;
  --r-2xl:24px; --r-3xl:32px; --r-pill:9999px;

  /* Spacing scale */
  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:20px; --s-6:24px;
  --s-8:32px; --s-10:40px; --s-12:48px; --s-16:64px; --s-20:80px; --s-24:96px;

  /* Motion */
  --ease-standard: cubic-bezier(0.25,0.46,0.45,0.94);
  --ease-out: cubic-bezier(0.16,1,0.3,1);
  --ease-in-out: cubic-bezier(0.4,0,0.2,1);
  --dur-fast:150ms; --dur-normal:250ms; --dur-slow:400ms; --dur-ambient:6s;

  /* Shadows specific to prototype */
  --shadow-glass-dark: 0 8px 32px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.05);
}
```

**Step 2:** Modify `client/src/index.css` to import the new tokens file at the very top:
```css
@import "./styles/tokens.css";
```

**Step 3:** Run dev server check — ensure Vite still compiles.

Run: `npm run build` (or `npm run typecheck` if faster)
Expected: clean build.

**Step 4:** Commit.
```bash
git add client/src/styles/tokens.css client/src/index.css
git commit -m "feat(viewer): add design-system tokens"
```

---

### Task 0.2: Port prototype workspace CSS, scoped under `.workspace-root`

**Files:**
- Create: `client/src/components/viewer/workspace/workspace.css`

**Step 1:** Copy the full contents of `/tmp/design/archudio-viewer/project/viewer/styles.css` into the new file, deleting the first `@import url('./tokens.css');` line (already handled globally).

**Step 2:** Scope every selector. Add `.workspace-root ` prefix to `.studio`, `.sb-top`, `.sb-stage`, `.sb-panel`, `.sb-rail`, `.sb-tool`, `.sb-canvas`, `.sb-stage-svg`, `.sb-hud-coords`, `.sb-hud-scale`, `.sb-island`, `.sb-dock`, `.sb-cam`, `.sb-layers-island`, `.sb-props-island`, `.sb-viewbar`, `.sb-seg`, `.sb-layers`, `.sb-layer`, `.sb-prop`, `.sb-sel`, `.sb-field`, `.sb-mats`, `.sb-mat`, `.sb-cmd-trigger`, `.sb-section-cut`, `.sb-statusbar`, `.sb-stat`, `.tweaks`, `.sel-glow`, `@keyframes` stay global. Change `html, body` rule to only apply `overflow:hidden; margin:0` under `.workspace-root { position:fixed; inset:0; overflow:hidden; ... }` — **do not** change global body overflow.

**Step 3:** Add a new wrapper block at the top:
```css
.workspace-root {
  position: fixed; inset: 0;
  background: #050505;
  color: var(--fg-1);
  font-family: var(--font-sans);
  font-feature-settings: 'ss01','cv11','tnum';
  z-index: 50;
}
.workspace-root * { box-sizing: border-box; }
```

**Step 4:** No commit yet — next task imports it.

---

### Task 0.3: Create `WorkspaceRoot` shell

**Files:**
- Create: `client/src/components/viewer/workspace/WorkspaceRoot.tsx`
- Create: `client/src/components/viewer/workspace/__tests__/WorkspaceRoot.test.tsx`

**Step 1 (test):**
```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { WorkspaceRoot } from "../WorkspaceRoot";

describe("WorkspaceRoot", () => {
  it("renders children inside scoped root with data-layout", () => {
    render(
      <WorkspaceRoot layout="studio">
        <span>hello</span>
      </WorkspaceRoot>
    );
    const root = screen.getByText("hello").closest(".workspace-root");
    expect(root).not.toBeNull();
    expect(root).toHaveAttribute("data-layout", "studio");
  });
});
```

**Step 2:** Run `npm test -- WorkspaceRoot` → expect FAIL (module not found).

**Step 3:** Write `WorkspaceRoot.tsx`:
```tsx
import "./workspace.css";
import type { PropsWithChildren } from "react";

export type WorkspaceLayout = "studio" | "precision";

export function WorkspaceRoot({ layout, children }: PropsWithChildren<{ layout: WorkspaceLayout }>) {
  return (
    <div className="workspace-root studio" data-layout={layout}>
      {children}
    </div>
  );
}
```

**Step 4:** Run `npm test -- WorkspaceRoot` → expect PASS.

**Step 5:** Commit.
```bash
git add client/src/components/viewer/workspace/workspace.css \
        client/src/components/viewer/workspace/WorkspaceRoot.tsx \
        client/src/components/viewer/workspace/__tests__/WorkspaceRoot.test.tsx
git commit -m "feat(viewer): scaffold workspace shell + scoped CSS"
```

---

## Phase 1 — Presets & mapping helpers (pure logic, TDD)

### Task 1.1: Camera preset mapper

**Files:**
- Create: `client/src/components/viewer/workspace/camera-presets.ts`
- Create: `client/src/components/viewer/workspace/__tests__/camera-presets.test.ts`

**Step 1 (test):**
```ts
import { describe, it, expect } from "vitest";
import { toStorePreset, STUDIO_PRESETS } from "../camera-presets";

describe("camera preset mapping", () => {
  it("maps prototype preset ids to useViewer CameraPreset", () => {
    expect(toStorePreset("iso")).toBe("isometric");
    expect(toStorePreset("front")).toBe("front");
    expect(toStorePreset("side")).toBe("right");
    expect(toStorePreset("top")).toBe("top");
    expect(toStorePreset("walk")).toBe("perspective");
  });

  it("exposes all five presets in order", () => {
    expect(STUDIO_PRESETS.map(p => p.id)).toEqual(["iso", "front", "side", "top", "walk"]);
  });
});
```

**Step 2:** Run → FAIL.

**Step 3:** Implement:
```ts
import type { CameraPreset as StorePreset } from "@/stores/use-viewer";

export type PresetId = "iso" | "front" | "side" | "top" | "walk";
export const STUDIO_PRESETS: Array<{ id: PresetId; icon: string; label: string }> = [
  { id: "iso",   icon: "box",        label: "Isometric" },
  { id: "front", icon: "square",     label: "Front" },
  { id: "side",  icon: "columns-2",  label: "Side" },
  { id: "top",   icon: "scan",       label: "Top" },
  { id: "walk",  icon: "footprints", label: "Walk" },
];
const MAP: Record<PresetId, StorePreset> = {
  iso: "isometric", front: "front", side: "right", top: "top", walk: "perspective",
};
export function toStorePreset(id: PresetId): StorePreset { return MAP[id]; }
```

**Step 4:** Run → PASS.

**Step 5:** Commit.
```bash
git commit -am "feat(viewer): camera preset mapping"
```

---

### Task 1.2: Layer counts from Pascal scene

**Files:**
- Create: `client/src/components/viewer/workspace/layer-stats.ts`
- Create: `client/src/components/viewer/workspace/__tests__/layer-stats.test.ts`

**Step 1 (test):**
```ts
import { describe, it, expect } from "vitest";
import { countLayers, WORKSPACE_LAYERS } from "../layer-stats";

describe("countLayers", () => {
  it("groups scene nodes by layer id", () => {
    const nodes = {
      a: { kind: "wall" }, b: { kind: "wall" }, c: { kind: "door" },
      d: { kind: "window" }, e: { kind: "item" }, f: { kind: "zone" },
    } as any;
    const counts = countLayers(nodes);
    expect(counts.walls).toBe(2);
    expect(counts.doors).toBe(1);
    expect(counts.windows).toBe(1);
    expect(counts.furn).toBe(1);
    expect(counts.soft).toBe(0);
  });

  it("exposes 8 layers in display order", () => {
    expect(WORKSPACE_LAYERS.map(l => l.id)).toEqual(
      ["walls","doors","windows","furn","soft","light","dims","grid"]
    );
  });
});
```

**Step 2:** Run → FAIL.

**Step 3:** Implement — derive kind strings from the existing Pascal node kinds:
```ts
export type LayerId = "walls"|"doors"|"windows"|"furn"|"soft"|"light"|"dims"|"grid";

export const WORKSPACE_LAYERS: Array<{id: LayerId; name: string; swatch: string; kinds: string[]}> = [
  { id: "walls",   name: "Walls & Structure", swatch: "#F97316", kinds: ["wall","slab","roof"] },
  { id: "doors",   name: "Doors & Openings",  swatch: "#00AEEF", kinds: ["door"] },
  { id: "windows", name: "Windows & Glazing", swatch: "#06B6D4", kinds: ["window"] },
  { id: "furn",    name: "Furniture",         swatch: "#B58C5F", kinds: ["item"] },
  { id: "soft",    name: "Soft Furnishings",  swatch: "#7A6957", kinds: ["zone"] },
  { id: "light",   name: "Lighting",          swatch: "#FDE68A", kinds: ["light"] },
  { id: "dims",    name: "Dimensions",        swatch: "#ffffff33", kinds: [] },
  { id: "grid",    name: "Grid & Guides",     swatch: "#ffffff22", kinds: [] },
];

export function countLayers(nodes: Record<string, { kind?: string } | undefined> | undefined | null): Record<LayerId, number> {
  const result = Object.fromEntries(WORKSPACE_LAYERS.map(l => [l.id, 0])) as Record<LayerId, number>;
  if (!nodes) return result;
  for (const node of Object.values(nodes)) {
    if (!node?.kind) continue;
    for (const layer of WORKSPACE_LAYERS) {
      if (layer.kinds.includes(node.kind)) { result[layer.id]++; break; }
    }
  }
  return result;
}
```

**Step 4:** Run → PASS.

**Step 5:** Commit.
```bash
git commit -am "feat(viewer): layer counts from Pascal scene"
```

---

### Task 1.3: `cutY` ↔ `wallMode` mapping

**Files:**
- Create: `client/src/components/viewer/workspace/section-cut.ts`
- Create: `client/src/components/viewer/workspace/__tests__/section-cut.test.ts`

**Step 1 (test):**
```ts
import { describe, it, expect } from "vitest";
import { cutYToWallMode, wallModeToCutY } from "../section-cut";

describe("section-cut mapping", () => {
  it("maps 0..0.33 to 'up'", () => expect(cutYToWallMode(0)).toBe("up"));
  it("maps 0.33..0.66 to 'cutaway'", () => expect(cutYToWallMode(0.5)).toBe("cutaway"));
  it("maps >= 0.66 to 'down'", () => expect(cutYToWallMode(0.9)).toBe("down"));
  it("reverse maps wall modes to canonical cutY", () => {
    expect(wallModeToCutY("up")).toBe(0);
    expect(wallModeToCutY("cutaway")).toBe(0.5);
    expect(wallModeToCutY("down")).toBe(1);
  });
});
```

**Step 2:** Run → FAIL.

**Step 3:** Implement.
```ts
import type { WallMode } from "@/stores/use-viewer";
export function cutYToWallMode(y: number): WallMode {
  if (y < 1/3) return "up";
  if (y < 2/3) return "cutaway";
  return "down";
}
export function wallModeToCutY(m: WallMode): number {
  return m === "up" ? 0 : m === "cutaway" ? 0.5 : 1;
}
```

**Step 4:** Run → PASS. Commit.
```bash
git commit -am "feat(viewer): section-cut ↔ wall-mode mapping"
```

---

## Phase 2 — Top bar

### Task 2.1: `ModeSwitcher` component

**Files:**
- Create: `client/src/components/viewer/workspace/ModeSwitcher.tsx`
- Create: `client/src/components/viewer/workspace/__tests__/ModeSwitcher.test.tsx`

**Step 1 (test):** 3 tabs render, clicking one calls `onChange`, active tab has `.active` class.

**Step 2:** Run → FAIL.

**Step 3:** Implement per `/tmp/design/archudio-viewer/project/viewer/viewer.jsx` lines 89-99 — same markup, typed, without `data-lucide` (use `lucide-react`):
```tsx
import { LayoutGrid, Columns2, Box } from "lucide-react";

export type ViewerMode = "2d" | "split" | "3d";
interface Props { mode: ViewerMode; onChange: (m: ViewerMode) => void }

export function ModeSwitcher({ mode, onChange }: Props) {
  return (
    <div className="sb-top-c">
      <button className={`sb-mode-btn ${mode==="2d"?"active":""}`} onClick={() => onChange("2d")}>
        <LayoutGrid className="size-3.5" />Plan<kbd>2</kbd>
      </button>
      <button className={`sb-mode-btn ${mode==="split"?"active":""}`} onClick={() => onChange("split")}>
        <Columns2 className="size-3.5" />Split<kbd>\</kbd>
      </button>
      <button className={`sb-mode-btn ${mode==="3d"?"active":""}`} onClick={() => onChange("3d")}>
        <Box className="size-3.5" />Model<kbd>3</kbd>
      </button>
    </div>
  );
}
```

**Step 4:** Test PASS. Commit.

---

### Task 2.2: `TopBar` component (no Generate popover yet)

**Files:**
- Create: `client/src/components/viewer/workspace/TopBar.tsx`
- Create: `client/src/components/viewer/workspace/__tests__/TopBar.test.tsx`

**Step 1 (test):** Renders crumb text, calls `onOpenCmd` on ⌘K click, shows Export button.

**Step 2:** Implement — port prototype `viewer.jsx:73-116`. Use `<UserAvatar>` SVG from lines 75-80 verbatim. Replace `<i data-lucide>` with Lucide React imports. Props:
```ts
interface TopBarProps {
  projectName: string;
  mode: ViewerMode;
  onMode: (m: ViewerMode) => void;
  onOpenCmd: () => void;
  onExport?: () => void;
  rightSlot?: React.ReactNode;  // Generate popover goes here
}
```

Leave a `rightSlot` render spot between the `<sb-avatars>` and the Share button for `GeneratePopover` later.

**Step 3:** Test PASS. Commit.

---

## Phase 3 — Stage surface

### Task 3.1: `CanvasSurface` — picks renderer based on project state

**Files:**
- Create: `client/src/components/viewer/workspace/CanvasSurface.tsx`
- Create: `client/src/components/viewer/workspace/__tests__/CanvasSurface.test.tsx`

**Step 1 (test):** Given props, renders the right element. Mock `FloorplanCanvas`, `Model3DViewer`, `R3FCanvas`, `SceneRenderer` via `vi.mock`.

```tsx
vi.mock("@/components/viewer/FloorplanCanvas", () => ({ FloorplanCanvas: () => <div data-testid="fp-2d"/> }));
vi.mock("@/components/viewer/Model3DViewer", () => ({ Model3DViewer: () => <div data-testid="m3d"/> }));
vi.mock("@/components/viewer/R3FCanvas", () => ({ R3FCanvas: ({children}:any) => <div data-testid="r3f">{children}</div> }));
vi.mock("@/components/viewer/SceneRenderer", () => ({ SceneRenderer: () => <div data-testid="scene"/> }));

// mode='2d' → FloorplanCanvas renders
// mode='3d' & hasPascal → R3FCanvas + SceneRenderer
// mode='3d' & !hasPascal & modelUrl → Model3DViewer
// mode='3d' & neither → empty-state with "Generate 3D" button (calls onGenerate)
// mode='split' → both
```

**Step 2:** Implement. Empty state should use design-system tokens (`.dark-glass-card` look — but inline since we're inside `.workspace-root`). Include a primary CTA button that calls `onGenerate`.

**Step 3:** Test PASS. Commit.
```bash
git commit -am "feat(viewer): canvas surface routes to real renderer"
```

---

### Task 3.2: `SplitStage` — 2D left, 3D right

**Files:**
- Create: `client/src/components/viewer/workspace/SplitStage.tsx`

**Step 1:** Small CSS-grid wrapper. No new test — covered by CanvasSurface test above.

**Step 2:** Commit under next task's commit.

---

### Task 3.3: `HoverTag`, `HUD`, `FloorSwitcher`, `SectionCut` primitives

**Files:**
- Create: `client/src/components/viewer/workspace/HoverTag.tsx`
- Create: `client/src/components/viewer/workspace/HUD.tsx`
- Create: `client/src/components/viewer/workspace/FloorSwitcher.tsx`
- Create: `client/src/components/viewer/workspace/SectionCut.tsx`

**Step 1:** Port each 1:1 from prototype `canvas_extras.jsx` + relevant sections of `viewer.jsx`:
- `HoverTag` from `canvas_extras.jsx:39-55`
- `HUD` from `viewer.jsx:406-421`
- `FloorSwitcher` from `canvas_extras.jsx:57-83` — but read floors from `useViewer.activeLevelId` + `useScene` level nodes (not prop).
- `SectionCut` from `viewer.jsx:237-245` — wire `onChange` to `useViewer.setWallMode` via the `cutYToWallMode` helper.

**Step 2:** Lightweight render smoke test for each (optional — prioritise `FloorSwitcher` since it has store wiring).

**Step 3:** Commit.
```bash
git commit -am "feat(viewer): hover tag, HUD, floor switcher, section cut"
```

---

## Phase 4 — Studio islands

### Task 4.1: `ToolDock`

**Files:**
- Create: `client/src/components/viewer/workspace/ToolDock.tsx`
- Create: `client/src/components/viewer/workspace/tools.ts`  (shared tool list + keyboard table)

**Step 1:** Create `tools.ts`:
```ts
import type { LucideIcon } from "lucide-react";
import { MousePointer2, Hand, Minus, DoorOpen, SquareDashed, Square, Ruler, MessageSquare, Sofa } from "lucide-react";
export type ToolId = "select"|"pan"|"wall"|"door"|"window"|"room"|"measure"|"comment"|"furniture";
export const TOOLS: Array<{ id: ToolId; icon: LucideIcon; label: string; k: string }> = [
  { id:"select",  icon: MousePointer2, label:"Select",  k:"V" },
  { id:"pan",     icon: Hand,          label:"Pan",     k:"H" },
  { id:"wall",    icon: Minus,         label:"Wall",    k:"W" },
  { id:"door",    icon: DoorOpen,      label:"Door",    k:"D" },
  { id:"window",  icon: SquareDashed,  label:"Window",  k:"N" },
  { id:"room",    icon: Square,        label:"Room",    k:"R" },
  { id:"measure", icon: Ruler,         label:"Measure", k:"M" },
  { id:"comment", icon: MessageSquare, label:"Comment", k:"C" },
  { id:"furniture", icon: Sofa,        label:"Furniture", k:"F" },
];
```

**Step 2:** Write `ToolDock.tsx` — ported from `viewer.jsx:210-220`. Bottom center island.

**Step 3:** Commit.

---

### Task 4.2: `CamIsland` (right, 3D only)

**Files:**
- Create: `client/src/components/viewer/workspace/CamIsland.tsx`

**Step 1:** Port prototype `viewer.jsx:222-234`. On preset click, call `useViewer.getState().setCameraPreset(toStorePreset(id))`. Include Sun and Frame buttons (stub onClick for now).

**Step 2:** Commit.

---

### Task 4.3: `LayersIsland` — real layer counts + visibility

**Files:**
- Create: `client/src/components/viewer/workspace/LayersIsland.tsx`

**Step 1:** Uses `countLayers` helper + `useViewer` visibility flags for the toggle state. Map layer id → visibility key:
```ts
const VIS_KEY: Record<LayerId, Parameters<typeof toggleVisibility>[0] | null> = {
  walls:"showWalls", doors:"showWalls", windows:"showWindows",
  furn:"showItems", soft:"showZones", light:null, dims:"showDimensions", grid:"showGrid",
};
```
Rows render from `WORKSPACE_LAYERS`; counts from `countLayers(nodes)`; onClick toggles the corresponding visibility key via `toggleVisibility`.

**Step 2:** Commit.

---

### Task 4.4: `PropsIsland` / `Inspector` — real selection

**Files:**
- Create: `client/src/components/viewer/workspace/Inspector.tsx`

**Step 1:** Read `useViewer.selectedIds[0]` and `useScene.getState().nodes[id]`. For this first pass, handle `kind === "wall" | "item" | "door" | "window" | "zone"`:

- Label = `node.name || node.kind`
- Transform = `node.transform?.position` (X/Y) and `rotation`
- Dimensions = `node.dimensions?.w/d/h`
- Material = `node.material?.hex` — render materials grid from `WORKSPACE_MATERIALS` (port of `window.MATERIALS` from prototype `models.js:155-166`) and highlight when equal.
- Planning block → static for now (same copy as prototype).
- Empty state: "Nothing selected. Click something in the scene."

**Step 2:** Export `WORKSPACE_MATERIALS` from a new `materials.ts` file.

**Step 3:** Commit.
```bash
git commit -am "feat(viewer): inspector with real scene selection"
```

---

## Phase 5 — Precision layout

### Task 5.1: `Rail` — left-edge tool rail

**Files:**
- Create: `client/src/components/viewer/workspace/Rail.tsx`

**Step 1:** Port `viewer.jsx:258-270`. Iterates `TOOLS` from `tools.ts`.

**Step 2:** Commit.

---

### Task 5.2: `SceneTreePanel` — layers + rooms

**Files:**
- Create: `client/src/components/viewer/workspace/SceneTreePanel.tsx`

**Step 1:** Port `viewer.jsx:273-305`. Layers block reuses `LayersIsland` content. Rooms block iterates zone/level nodes from `useScene.nodes`.

**Step 2:** Commit.

---

### Task 5.3: `StudioStage` + `PrecisionStage`

**Files:**
- Create: `client/src/components/viewer/workspace/StudioStage.tsx`
- Create: `client/src/components/viewer/workspace/PrecisionStage.tsx`

**Step 1:** `StudioStage` composes: `<CanvasSurface>` + `<HoverTag>` + `<FloorSwitcher>` + `<LayersIsland>` + `<Inspector>` (rendered as `.sb-props-island`) + `<ToolDock>` + `<CamIsland>` + `<SectionCut>` + `<HUD>`.

**Step 2:** `PrecisionStage`: `<Rail>` + `<SceneTreePanel>` + `<CanvasSurface>` (with ViewBar overlay) + `<Inspector>` (full right panel).

**Step 3:** No new logic — layout only. No test needed.

**Step 4:** Commit.
```bash
git commit -am "feat(viewer): studio and precision stage layouts"
```

---

## Phase 6 — Generation popover

### Task 6.1: `GeneratePopover` — wraps existing mutations

**Files:**
- Create: `client/src/components/viewer/workspace/GeneratePopover.tsx`

**Step 1:** Renders a shadcn `<Popover>` triggered by a "Generate" button in `TopBar.rightSlot`. Inside, four actions matching the current `Viewer.tsx:398-474` generation buttons:

- **Pascal Geometric** — calls `generatePascalMutation.mutate(model.id)`
- **Isometric Render** — opens a textarea for `customPrompt`, calls `generateIsometricMutation.mutate({ modelId, prompt })`
- **3D Mesh** — provider toggle (Meshy ↔ Trellis) via `provider3D` local state, calls `generate3DMutation`
- **Retexture** — textarea for `texturePrompt`, calls `retextureMutation`
- **Revert texture** (button) — `revertMutation`

Props:
```ts
interface GeneratePopoverProps {
  modelId: number;
  isGenerating: boolean;
  progress: number;
  // status flags
  hasIsometric: boolean; has3D: boolean; hasPascal: boolean;
  // mutations
  generatePascalMutation: UseMutationResult<any, Error, number, unknown>;
  generateIsometricMutation: UseMutationResult<any, Error, { modelId: number; prompt?: string }, unknown>;
  generate3DMutation: UseMutationResult<any, Error, number, unknown>;
  retextureMutation: UseMutationResult<any, Error, { modelId: number; prompt: string }, unknown>;
  revertMutation: UseMutationResult<any, Error, number, unknown>;
}
```

**Step 2:** Don't re-implement paywall trigger — existing `onError` handlers in the mutations already do this. The popover just calls `.mutate`.

**Step 3:** Commit.

---

## Phase 7 — Command palette

### Task 7.1: `CommandPalette` — portal, fuzzy filter

**Files:**
- Create: `client/src/components/viewer/workspace/CommandPalette.tsx`

**Step 1:** Port `viewer.jsx:424-465` verbatim (typed). Actions:

```
- mode:2d|split|3d
- cam:iso|front|side|top|walk
- layout:studio|precision
- gen:pascal|isometric|3d|retexture
```

Callback: `onPick(action: string) => void`. Parent maps the string to the right handler.

**Step 2:** Keyboard: mount a portal, close on Escape, autofocus input.

**Step 3:** Commit.

---

## Phase 8 — Furniture

### Task 8.1: `FurniturePopover` — dock-tool trigger

**Files:**
- Create: `client/src/components/viewer/workspace/FurniturePopover.tsx`

**Step 1:** When `tool === "furniture"`, render a floating island (`.sb-island`) at the bottom-right above the dock with the existing `<FurnitureCatalogPanel />` inside. Don't reimplement the catalog.

**Step 2:** In Precision layout, passing `asInspector` prop causes it to render in place of `<Inspector>` in the right panel.

**Step 3:** Commit.

---

## Phase 9 — Status bar + dev tweaks

### Task 9.1: `StatusBar`

**Files:**
- Create: `client/src/components/viewer/workspace/StatusBar.tsx`

**Step 1:** Port `viewer.jsx:125-137`. Props: `{ modelDims, modelArea, roomCount, triCount, fps, layerCount, version }`. Start with `triCount={0} fps={60}` — real measurements are a follow-up.

**Step 2:** Commit.

---

### Task 9.2: `TweaksPanel` (dev only)

**Files:**
- Create: `client/src/components/viewer/workspace/TweaksPanel.tsx`

**Step 1:** Port `index.html:57-77`. Gate with `if (!import.meta.env.DEV) return null;`. Open/close via a floating gear icon in the bottom-right (above status bar). Switches `layout`. Model switcher removed — in prod we only have one project.

**Step 2:** Commit.

---

## Phase 10 — Wire it into `Viewer.tsx`

### Task 10.1: Smoke test the new Viewer before replacing

**Files:**
- Create: `client/src/pages/Viewer.new.tsx`  (will later become `Viewer.tsx`)
- Modify: `client/src/App.tsx` — temporary route `/projects/:id/v2`

**Step 1:** Build `Viewer.new.tsx` — ~150 LOC. Data layer copied verbatim from old `Viewer.tsx:108-358` (everything up to the render return). UI layer:

```tsx
const [layout, setLayout] = useLocalStorage<WorkspaceLayout>("viewer:layout", "studio");
const [mode, setMode]   = useState<ViewerMode>("3d");
const [tool, setTool]   = useState<ToolId>("select");
const [cutY, setCutY]   = useState(0);
const [sun, setSun]     = useState(0.6);
const [hover, setHover] = useState<HoverInfo | null>(null);
const [cmdOpen, setCmdOpen] = useState(false);

// Keyboard
useWorkspaceShortcuts({ setTool, setMode, setCmdOpen });

return (
  <>
    <WorkspaceRoot layout={layout}>
      <TopBar
        projectName={project.name}
        mode={mode}
        onMode={setMode}
        onOpenCmd={() => setCmdOpen(true)}
        rightSlot={<GeneratePopover {...generationProps} />}
      />
      {layout === "studio"
        ? <StudioStage {...stageProps} />
        : <PrecisionStage {...stageProps} />}
      <StatusBar {...statusProps} />
      <FurniturePopover tool={tool} />
      <TweaksPanel layout={layout} onLayout={setLayout} />
    </WorkspaceRoot>
    {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} onPick={handleCmd} />}
    <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} />
  </>
);
```

**Step 2:** Add a temporary route in `App.tsx`:
```tsx
import { Viewer as NewViewer } from "@/pages/Viewer.new";
<Route path="/projects/:id/v2" component={NewViewer} />
```

**Step 3:** Smoke test in preview:

```
preview_start
preview_eval: window.location.href = "/projects/1/v2" (or any real project id)
preview_console_logs — check for errors
preview_snapshot — verify top bar, dock, inspector all rendered
```

Fix any type or runtime errors before proceeding.

**Step 4:** Commit.
```bash
git commit -am "feat(viewer): new workspace viewer behind /v2 route for verification"
```

---

### Task 10.2: Swap in the new viewer

**Files:**
- Delete: `client/src/pages/Viewer.tsx`
- Rename: `client/src/pages/Viewer.new.tsx` → `client/src/pages/Viewer.tsx`
- Modify: `client/src/App.tsx` — remove the `/v2` route; main `/projects/:id` now uses the new component.

**Step 1:**
```bash
git rm client/src/pages/Viewer.tsx
git mv client/src/pages/Viewer.new.tsx client/src/pages/Viewer.tsx
```

**Step 2:** Revert `App.tsx` back to one route.

**Step 3:** Full preview test on the main route `/projects/:id` with a real project that has Pascal data, one with only Meshy, one with neither. For each, verify:
- 2D mode renders `FloorplanCanvas`
- 3D mode renders correct engine (R3F scene / Model3DViewer / empty CTA)
- Split mode shows both
- Camera presets work
- ⌘K opens and runs commands
- Delete hotkey still removes a selected node
- Paywall modal opens when credits exhausted (or we simulate a `credit_limit` error)
- Generation mutations still fire

**Step 4:** Commit.
```bash
git add -A
git commit -m "refactor(viewer): replace legacy viewer with workspace redesign"
```

---

## Phase 11 — Visual verification + polish

### Task 11.1: Pixel parity vs. prototype

**Step 1:** Render the prototype locally — `python3 -m http.server -d /tmp/design/archudio-viewer/project/viewer 7777` — open side-by-side with production `/projects/:id`.

**Step 2:** For each screen region — top bar / dock / camera island / layers / inspector / status bar / ⌘K — compare. Fix differences in `workspace.css`.

**Step 3:** Use `preview_screenshot` before/after each fix.

**Step 4:** One combined commit at end.
```bash
git commit -am "style(viewer): pixel parity with prototype"
```

---

### Task 11.2: Regression smoke pass

**Step 1:** Run:
```bash
npm run test
npm run build
```
Both must pass.

**Step 2:** Click through unrelated pages (`/`, `/projects`, `/upload`, `/planning`) in preview to confirm the scoped CSS didn't leak.

**Step 3:** Commit only if any fix needed.

---

## Phase 12 — Cleanup

### Task 12.1: Remove dead code

**Files:** any unused helpers extracted from the old `Viewer.tsx`.

**Step 1:** Grep for orphans:
```bash
rg "Viewer\.legacy|Viewer\.old|Viewer\.new" client/src
```

**Step 2:** Delete.

**Step 3:** Commit.

---

### Task 12.2: Update `CLAUDE.md` with a viewer note

Add a short `## Viewer architecture` section pointing readers at `client/src/components/viewer/workspace/` + the design doc.

Commit.

---

## Verification checklist (done when all pass)

- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] `/projects/:id` renders with Pascal data → R3F scene in 3D mode
- [ ] `/projects/:id` renders with Meshy model only → Model3DViewer in 3D mode
- [ ] `/projects/:id` renders with no model → empty-state CTA that opens GeneratePopover
- [ ] Split mode shows FloorplanCanvas left, 3D right
- [ ] ⌘K opens and filters
- [ ] Camera presets animate OrbitControls
- [ ] Delete hotkey removes selection
- [ ] Paywall opens on credit-limit mutation error
- [ ] Drawing tools change cursor mode (no geometry side-effects)
- [ ] Furniture tool opens popover with `FurnitureCatalogPanel`
- [ ] Studio/Precision toggle via Tweaks in dev
- [ ] No emoji, no blue/purple gradients, no off-brand accents
- [ ] Scoped CSS — other pages unaffected
