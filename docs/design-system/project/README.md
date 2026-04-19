# Architect Studio — Design System

> Brand: **Architect Studio** (product sometimes appears as **Archudio**)
> Tagline: **"Transform Your Designs into 3D Worlds using AI."**
> Source of truth: [github.com/kish613/architect-studio](https://github.com/kish613/architect-studio)

---

## What Architect Studio does

Architect Studio turns **2D floorplans into photorealistic 3D models** with walls, doors, windows, textures, and scaled furniture. Users upload a sketch, we generate an isometric cutaway (nano-banana for the 2D→image pass, Meshy for the 3D mesh), and the result is editable in a BIM viewer.

The second, forward-looking product surface is **Planning Analysis** — a UK-specific tool that searches nearby planning-permission approvals and proposes new 2D + 3D floorplans showing the buildable extension space.

## The two product surfaces this system covers

| Surface | Routes (from `client/src/App.tsx`) | Purpose |
|---|---|---|
| **Marketing / Landing** | `/`, `/pricing` | Dark "studio" hero, animated photo grid, stats, pricing tables |
| **Floorplan Studio** (app) | `/projects`, `/upload`, `/projects/:id`, `/planning/*` | Upload → extract → BIM edit → 3D render → present |

## Source inventory (what was given, what was read)

Accessible remote repo — browsed with `github_get_tree`, spot-read, not bulk-imported:

- `client/index.html` — font stack (Poppins / Space Grotesk / Inter / JetBrains Mono / Montserrat), `class="dark"` default
- `client/src/index.css` — **the primary token file** (HSL vars, glass patterns, blueprint grid, weavy panels)
- `client/src/App.tsx` — router map → confirms product scope
- `client/src/components/landing/*` — LandingNav (animated SVG logo), HeroOverlay, StatsCards, FeaturedProjects
- `client/src/components/ui/*` — full shadcn/Radix set (57 components)
- `client/src/pages/Home.tsx`, `Planning.tsx` — page composition, tone
- `attached_assets/*` — user-flow spec, image-gen prompts (→ `scraps/`)

Binary assets from the repo (PNG/MP4 logos, the raster `architect-studio-logo.png`, Gemini-generated images) could **not** be imported through the text-only GitHub pipeline — the animated SVG logo in `assets/logo-architect-studio.svg` was reconstructed verbatim from the JSX in `LandingNav.tsx`, which is how the production site actually renders it.

---

## Index — what's in this folder

```
README.md                      ← you are here
SKILL.md                       ← Claude Skill manifest (drop into Code)
colors_and_type.css            ← all CSS custom properties
assets/                        ← logos, wordmark, favicon
preview/                       ← Design System tab cards (swatches, type, components)
ui_kits/
  marketing/                   ← landing + pricing recreation
  app/                         ← BIM/floorplan workspace recreation
scraps/                        ← source prompts & attached text (read-only reference)
```

---

## Content fundamentals

**Voice.** Confident, builder-minded, minimal-ego. Talks to a mixed audience — an architect who wants accuracy and a homeowner who just wants their extension visualised.

**Person.** Mostly second-person imperative in CTAs ("Start Designing", "Upload Floorplan", "Start Your First Analysis"). Third-person / product-centric in descriptions ("Transform sketches into professional 3D models…"). Avoid first-person "we" in product copy; fine in docs/changelog.

**Tone by surface.**
- *Hero headlines* — short, declarative, one capitalised gradient phrase: `Intelligent 3D Floorplans for Modern Living` · `Transform Your Designs into 3D Worlds`
- *Body / lede* — one tidy sentence + a second that earns its place. `"Transform sketches into professional 3D models and planning permission documents instantly. Precision drafting for architects and homeowners."`
- *Stat labels* — micro caps, terse. `BLUEPRINTS GENERATED · PLANNING COMPLIANT · RENDERING TIME`
- *Empty states* — kind, specific, actionable. `"No analyses yet — start by uploading a photo of your property to discover what modifications have been approved nearby…"` then a single primary CTA.
- *System toasts* — declarative, no exclamation points. `"Sign up required. Create a free account to use planning analysis."`

**Casing.** Title Case for headings, section titles, CTAs. Sentence case for descriptions and toasts. UPPERCASE only for micro-labels with wide tracking (stat labels, category eyebrows).

**Emoji / icons.** **No emoji in product copy.** Iconography = `lucide-react` (stroke 2, 16–24px). Architectural meaning over cute: `Box`, `FileCheck`, `Sparkles`, `PenSquare`, `PlayCircle`, `Plus`, `Search`.

**Verbiage cheat sheet.**
- Don't say "photos" — say **floorplan** or **sketch**
- Don't say "AI" alone — say **AI-powered** (adjectival) or lean on verbs: *generate, render, analyse, transform*
- Use **analysis / analyses** (UK spelling) — the product is UK-focused
- **Planning permission** (UK), not "building permit"
- Project ≠ model. A *Project* contains many *FloorplanModels*
- **Beta** pill stays on Planning Analysis until parity

---

## Visual foundations

**Core posture.** Dark-mode first. The canvas is `#0A0A0A`, not pure black — cards sit on `#0F / #16 / #1a` with hairline borders at 4–8% white. Think architect's studio at night: inky, dimensional, a single warm orange lamp.

**Color vibe.**
- **Construction Orange** (`#F97316`, `--primary`) is the ONLY brand accent in product UI — CTAs, focus rings, active nodes, progress.
- **Blueprint blues** — `#003087` navy + `#00AEEF` cyan — live in the **logo and marketing hero** (cyan→blue gradient inside headline spans). They DO NOT appear as UI accents in the app itself.
- **Neutrals** are pure-grayscale HSL with no hue bias.
- Semantic: emerald for success, orange for warning/brand overlap, dark red for danger.

**Type system.** Five families, each with a strict job.
- `Space Grotesk` → headings (`font-display`, tight tracking `-0.02em`)
- `Poppins` → marketing body, large CTAs, stat values — what gives the landing its "architect studio" feel
- `Inter` → default sans, in-app body
- `JetBrains Mono` → code, coordinates, measurements
- `Montserrat` → **wordmark only** (the "Architect Studio" text in the SVG logo)

**Backgrounds.** Three repeating patterns, never gradients-for-gradients-sake:
- `.dark-blueprint-grid` — 24×24 grid, 3% white lines — primary app canvas
- `.dark-dot-grid` — 20×20 dots, 6% white — section backdrops
- `.workspace-canvas-bg` — 24×24 dots, 8% white on `#0A0A0A` — the BIM viewer
- Plus one radial `.section-glow` — 4% orange ellipse, barely visible, adds warmth behind feature sections

**Glass system.** Two treatments. `.dark-glass-card` (blur 20px, 3% white fill, 6% border, inset top highlight) for info cards; `.glass-frame` (blur 20px, 40% slate fill, cyan border, monster shadow) **exclusive to the hero photo-grid frame** — don't overuse it. `.hero-text-overlay` is a pure-white glass card used ONCE, dropped over the hero grid.

**Cards.** Corner radius `--r-md` (12px) default, `--r-2xl` (24px) for feature tiles, `--r-3xl` (32px) for hero frames. Border always hairline (4–8% white on dark). Shadows are quiet — real depth comes from blur + inset highlight, not drop shadow.

**Imagery.** Warm, slightly saturated architectural photography. `filter: saturate(0.8) contrast(1.1)` at rest → `saturate(1) contrast(1)` on hover. Nothing is b&w. No grain.

**Animation.**
- Entry: fade + 16px y-rise, 500ms, `ease-out`. Staggered children at ~80ms.
- Logo draw: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`, 2.5s stroke reveal → fill fade → wordmark slide.
- Ambient: `.floating-animation` — 10px Y, 6s infinite; `.row-animate-*` — 10–12s horizontal drift for the hero grid.
- Shimmer: `.shimmer-badge` — 3s linear loop, used on "Beta".
- Hover: 150ms. Scale 1.02 on photo tiles, `scale(1.05)` on logo.

**Hover / press states.**
- Buttons primary: darken `--brand-500 → --brand-600`, add orange-tinted shadow `0 8px 24px rgba(249,115,22,.25)`.
- Ghost: background goes 10% white.
- Pill links: background 10% white, text goes opaque (`fg/70 → fg/100`).
- Active / press: shrink is rare; we use `active-elevate-2` (the `hover-elevate` + press step from the Replit util set).
- Workspace nodes: `--ink-4 → --ink-5`, border `8% → 15%`; when active, orange tinted border + 10% orange fill.

**Borders.** Single hairline `1px solid rgba(255,255,255,0.08)`. Focus ring is `--brand-500`. Dashed only for architectural affordances (door swing arcs in the logo).

**Shadows.** Drop shadows are muted on dark (`rgba(0,0,0,.3)`). Elevation comes from **blur + inset highlight**, not shadow stacking.

**Transparency & blur.** Used intentionally — the hero frame, modal backdrops (`rgba(15,23,42,0.6)` + 16px blur), the floating nav pill (`black/40` + backdrop-blur-md). Blurs never on opaque cards.

**Layout rules.** Max content width `max-w-7xl` (1280px). Hero uses `pt-6`, sections use `py-12` to `py-24`. Workspace surfaces are 100vw with fixed side panels (`weavy-panel`).

**Corner radii.** 4 / 8 / **12** (default) / 16 / 20 / **24** (cards) / **32** (hero frames) / 9999 (pills and avatars).

**Don't.**
- Don't use blue/purple gradients — they aren't in the brand
- Don't stack drop-shadows to fake glass; use the defined `.glass-*` utilities
- Don't mix Poppins and Space Grotesk in the same heading
- Don't use emoji in product UI
- Don't invent new accent colors — orange or blueprint-blue only

---

## Iconography

**System: `lucide-react`** (v0.545). The whole product uses Lucide and nothing else. No icon font is shipped, no SVG sprite, no Heroicons. Stroke weight 2 (default). Sizes: `w-4 h-4` (16px, inline), `w-5 h-5` (20px, button-left), `w-6 h-6` (24px, nav/feature), `w-8 h-8` (32px, stat cards).

**Recurring icons by surface:**
- *Auth / nav* — `UserCircle`, `LogIn`, `LogOut`, `User`, `Mail`, `PlusCircle`
- *CTA* — `PenSquare` (Start Designing), `PlayCircle` (View Demo), `Plus` (New Project/Analysis)
- *Stats* — `Box` (blueprints), `FileCheck` (compliant), `Sparkles` (render time)
- *Planning* — `Search`, `Sparkles`, `MapPin` (expected)
- *Viewer / BIM* — `Move`, `Ruler`, `Layers`, `Camera`, `Maximize`, `Grid`, `Download`
- *States* — `Loader2` (spin), `AlertCircle`, `Check`, `X`

**Emoji: never** in production copy or UI. Unicode dingbats: never. If the user sends emoji in chat input, preserve it — but our copy doesn't use it.

**Usage in HTML artifacts.** This project loads Lucide from CDN in every `preview/` and `ui_kits/*/index.html` via:
```html
<script src="https://unpkg.com/lucide@latest"></script>
<i data-lucide="pen-square"></i>
```
Then `lucide.createIcons()` after mount. Icon color inherits `currentColor`, so wrap in a colored element (`text-primary`, `text-fg-subtle`, etc.).

**Logos.** See `assets/` — `logo-architect-studio.svg` (animated wordmark), `logo-mark.svg` (light bg), `logo-mark-dark.svg` (dark bg). All faithful ports of the JSX in `LandingNav.tsx`; the "Archudio" raster variant in `attached_assets/` couldn't be imported.

---

## Caveats / substitutions

- **Fonts:** all five families are Google Fonts — no local TTF substitution needed. Loaded via `@import` at the top of `colors_and_type.css`.
- **Logo:** reconstructed verbatim from JSX (pixel-identical to production). The raster `architect-studio-logo.png` and `archudio_big_*.png` in `attached_assets/` were not importable through the text-only pipeline — please re-attach if you want them as PNG fallbacks.
- **Videos** (`kish613_A_floorplan_being_drawn_by_a_pencil…mp4`, `…morphing…mp4`) — not importable; used as hero motion references in marketing, but the site ships animated SVG + CSS instead.
- **Missing screens:** Settings, Pricing, and detailed BIM tool panels are summarised in UI kits, not pixel-perfect — the production components are deep and the kit focuses on the most-seen 5 screens.
