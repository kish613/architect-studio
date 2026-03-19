import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
import { FURNITURE_CATALOG } from "../client/src/lib/pascal/furniture-catalog.ts";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const PREVIEW_DIR = path.join(REPO_ROOT, "client/public/assets/furniture/previews");

const PALETTES = {
  living: ["#1d1309", "#ad6d1d", "#f6d4a6"],
  bedroom: ["#101629", "#4e6bb8", "#d7e3ff"],
  kitchen: ["#0d1e18", "#2f9f81", "#d8fff2"],
  bathroom: ["#0c1821", "#3f9ec7", "#d2f4ff"],
  office: ["#1b1030", "#7b4bc4", "#edd8ff"],
  utility: ["#231f1a", "#8f7960", "#f0e0cf"],
  decor: ["#2a0f18", "#c85b7a", "#ffd6e3"],
  outdoor: ["#0f2112", "#4e9a50", "#d9f8cb"],
  garage: ["#14181f", "#66788f", "#d8dee8"],
} as const;

function roundedRect(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function projectPoint(x: number, y: number, z: number, centerX: number, baseY: number) {
  return {
    x: centerX + (x - z) * 0.9,
    y: baseY + (x + z) * 0.45 - y,
  };
}

function drawFace(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  points: Array<{ x: number; y: number }>,
  fill: string,
  stroke: string
) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawPreview(item: (typeof FURNITURE_CATALOG)[number]): Buffer {
  const canvas = createCanvas(640, 640);
  const ctx = canvas.getContext("2d");
  const [bgStart, accent, ink] = PALETTES[item.category];

  const background = ctx.createLinearGradient(0, 0, 640, 640);
  background.addColorStop(0, bgStart);
  background.addColorStop(1, "#05070b");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 640, 640);

  const glow = ctx.createRadialGradient(220, 190, 30, 220, 190, 260);
  glow.addColorStop(0, `${accent}88`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 640, 640);

  const panelGradient = ctx.createLinearGradient(80, 100, 560, 560);
  panelGradient.addColorStop(0, "rgba(255,255,255,0.12)");
  panelGradient.addColorStop(1, "rgba(255,255,255,0.04)");
  roundedRect(ctx, 56, 56, 528, 528, 36);
  ctx.fillStyle = panelGradient;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const floor = ctx.createLinearGradient(180, 360, 460, 460);
  floor.addColorStop(0, "rgba(255,255,255,0.18)");
  floor.addColorStop(1, "rgba(255,255,255,0.04)");
  drawFace(
    ctx,
    [
      { x: 170, y: 360 },
      { x: 320, y: 295 },
      { x: 470, y: 360 },
      { x: 320, y: 430 },
    ],
    floor,
    "rgba(255,255,255,0.08)"
  );

  const maxDimension = Math.max(item.dimensions.x, item.dimensions.y, item.dimensions.z, 0.25);
  const width = 110 + (item.dimensions.x / maxDimension) * 140;
  const depth = 80 + (item.dimensions.z / maxDimension) * 110;
  const height = Math.max(28, 60 + (item.dimensions.y / maxDimension) * 160);

  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const centerX = 320;
  const baseY = 360;

  const top = [
    projectPoint(-halfWidth, height, -halfDepth, centerX, baseY),
    projectPoint(halfWidth, height, -halfDepth, centerX, baseY),
    projectPoint(halfWidth, height, halfDepth, centerX, baseY),
    projectPoint(-halfWidth, height, halfDepth, centerX, baseY),
  ];
  const left = [
    projectPoint(-halfWidth, 0, halfDepth, centerX, baseY),
    projectPoint(-halfWidth, 0, -halfDepth, centerX, baseY),
    projectPoint(-halfWidth, height, -halfDepth, centerX, baseY),
    projectPoint(-halfWidth, height, halfDepth, centerX, baseY),
  ];
  const right = [
    projectPoint(-halfWidth, 0, halfDepth, centerX, baseY),
    projectPoint(halfWidth, 0, halfDepth, centerX, baseY),
    projectPoint(halfWidth, height, halfDepth, centerX, baseY),
    projectPoint(-halfWidth, height, halfDepth, centerX, baseY),
  ];

  drawFace(ctx, left, "rgba(255,255,255,0.18)", "rgba(255,255,255,0.16)");
  drawFace(ctx, right, `${accent}dd`, "rgba(255,255,255,0.18)");
  drawFace(ctx, top, ink, "rgba(255,255,255,0.18)");

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "600 40px sans-serif";
  ctx.fillText(item.name, 88, 128, 464);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "500 22px sans-serif";
  ctx.fillText(
    `${item.dimensions.x.toFixed(2)}m x ${item.dimensions.y.toFixed(2)}m x ${item.dimensions.z.toFixed(2)}m`,
    88,
    164
  );

  roundedRect(ctx, 88, 500, 128, 40, 20);
  ctx.fillStyle = `${accent}bb`;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 18px sans-serif";
  ctx.fillText(item.category.toUpperCase(), 110, 527);

  ctx.fillStyle = "rgba(255,255,255,0.56)";
  ctx.font = "500 18px sans-serif";
  ctx.fillText(item.id, 88, 570);

  return canvas.toBuffer("image/png");
}

async function main() {
  await mkdir(PREVIEW_DIR, { recursive: true });

  await Promise.all(
    FURNITURE_CATALOG.map(async (item) => {
      const outputPath = path.join(PREVIEW_DIR, `${item.id}.png`);
      const buffer = drawPreview(item);
      await writeFile(outputPath, buffer);
    })
  );

  console.log(`Generated ${FURNITURE_CATALOG.length} furniture preview(s) in ${PREVIEW_DIR}`);
}

main().catch((error) => {
  console.error("Failed to generate furniture previews:", error);
  process.exitCode = 1;
});
