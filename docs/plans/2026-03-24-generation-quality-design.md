# Floorplan Generation Quality — Design Document

**Date**: 2026-03-24
**Status**: Approved
**Strategy**: Hybrid generation with post-processing (Gemini for perception, programmatic for precision)

---

## 1. Problem

Gemini floorplan generation produces two visible defects:

1. **Doors floating in space** — Gemini assigns doors to walls by `wallIndex`, but post-processing (wall deduplication, degenerate removal, endpoint snapping) reindexes walls. Orphaned doors render at world origin or random positions.
2. **Missing furniture** — Gemini returns vague item names ("table", "chair") that don't fuzzy-match the 74-item catalog. Items without `modelUrl` render as invisible fallback boxes.

Input types: hand-drawn sketches, architectural PDFs, and AI-generated floorplan images.

---

## 2. Solution: Hybrid Post-Processing Pipeline

### Phase 1: Gemini Extraction (existing, improved prompt)

Gemini Flash analyzes the uploaded image and returns walls, rooms, doors, windows, and detected items. The prompt is improved to:
- Include catalog item IDs so Gemini can reference them directly
- Add a few-shot JSON example showing correct structure
- Enforce validation rules (positive coordinates, door positions 0.05–0.95)
- Explicitly list room type keywords for zone classification

### Phase 2: Wall Post-Processing (existing)

Existing geometry cleanup: snap endpoints within 5cm, remove walls <5cm, center around origin, deduplicate overlapping walls.

### Phase 3: Door/Window Snapping (NEW)

After wall post-processing, replace index-based door placement with geometry-based:

1. For each door/window from Gemini, compute its approximate world position using the original wall reference and position (0-1)
2. After walls are reindexed, find the **nearest remaining wall segment** within 1m tolerance
3. Recompute the door's `position` (0-1) along the matched wall
4. If no wall within tolerance, discard the door
5. Validate: door position must be 0.05–0.95 (not at wall endpoints)

### Phase 4: Furniture Matching + Auto-Furnish (NEW)

**Step A — Strengthen fuzzy matching:**
- Expand keyword lists in catalog entries (e.g., "sofa" also matches "couch", "settee", "loveseat")
- Normalize Gemini item names (lowercase, strip adjectives like "large", "small", "modern")
- Score matches by keyword overlap + dimension similarity
- Threshold: accept match if score > 0.5

**Step B — Auto-furnish empty rooms:**

For each zone (room) that has fewer than 1 matched item, place furniture from catalog based on zone type:

| Zone Type | Primary Items | Secondary Items |
|-----------|--------------|-----------------|
| bedroom | bed-double-01 | nightstand-01 x2, wardrobe-01 |
| kitchen | fridge-01, oven-01, sink-kitchen-01 | dining-table-01, dining-chair-01 x4 |
| bathroom | toilet-01, vanity-01 | bathtub-01 or shower-01 |
| living | sofa-01, coffee-table-01 | tv-stand-01, floor-lamp-01 |
| office | desk-01, office-chair-01 | bookshelf-01 |
| hallway | coat-rack-01 (if room > 4m²) | — |
| room (generic) | sofa-01, coffee-table-01 | — |

**Placement algorithm:**
1. Compute room bounding box from zone polygon
2. Place primary furniture centered, offset 0.5m from longest wall
3. Place secondary items along other walls with 0.3m clearance
4. Skip items that don't fit (check dimensions against room bounds)
5. All items get `modelUrl` from catalog → guaranteed GLB rendering

**Gemini items take priority**: If Gemini detects specific items AND they match the catalog, use Gemini's positions. Auto-furnish only fills gaps in rooms with <1 matched item.

### Phase 5: Geometry Validation (NEW)

Final pass before scene output:

1. **Orphan check**: Remove any door/window not attached to a valid wall
2. **Overlap check**: Remove duplicate items within 0.5m of each other
3. **Bounds check**: Remove any node positioned outside scene bounding box + 2m margin
4. **Slab coverage**: Ensure every zone with ≥3 polygon points gets a floor slab
5. **Wall connectivity**: Warn (don't fail) if walls don't form closed rooms

---

## 3. Files to Modify

- `lib/pascal.ts` — Gemini prompt improvements, door snapping, auto-furnish, validation
- `shared/furniture-catalog.ts` — Expand keyword lists for better fuzzy matching
- `lib/pascal.ts` (or new `lib/pascal-postprocess.ts`) — New post-processing functions

---

## 4. Success Criteria

1. Doors render ON walls, not floating in space
2. Every room has at least 1 furniture item with a visible 3D model (GLB)
3. No orphaned geometry outside the floorplan bounds
4. Furniture matches room type (beds in bedrooms, toilets in bathrooms)
5. Generation works for sketches, PDFs, and AI-generated images
6. Existing tests continue to pass
7. No regression in generation speed (< 30s total)
