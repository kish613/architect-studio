import * as THREE from "three";
import type {
  AnyNode,
  CeilingNode,
  ItemNode,
  RoofNode,
  SlabNode,
  WallNode,
} from "@/lib/pascal/schemas";
import {
  LEGACY_MATERIAL_FINISH_MAP,
  findMaterialDefinition,
  findMaterialVariant,
  type CatalogMaterialSlot,
  type MaterialPattern,
  type MaterialSurfaceCategory,
  type MaterialVariant,
} from "@shared/material-library";

type SurfaceKind = Exclude<MaterialSurfaceCategory, "glass">;

interface ResolvedFinish {
  finishId: string;
  variantId: string;
  variant: MaterialVariant;
}

interface CreateFinishMaterialOptions {
  selected?: boolean;
  hovered?: boolean;
  repeat?: { x: number; y: number };
  side?: THREE.Side;
  slotId?: string;
}

const textureCache = new Map<string, THREE.CanvasTexture>();

function hashVariation(id: string, range = 0.03): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return ((h % 1000) / 1000) * range * 2 - range;
}

function clampColorChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function drawPlaster(ctx: CanvasRenderingContext2D, size: number, baseColor: string) {
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const brightness = Math.random() * 24 - 12;
    const color = new THREE.Color(baseColor);
    const rgb = color
      .clone()
      .offsetHSL(0, 0, brightness / 255)
      .multiplyScalar(1);

    ctx.fillStyle = `rgb(${clampColorChannel(rgb.r * 255)},${clampColorChannel(
      rgb.g * 255
    )},${clampColorChannel(rgb.b * 255)})`;
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawBrick(ctx: CanvasRenderingContext2D, size: number, baseColor: string) {
  const mortarColor = "#8a4030";
  const brickW = 40;
  const brickH = 20;
  const gap = 2;

  ctx.fillStyle = mortarColor;
  ctx.fillRect(0, 0, size, size);

  const rows = Math.ceil(size / (brickH + gap));
  const cols = Math.ceil(size / (brickW + gap)) + 1;
  const base = new THREE.Color(baseColor);

  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 1 ? (brickW + gap) / 2 : 0;
    for (let col = -1; col < cols; col++) {
      const x = col * (brickW + gap) + offset;
      const y = row * (brickH + gap);
      const variation = (Math.random() * 16 - 8) / 255;
      const color = base.clone().offsetHSL(0, 0, variation);
      ctx.fillStyle = `rgb(${clampColorChannel(color.r * 255)},${clampColorChannel(
        color.g * 255
      )},${clampColorChannel(color.b * 255)})`;
      ctx.fillRect(x, y, brickW, brickH);
    }
  }
}

function drawConcrete(ctx: CanvasRenderingContext2D, size: number, baseColor: string) {
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  const base = new THREE.Color(baseColor);
  for (let i = 0; i < 7000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const brightness = (Math.random() * 36 - 18) / 255;
    const color = base.clone().offsetHSL(0, 0, brightness);
    ctx.fillStyle = `rgb(${clampColorChannel(color.r * 255)},${clampColorChannel(
      color.g * 255
    )},${clampColorChannel(color.b * 255)})`;
    const dotSize = Math.random() * 2 + 1;
    ctx.fillRect(x, y, dotSize, dotSize);
  }
}

function drawWood(ctx: CanvasRenderingContext2D, size: number, baseColor: string) {
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  const base = new THREE.Color(baseColor);
  let y = 0;
  while (y < size) {
    y += 4 + Math.random() * 4;
    const color = base.clone().offsetHSL(0, 0, (Math.random() * 20 - 10) / 255);
    ctx.strokeStyle = `rgb(${clampColorChannel(color.r * 255)},${clampColorChannel(
      color.g * 255
    )},${clampColorChannel(color.b * 255)})`;
    ctx.lineWidth = 0.6 + Math.random() * 0.8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < size; x += 10) {
      ctx.lineTo(x, y + (Math.random() - 0.5) * 2);
    }
    ctx.stroke();
  }
}

function drawStone(ctx: CanvasRenderingContext2D, size: number, baseColor: string) {
  ctx.fillStyle = "#7a736d";
  ctx.fillRect(0, 0, size, size);

  const base = new THREE.Color(baseColor);
  const gap = 3;
  let y = 0;
  while (y < size) {
    const rowH = 18 + Math.random() * 22;
    let x = 0;
    while (x < size) {
      const blockW = 22 + Math.random() * 38;
      const color = base.clone().offsetHSL(0, 0, (Math.random() * 18 - 9) / 255);
      ctx.fillStyle = `rgb(${clampColorChannel(color.r * 255)},${clampColorChannel(
        color.g * 255
      )},${clampColorChannel(color.b * 255)})`;
      ctx.fillRect(x, y, blockW - gap, rowH - gap);
      x += blockW;
    }
    y += rowH;
  }
}

function drawTile(ctx: CanvasRenderingContext2D, size: number, baseColor: string) {
  ctx.fillStyle = "#5f4538";
  ctx.fillRect(0, 0, size, size);

  const base = new THREE.Color(baseColor);
  const tileW = 48;
  const tileH = 24;
  const gap = 3;
  for (let y = 0; y < size; y += tileH + gap) {
    for (let x = 0; x < size; x += tileW + gap) {
      const color = base.clone().offsetHSL(0, 0, (Math.random() * 20 - 10) / 255);
      ctx.fillStyle = `rgb(${clampColorChannel(color.r * 255)},${clampColorChannel(
        color.g * 255
      )},${clampColorChannel(color.b * 255)})`;
      ctx.fillRect(x, y, tileW, tileH);
    }
  }
}

function createProceduralTexture(pattern: MaterialPattern, baseColor: string): THREE.CanvasTexture | null {
  if (pattern === "none") {
    return null;
  }

  const cacheKey = `${pattern}:${baseColor}`;
  const cached = textureCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  switch (pattern) {
    case "plaster":
      drawPlaster(ctx, size, baseColor);
      break;
    case "brick":
      drawBrick(ctx, size, baseColor);
      break;
    case "concrete":
      drawConcrete(ctx, size, baseColor);
      break;
    case "wood":
      drawWood(ctx, size, baseColor);
      break;
    case "stone":
      drawStone(ctx, size, baseColor);
      break;
    case "tile":
      drawTile(ctx, size, baseColor);
      break;
    default:
      return null;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(cacheKey, texture);
  return texture;
}

function getMaterialSlots(item: ItemNode): CatalogMaterialSlot[] {
  return Array.isArray(item.materialSlots) ? item.materialSlots : [];
}

function resolveLegacyFinishId(surface: SurfaceKind, material?: string | null): string {
  const legacy = material?.toLowerCase?.() ?? "";
  const mapped = LEGACY_MATERIAL_FINISH_MAP[surface][legacy];
  if (mapped) {
    return mapped;
  }

  if (legacy === "glass") {
    return "glass-clear";
  }

  switch (surface) {
    case "wall":
      return "wall-plaster";
    case "slab":
      return "slab-concrete";
    case "ceiling":
      return "ceiling-plaster";
    case "roof":
      return "roof-clay-tile";
    case "item":
      return "item-oak";
  }
}

function resolveItemSlotFinish(item: ItemNode, slotId?: string): CatalogMaterialSlot | null {
  const slots = getMaterialSlots(item);
  if (slots.length === 0) {
    return null;
  }

  if (slotId) {
    return slots.find((slot) => slot.slotId === slotId) ?? null;
  }

  return slots[0] ?? null;
}

export function resolveNodeFinish(
  node: WallNode | SlabNode | CeilingNode | RoofNode | ItemNode,
  surface: SurfaceKind,
  slotId?: string
): ResolvedFinish {
  if (node.type === "item") {
    const slotFinish = resolveItemSlotFinish(node, slotId);
    if (slotFinish) {
      const variant =
        findMaterialVariant(slotFinish.finishId, slotFinish.finishVariantId) ||
        findMaterialVariant("item-oak");
      if (variant) {
        return {
          finishId: slotFinish.finishId,
          variantId: variant.id,
          variant,
        };
      }
    }
  }

  const finishId = node.finishId || resolveLegacyFinishId(surface, node.material);
  const definition = findMaterialDefinition(finishId);
  const variant =
    findMaterialVariant(finishId, node.finishVariantId) ||
    findMaterialVariant(resolveLegacyFinishId(surface, node.material));

  if (definition && variant) {
    return {
      finishId: definition.id,
      variantId: variant.id,
      variant,
    };
  }

  const fallback = findMaterialVariant(resolveLegacyFinishId(surface, node.material));
  if (!fallback) {
    throw new Error(`No finish definition available for ${surface}`);
  }

  return {
    finishId: resolveLegacyFinishId(surface, node.material),
    variantId: fallback.id,
    variant: fallback,
  };
}

export function createFinishMaterial(
  node: WallNode | SlabNode | CeilingNode | RoofNode | ItemNode,
  surface: SurfaceKind,
  options: CreateFinishMaterialOptions = {}
): THREE.MeshPhysicalMaterial {
  if (options.selected) {
    return new THREE.MeshPhysicalMaterial({
      color: "#4A90FF",
      roughness: 0.5,
      metalness: 0.1,
      side: options.side,
    });
  }

  if (options.hovered) {
    return new THREE.MeshPhysicalMaterial({
      color: "#78B4FF",
      roughness: 0.5,
      metalness: 0.1,
      side: options.side,
    });
  }

  const resolved = resolveNodeFinish(node, surface, options.slotId);
  const color = new THREE.Color(resolved.variant.color);
  color.offsetHSL(0, 0, hashVariation(node.id));

  const isGlass = resolved.finishId === "glass-clear" || resolved.variant.transmission;
  const texture = createProceduralTexture(resolved.variant.pattern ?? "none", resolved.variant.color);
  const repeat = options.repeat ?? resolved.variant.repeat;

  let map: THREE.Texture | null = null;
  if (texture) {
    map = texture.clone();
    map.needsUpdate = true;
    if (repeat) {
      map.repeat.set(repeat.x, repeat.y);
    }
  }

  const materialOptions: THREE.MeshPhysicalMaterialParameters = {
    color,
    roughness: resolved.variant.roughness,
    metalness: resolved.variant.metalness,
    envMapIntensity: resolved.variant.envMapIntensity ?? 0.4,
    side: options.side,
  };

  if (map) {
    materialOptions.map = map;
    materialOptions.bumpMap = map;
    materialOptions.bumpScale = resolved.variant.bumpScale ?? 0.015;
  }

  if (resolved.variant.clearcoat !== undefined) {
    materialOptions.clearcoat = resolved.variant.clearcoat;
  }

  if (resolved.variant.transmission !== undefined) {
    materialOptions.transmission = resolved.variant.transmission;
  }

  if (resolved.variant.ior !== undefined) {
    materialOptions.ior = resolved.variant.ior;
  }

  if (isGlass) {
    materialOptions.transparent = true;
    materialOptions.opacity = resolved.variant.opacity ?? 0.5;
  }

  return new THREE.MeshPhysicalMaterial(materialOptions);
}

export type FinishCapableNode = WallNode | SlabNode | CeilingNode | RoofNode | ItemNode | AnyNode;
