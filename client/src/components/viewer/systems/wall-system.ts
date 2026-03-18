import * as THREE from "three";
import type { WallNode } from "@/lib/pascal/schemas";

const WALL_MATERIALS: Record<string, { color: string; roughness: number; metalness: number }> = {
  plaster: { color: "#f5f0e8", roughness: 0.8, metalness: 0 },
  brick: { color: "#c4664a", roughness: 0.95, metalness: 0 },
  concrete: { color: "#b0b0b0", roughness: 0.85, metalness: 0.02 },
  glass: { color: "#a8d8ea", roughness: 0.05, metalness: 0.1 },
  wood: { color: "#c8a882", roughness: 0.7, metalness: 0 },
  stone: { color: "#9e9e9e", roughness: 0.9, metalness: 0 },
};

// ── Procedural texture cache ────────────────────────────────────────────────
const textureCache = new Map<string, THREE.CanvasTexture>();

function createProceduralTexture(type: string): THREE.CanvasTexture | null {
  if (type === "glass") return null;

  const cached = textureCache.get(type);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  switch (type) {
    case "plaster":
      drawPlaster(ctx, size);
      break;
    case "brick":
      drawBrick(ctx, size);
      break;
    case "concrete":
      drawConcrete(ctx, size);
      break;
    case "wood":
      drawWood(ctx, size);
      break;
    case "stone":
      drawStone(ctx, size);
      break;
    default:
      drawPlaster(ctx, size);
      break;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(type, texture);
  return texture;
}

// ── Drawing helpers ─────────────────────────────────────────────────────────

function drawPlaster(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const brightness = Math.random() * 30 - 15;
    const r = 245 + brightness;
    const g = 240 + brightness;
    const b = 232 + brightness;
    ctx.fillStyle = `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawBrick(ctx: CanvasRenderingContext2D, size: number) {
  const mortarColor = "#8a4030";
  const brickW = 40;
  const brickH = 20;
  const gap = 2;

  // Fill with mortar
  ctx.fillStyle = mortarColor;
  ctx.fillRect(0, 0, size, size);

  const rows = Math.ceil(size / (brickH + gap));
  const cols = Math.ceil(size / (brickW + gap)) + 1;

  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 1 ? (brickW + gap) / 2 : 0;
    for (let col = -1; col < cols; col++) {
      const x = col * (brickW + gap) + offset;
      const y = row * (brickH + gap);
      // Slight color variation per brick
      const variation = Math.random() * 20 - 10;
      const r = clamp(196 + variation);
      const g = clamp(102 + variation * 0.5);
      const b = clamp(74 + variation * 0.3);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, brickW, brickH);
    }
  }
}

function drawConcrete(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = "#b0b0b0";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const brightness = Math.random() * 40 - 20;
    const v = clamp(176 + brightness);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, Math.random() * 2 + 1, Math.random() * 2 + 1);
  }
}

function drawWood(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = "#c8a882";
  ctx.fillRect(0, 0, size, size);

  let y = 0;
  while (y < size) {
    const spacing = 3 + Math.random() * 5;
    y += spacing;
    const variation = Math.random() * 30 - 15;
    const r = clamp(200 + variation);
    const g = clamp(168 + variation * 0.8);
    const b = clamp(130 + variation * 0.6);
    ctx.strokeStyle = `rgb(${r},${g},${b})`;
    ctx.lineWidth = 0.5 + Math.random() * 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    // Slightly wavy line
    for (let x = 0; x < size; x += 8) {
      const waveY = y + (Math.random() - 0.5) * 1.5;
      ctx.lineTo(x, waveY);
    }
    ctx.stroke();
  }
}

function drawStone(ctx: CanvasRenderingContext2D, size: number) {
  const mortarColor = "#787878";

  // Fill with mortar
  ctx.fillStyle = mortarColor;
  ctx.fillRect(0, 0, size, size);

  const gap = 3;
  let y = 0;

  while (y < size) {
    const rowH = 15 + Math.random() * 25;
    let x = 0;
    while (x < size) {
      const blockW = 20 + Math.random() * 40;
      const variation = Math.random() * 30 - 15;
      const v = clamp(158 + variation);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, blockW - gap, rowH - gap);
      x += blockW;
    }
    y += rowH;
  }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

// ── Wall helpers ────────────────────────────────────────────────────────────

function hashVariation(id: string, range = 0.03): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((h % 1000) / 1000) * range * 2 - range;
}

export function createWallGeometry(wall: WallNode): THREE.BufferGeometry {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const length = Math.sqrt(dx * dx + dz * dz);

  if (length < 0.001) return new THREE.BufferGeometry();

  return new THREE.BoxGeometry(length, wall.height ?? 2.7, wall.thickness ?? 0.15);
}

export function getWallTransform(wall: WallNode): { position: THREE.Vector3; rotationY: number } {
  const midX = (wall.start.x + wall.end.x) / 2;
  const midZ = (wall.start.z + wall.end.z) / 2;
  const midY = (wall.height ?? 2.7) / 2;
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const angle = Math.atan2(dz, dx);

  return {
    position: new THREE.Vector3(midX, midY, midZ),
    rotationY: -angle,
  };
}

export function getWallMaterial(wall: WallNode, isSelected: boolean, isHovered: boolean, length?: number): THREE.MeshPhysicalMaterial {
  if (isSelected) return new THREE.MeshPhysicalMaterial({ color: "#4A90FF", roughness: 0.5, metalness: 0.1 });
  if (isHovered) return new THREE.MeshPhysicalMaterial({ color: "#78B4FF", roughness: 0.5, metalness: 0.1 });

  const matKey = wall.material ?? "plaster";
  const preset = WALL_MATERIALS[matKey] ?? WALL_MATERIALS.plaster;

  if (matKey === "glass") {
    return new THREE.MeshPhysicalMaterial({
      color: preset.color,
      roughness: preset.roughness,
      metalness: preset.metalness,
      transmission: 0.6,
      transparent: true,
      opacity: 0.4,
      envMapIntensity: 1.0,
    });
  }

  const color = new THREE.Color(preset.color);
  color.offsetHSL(0, 0, hashVariation(wall.id));

  const texture = createProceduralTexture(matKey);
  const wallHeight = wall.height ?? 2.7;
  const wallLength = length ?? 2;

  if (texture) {
    const cloned = texture.clone();
    cloned.needsUpdate = true;
    cloned.repeat.set(wallLength / 2, wallHeight / 2);
    return new THREE.MeshPhysicalMaterial({
      color,
      map: cloned,
      roughness: preset.roughness,
      metalness: preset.metalness,
      envMapIntensity: 0.6,
      bumpMap: cloned,
      bumpScale: 0.02,
    });
  }

  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: preset.roughness,
    metalness: preset.metalness,
    envMapIntensity: 0.6,
  });
}

export function getWallLength(wall: WallNode): number {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  return Math.sqrt(dx * dx + dz * dz);
}
