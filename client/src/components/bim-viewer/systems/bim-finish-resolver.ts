import * as THREE from "three";
import type { CanonicalBim } from "@shared/bim/canonical-schema";
import {
  MATERIAL_LIBRARY,
  LEGACY_MATERIAL_FINISH_MAP,
  findMaterialVariant,
  type MaterialVariant,
  type MaterialSurfaceCategory,
} from "@shared/material-library";
import { resolveTextureId, getTextureRepeat } from "@/lib/bim/texture-presets";
import {
  getTextureSetSync,
  prefetchTextureSet,
  applyPbrTextures,
  type PbrTextureSet,
} from "@/lib/bim/texture-service";

export type BimSurfaceKind =
  | "wall"
  | "slab"
  | "ceiling"
  | "roof"
  | "stair"
  | "column"
  | "item";

interface FinishOpts {
  selected?: boolean;
  hovered?: boolean;
  repeat?: { x: number; y: number };
  side?: THREE.Side;
}

// ─────────────────────────────────────────────────────────────
// Improved base colors (more realistic than the old flat hex)
// ─────────────────────────────────────────────────────────────

const BASE_COLORS: Record<BimSurfaceKind, { interior: string; exterior?: string }> = {
  wall: { interior: "#efe4d4", exterior: "#c4bcb0" },
  slab: { interior: "#b9b1a6" },
  ceiling: { interior: "#f5f4f0" },
  roof: { interior: "#5a504a" },
  stair: { interior: "#c9a57c" },
  column: { interior: "#d0c9bf" },
  item: { interior: "#b8b0a6" },
};

const BASE_PROPS: Record<BimSurfaceKind, { roughness: number; metalness: number; envMapIntensity: number }> = {
  wall: { roughness: 0.78, metalness: 0.02, envMapIntensity: 0.45 },
  slab: { roughness: 0.55, metalness: 0.04, envMapIntensity: 0.35 },
  ceiling: { roughness: 0.76, metalness: 0.0, envMapIntensity: 0.3 },
  roof: { roughness: 0.85, metalness: 0.05, envMapIntensity: 0.25 },
  stair: { roughness: 0.58, metalness: 0.02, envMapIntensity: 0.55 },
  column: { roughness: 0.5, metalness: 0.08, envMapIntensity: 0.4 },
  item: { roughness: 0.58, metalness: 0.02, envMapIntensity: 0.35 },
};

// ─────────────────────────────────────────────────────────────
// Map BimSurfaceKind to MaterialSurfaceCategory for library lookups
// ─────────────────────────────────────────────────────────────

function surfaceToCategory(surface: BimSurfaceKind): MaterialSurfaceCategory {
  switch (surface) {
    case "wall":
      return "wall";
    case "slab":
      return "slab";
    case "ceiling":
      return "ceiling";
    case "roof":
      return "roof";
    case "stair":
    case "column":
    case "item":
      return "item";
  }
}

// ─────────────────────────────────────────────────────────────
// Deterministic jitter from element ID (for subtle variation)
// ─────────────────────────────────────────────────────────────

function elementJitter(elementId: string): number {
  let h = 0;
  for (let i = 0; i < elementId.length; i++) {
    h = (h * 31 + elementId.charCodeAt(i)) | 0;
  }
  return ((h % 1000) / 1000) * 0.04 - 0.02;
}

// ─────────────────────────────────────────────────────────────
// Resolve material kind from BIM data
// ─────────────────────────────────────────────────────────────

function resolveElementMaterialKind(
  bim: CanonicalBim,
  elementId: string,
  surface: BimSurfaceKind,
): string | undefined {
  // Find the element's materialId across all element arrays
  const allElements = [
    ...bim.walls,
    ...bim.slabs,
    ...bim.ceilings,
    ...bim.roofs,
    ...bim.stairs,
    ...bim.columns,
    ...bim.doors,
  ];

  const element = allElements.find((e) => e.id === elementId);
  if (!element || !("materialId" in element) || !element.materialId) {
    return undefined;
  }

  // Look up the material reference in the BIM materials map
  const matRef = bim.materials[element.materialId];
  if (matRef) {
    return matRef.kind;
  }

  return undefined;
}

// ─────────────────────────────────────────────────────────────
// Look up MATERIAL_LIBRARY variant for this surface + kind
// ─────────────────────────────────────────────────────────────

function resolveLibraryVariant(
  surface: BimSurfaceKind,
  materialKind?: string,
): MaterialVariant | null {
  const category = surfaceToCategory(surface);
  const kindKey = materialKind || "plaster";

  // Try the legacy finish map to get a library finish ID
  const finishMap =
    LEGACY_MATERIAL_FINISH_MAP[category as keyof typeof LEGACY_MATERIAL_FINISH_MAP];
  const finishId = finishMap?.[kindKey] ?? finishMap?.["plaster"];

  if (finishId) {
    const variant = findMaterialVariant(finishId);
    if (variant) return variant;
  }

  // Fallback: find any library entry for this category
  const def = MATERIAL_LIBRARY.find((m) => m.category === category);
  if (def) {
    return findMaterialVariant(def.id) ?? null;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Main material creation
// ─────────────────────────────────────────────────────────────

export function createBimSurfaceMaterial(
  bim: CanonicalBim,
  elementId: string,
  surface: BimSurfaceKind,
  opts: FinishOpts = {},
  hints?: { isExteriorWall?: boolean },
): THREE.MeshPhysicalMaterial {
  const jitter = elementJitter(elementId);

  // Resolve material kind from BIM data
  const materialKind = resolveElementMaterialKind(bim, elementId, surface);

  // Try to get library variant for richer properties
  const libraryVariant = resolveLibraryVariant(surface, materialKind);

  // Resolve texture ID and try sync cache
  const textureId = resolveTextureId(surface, materialKind);
  let textureSet: PbrTextureSet | null = null;

  if (textureId) {
    textureSet = getTextureSetSync(textureId);
    if (!textureSet) {
      // Trigger async prefetch — next render will pick it up
      prefetchTextureSet(textureId);
    }
  }

  // Determine base color and properties
  let baseColor: string;
  let roughness: number;
  let metalness: number;
  let envMapIntensity: number;
  let clearcoat: number | undefined;

  if (libraryVariant) {
    // Use rich MATERIAL_LIBRARY data
    baseColor = libraryVariant.color;
    roughness = libraryVariant.roughness;
    metalness = libraryVariant.metalness;
    envMapIntensity = libraryVariant.envMapIntensity ?? BASE_PROPS[surface].envMapIntensity;
    clearcoat = libraryVariant.clearcoat;
  } else {
    // Fallback to improved base colors
    const colors = BASE_COLORS[surface];
    baseColor =
      surface === "wall" && hints?.isExteriorWall
        ? colors.exterior ?? colors.interior
        : colors.interior;
    roughness = BASE_PROPS[surface].roughness;
    metalness = BASE_PROPS[surface].metalness;
    envMapIntensity = BASE_PROPS[surface].envMapIntensity;
  }

  // Apply jitter for variation
  const color = new THREE.Color(baseColor);
  color.offsetHSL(0, 0, jitter);

  // Build material properties
  const matProps: THREE.MeshPhysicalMaterialParameters = {
    color,
    roughness,
    metalness,
    envMapIntensity,
    side: opts.side,
  };

  if (clearcoat !== undefined) {
    matProps.clearcoat = clearcoat;
  }

  // Apply PBR textures if available
  if (textureSet && textureSet.albedo) {
    const repeat = opts.repeat ?? getTextureRepeat(surface);
    const pbrProps = applyPbrTextures(textureSet, repeat);
    Object.assign(matProps, pbrProps);
    // When we have a texture map, tint with the base color but lighter
    // so the texture shows through clearly
    matProps.color = new THREE.Color(baseColor).lerp(
      new THREE.Color("#ffffff"),
      0.5,
    );
  }

  // Handle double-side for ceiling/slab/roof
  if (
    (surface === "slab" || surface === "ceiling" || surface === "roof") &&
    opts.side === undefined
  ) {
    matProps.side = THREE.DoubleSide;
  }

  // Selection and hover: emissive tint preserving texture identity
  if (opts.selected) {
    matProps.emissive = new THREE.Color("#4A90FF");
    matProps.emissiveIntensity = 0.3;
  } else if (opts.hovered) {
    matProps.emissive = new THREE.Color("#4A90FF");
    matProps.emissiveIntensity = 0.15;
  }

  return new THREE.MeshPhysicalMaterial(matProps);
}
