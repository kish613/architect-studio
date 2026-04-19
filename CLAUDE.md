# Architect Studio — Agent guide

## Design system

The canonical design system lives in [`docs/design-system/`](docs/design-system/). It was produced by Claude Design and contains:

- `project/SKILL.md` — skill manifest with non-negotiables (dark-mode canonical, Construction Orange `#F97316` only brand accent, 5-font system, Lucide icons only, UK spelling).
- `project/README.md` — full brand + visual breakdown (voice, palette, type, spacing, motion, iconography).
- `project/colors_and_type.css` — the authoritative CSS custom properties (must match `client/src/index.css`).
- `project/ui_kits/app/` — workspace recreations (Sidebar, BimEditor, Viewer3D, ProjectsGrid, UploadDrop, PlanningAnalysis).
- `project/ui_kits/marketing/` — landing recreations (HeroFrame, FeatureGrid, StatsStrip, Footer, LandingNav).
- `project/preview/` — isolated swatch / component HTML previews (colors-*, type-*, components-*).
- `chats/` — conversation history describing intent.

**Before designing any UI in this repo**, read [`docs/design-system/project/SKILL.md`](docs/design-system/project/SKILL.md), then the specific kit that matches the surface. Prefer `var(--primary)`, `var(--ink-3)`, `var(--line-2)` over raw hex. Copy components from `ui_kits/`, don't invent.

Non-negotiables to enforce on every change:

1. Dark-mode is canonical. Canvas `#0A0A0A`, step through ink-1/2/3/4/5.
2. One brand accent: Construction Orange `#F97316`. Blueprint blues only in logo + marketing hero.
3. Five fonts, five jobs: Space Grotesk (headings), Poppins (marketing body + CTAs), Inter (app body), JetBrains Mono (measurements), Montserrat (wordmark only).
4. Icons = Lucide, stroke 2, at 16/20/24/32. No emoji in product UI.
5. UK spelling: "analyse / analyses", "planning permission", "floorplan".
6. Glass is rare — only `.dark-glass-card` and the one `.hero-text-overlay`.
7. No blue/purple gradients. Use blur + inset highlight for depth, not stacked drop-shadows.

## Viewer architecture

The BIM workspace at `/projects/:id` lives in [`client/src/pages/Viewer.tsx`](client/src/pages/Viewer.tsx) — a thin orchestrator that composes chrome from [`client/src/components/viewer/workspace/`](client/src/components/viewer/workspace/). Two layouts (Studio / Precision) share one canvas surface that routes to the real renderer:

- Pascal BIM scene → [`R3FCanvas`](client/src/components/viewer/R3FCanvas.tsx) + [`SceneRenderer`](client/src/components/viewer/SceneRenderer.tsx)
- Meshy/Trellis GLB → [`Model3DViewer`](client/src/components/viewer/Model3DViewer.tsx)
- 2D plan → [`FloorplanCanvas`](client/src/components/viewer/FloorplanCanvas.tsx)
- no 3D source → empty-state card with "Generate 3D" CTA

State:
- `useViewer` (camera preset, selection, visibility, levels) — `client/src/stores/use-viewer.ts`
- `useScene` (Pascal BIM nodes) — `client/src/stores/use-scene.ts`
- `useEditor` (furniture catalog drag-to-place) — `client/src/stores/use-editor.ts`

Workspace CSS is scoped under `.workspace-root` to avoid leaking into other pages. Tokens additions live in `client/src/styles/tokens.css` and complement the shadcn HSL tokens in `client/src/index.css`. Design rationale, decisions, and the full 27-task implementation plan are in [`docs/plans/2026-04-19-viewer-workspace-redesign-design.md`](docs/plans/2026-04-19-viewer-workspace-redesign-design.md) and [`docs/plans/2026-04-19-viewer-workspace-redesign.md`](docs/plans/2026-04-19-viewer-workspace-redesign.md).

When extending the viewer: prefer adding a small component under `workspace/` and composing from `Viewer.tsx`; don't inline chrome in the page. Drawing tools (wall/door/window/room) in the dock are currently cursor-mode stubs — wiring them to Pascal's mutation APIs is a dedicated follow-up.
