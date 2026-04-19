---
name: architect-studio-design-system
description: Design system for Architect Studio — AI-powered 2D→3D floorplan product. Dark-mode first, Construction Orange (#F97316) accent on inky #0A0A0A canvas with blueprint-blue hero gradients. Use this skill whenever designing any Architect Studio surface (marketing landing, pricing, projects workspace, upload flow, BIM editor, 3D viewer, planning analysis).
---

# Architect Studio — Design System

Source of truth: **this folder**. Start with `README.md` for a complete brand + visual breakdown, then pull the specific pieces you need.

## Quick reference

| I need to design… | Read |
|---|---|
| A landing page, hero, pricing, marketing section | `ui_kits/marketing/*.jsx`, `preview/kit-marketing.html` |
| A workspace screen (projects, BIM editor, 3D viewer, planning) | `ui_kits/app/*.jsx`, `preview/kit-app.html` |
| Color, type, spacing, radii, shadow tokens | `colors_and_type.css` — the one source of vars |
| A swatch / badge / button / input / stat card | `preview/components-*.html`, `preview/colors-*.html`, `preview/type-*.html` |
| The logo | `assets/logo-architect-studio.svg` (animated wordmark), `logo-mark.svg`, `logo-mark-dark.svg` |

## Non-negotiables

1. **Dark mode is canonical.** Canvas `#0A0A0A` (var `--ink-0`), cards step through `#0F / #11 / #16 / #1a`. Hairline borders at 4–8% white.
2. **One brand accent: Construction Orange `#F97316`** (`--brand-500` / `--primary`). Blueprint blues (`#003087` navy + `#00AEEF` cyan) live **only** in the logo and the marketing hero gradient span — never as app UI accents.
3. **Five fonts, five jobs.** Space Grotesk = headings. Poppins = marketing body + CTAs. Inter = app body. JetBrains Mono = measurements/code. Montserrat = wordmark ONLY.
4. **No emoji in product UI.** Icons are Lucide, stroke 2, at 16 / 20 / 24 / 32 px. See `README.md` § Iconography for the per-surface cheat sheet.
5. **Glass is rare.** `.dark-glass-card` for info cards; the pure-white `.hero-text-overlay` runs exactly once, dropped over the hero photo grid.
6. **No blue/purple gradients.** Warm orange + blueprint-blue only. If you want depth, use blur + inset highlight, not stacked drop-shadows.
7. **UK spelling + terminology.** "Analyse / analyses", "planning permission" (never "building permit"), "floorplan" not "photo", "AI-powered" (adjectival).

## Using this skill

- **Copy, don't reference.** Lift components from `ui_kits/` into your working file. The kits import `../../colors_and_type.css` — update the relative path.
- **Start with the kit that matches the surface**, not from scratch. A new pricing page extends `ui_kits/marketing/`. A new Settings screen extends `ui_kits/app/` (sidebar + `.app-main` frame).
- **Token-first.** Prefer `var(--primary)`, `var(--ink-3)`, `var(--line-2)` over raw hex. The token scale is stable.
- **Placeholders are OK.** Architectural photography isn't included — use gradient tiles (`linear-gradient(135deg, #1e3a8a, #0ea5e9)` etc.) at `aspect-ratio: 4/3` as seen in `ProjectsGrid.jsx`.
- **Ask if unsure.** If a surface isn't in the two kits (e.g. Settings, auth), ask the user for a reference before inventing — the production components are deeper than what's been recreated.

## What's NOT here (and why)

- No raster architectural photography — not importable through the text-only GitHub pipeline. Use colored placeholders.
- No 3D engine — the 3D Viewer screen is a stylised SVG isometric. For real rendering, wire to Three.js / Meshy after design approval.
- No auth, billing, settings pages — out of scope for v1 of this system; ask before building.
