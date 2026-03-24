# Fix Pink Materials + 100 New CC0 Assets — Design Document

**Date**: 2026-03-24
**Status**: Approved
**Strategy**: Fix material rendering fallback, download 100+ CC0 GLB models, expand catalog to 180+ items

---

## 1. Problem

1. **Pink/magenta furniture**: Existing GLBs use `KHR_materials_unlit` extension with flat colors. When Three.js can't process the unlit extension or encounters shared material state, items render as pink.
2. **Limited catalog**: Only 80 items. Need 100+ more for diverse room furnishing.

---

## 2. Fix Pink Materials

**In `SceneRenderer.tsx` `ItemModelMesh`**: After cloning materials, detect and replace pink/broken materials:

1. Traverse all meshes in the loaded GLB
2. For each material, check if it's the Three.js default error material (pink `#ff00ff`) or has no valid color
3. If broken, replace with `MeshStandardMaterial` using the furniture preset color (`#b78d63` wood tone)
4. Ensure `castShadow` and `receiveShadow` are set on all meshes
5. Add `onError` handling to `useGLTF` so failed loads fall back to `FallbackItemMesh`

---

## 3. CC0 Asset Sources

- **KennyNL Furniture Kit** (CC0) — ~40 clean low-poly furniture pieces
- **Quaternius Free Packs** (CC0) — kitchen, bathroom, office, outdoor sets
- **Poly Haven** (CC0) — individual high-quality pieces
- **Sketchfab CC0** — curated models

All models: downloaded as GLB, optimized with gltf-transform, placed in `client/public/assets/furniture/`, named `category-item-variant.glb`.

---

## 4. New Catalog Items (100+)

| Category | New Items |
|----------|-----------|
| Living | sectional-sofa-01, recliner-02, media-cabinet-01, side-table-02, accent-chair-01, bean-bag-01, console-table-01, wall-shelf-01, room-divider-01, pouf-01, lounge-chair-01, ceiling-fan-01, curtain-rod-01, throw-pillow-set-01, area-rug-large-01 |
| Bedroom | bunk-bed-01, canopy-bed-01, shoe-rack-01, jewelry-box-01, bedside-lamp-01, vanity-table-01, clothes-hanger-01, storage-bench-01, pillows-set-01, blanket-chest-01 |
| Kitchen | microwave-01, dishwasher-01, toaster-01, kitchen-island-01, spice-rack-01, trash-can-01, blender-01, coffee-maker-01, pot-rack-01, cutting-board-01, range-hood-01, bar-stool-01 |
| Bathroom | towel-rack-01, medicine-cabinet-01, bath-mat-01, laundry-basket-01, soap-dispenser-01, bathroom-scale-01, toilet-paper-holder-01, wall-mirror-01 |
| Office | standing-desk-01, monitor-stand-01, printer-01, whiteboard-01, desk-lamp-01, paper-shredder-01, file-organizer-01, keyboard-tray-01, ergonomic-chair-01, conference-table-01 |
| Dining | buffet-table-01, china-cabinet-01, wine-rack-01, serving-cart-01, bar-cabinet-01, high-chair-01, bench-seat-01, lazy-susan-01 |
| Outdoor | garden-bench-01, patio-table-01, lounge-chair-outdoor-01, planter-box-01, grill-01, umbrella-01, hammock-01, fire-pit-01, bird-bath-01, garden-light-01, swing-01, outdoor-rug-01 |
| Decor | wall-art-01, vase-01, candle-holder-01, photo-frame-01, clock-01, sculpture-01, flower-arrangement-01, globe-01, terrarium-01, incense-holder-01 |
| Utility | ironing-board-01, vacuum-01, mop-bucket-01, tool-chest-01, step-ladder-01, storage-bin-01, shoe-cabinet-01, key-holder-01 |
| Kids | crib-01, toy-box-01, kids-desk-01, rocking-horse-01, kids-bookshelf-01, changing-table-01, play-tent-01 |
| Gym | treadmill-01, dumbbell-rack-01, yoga-mat-01, exercise-bike-01, weight-bench-01 |

---

## 5. GLB Optimization Pipeline

```
download → gltf-transform optimize → resize textures 512px → draco compress → <100KB target
```

---

## 6. Success Criteria

1. No pink/magenta materials on any furniture
2. 180+ total catalog items with working GLB models
3. All models <100KB each
4. Auto-furnish places real 3D models in all room types
5. Total new asset bundle under 15MB
