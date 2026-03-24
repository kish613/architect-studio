/**
 * generate-furniture-glbs.ts
 * Generates new furniture GLB files with a single box mesh + MeshStandardMaterial.
 * Constructs the GLB binary directly (no browser APIs needed).
 *
 * Usage:  npx tsx scripts/generate-furniture-glbs.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const OUTPUT_DIR = path.join(REPO_ROOT, "client/public/assets/furniture");

// ── Material presets (color as [r,g,b] 0-1) ──────────────────
function hexToRgb(hex: number): [number, number, number] {
  return [
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
  ];
}

const MAT = {
  wood:    { color: hexToRgb(0xb78d63), roughness: 0.58, metalness: 0.02 },
  fabric:  { color: hexToRgb(0x7a8b99), roughness: 0.85, metalness: 0.0 },
  silver:  { color: hexToRgb(0xd0d0d0), roughness: 0.22, metalness: 0.42 },
  ceramic: { color: hexToRgb(0xe8e4df), roughness: 0.3,  metalness: 0.05 },
  green:   { color: hexToRgb(0x5a8a4f), roughness: 0.7,  metalness: 0.0 },
  kids:    { color: hexToRgb(0xe8a54b), roughness: 0.7,  metalness: 0.0 },
  metal:   { color: hexToRgb(0x808080), roughness: 0.3,  metalness: 0.5 },
} as const;

type MatKey = keyof typeof MAT;

interface FurnitureItem {
  id: string;
  x: number; y: number; z: number;
  mat: MatKey;
}

// ── All new items ─────────────────────────────────────────────
const items: FurnitureItem[] = [
  // Living (14 new, ceiling-fan-01 exists)
  { id: "sectional-sofa-01",    x: 3.0, y: 0.85, z: 1.8,  mat: "fabric" },
  { id: "recliner-02",          x: 0.9, y: 1.0,  z: 0.9,  mat: "fabric" },
  { id: "media-cabinet-01",     x: 1.8, y: 0.6,  z: 0.45, mat: "wood" },
  { id: "side-table-02",        x: 0.5, y: 0.55, z: 0.5,  mat: "wood" },
  { id: "accent-chair-01",      x: 0.75,y: 0.8,  z: 0.75, mat: "fabric" },
  { id: "bean-bag-01",          x: 0.9, y: 0.7,  z: 0.9,  mat: "fabric" },
  { id: "console-table-01",     x: 1.2, y: 0.8,  z: 0.35, mat: "wood" },
  { id: "wall-shelf-01",        x: 1.0, y: 0.3,  z: 0.25, mat: "wood" },
  { id: "room-divider-01",      x: 1.8, y: 1.8,  z: 0.3,  mat: "wood" },
  { id: "pouf-01",              x: 0.5, y: 0.4,  z: 0.5,  mat: "fabric" },
  { id: "lounge-chair-01",      x: 0.8, y: 0.75, z: 0.85, mat: "fabric" },
  { id: "curtain-rod-01",       x: 2.0, y: 0.05, z: 0.05, mat: "metal" },
  { id: "area-rug-large-01",    x: 3.0, y: 0.02, z: 2.0,  mat: "fabric" },
  { id: "throw-blanket-01",     x: 1.5, y: 0.05, z: 1.0,  mat: "fabric" },

  // Bedroom (10)
  { id: "bunk-bed-01",          x: 1.0, y: 1.8,  z: 2.0,  mat: "wood" },
  { id: "canopy-bed-01",        x: 1.6, y: 2.2,  z: 2.1,  mat: "wood" },
  { id: "shoe-rack-01",         x: 0.8, y: 0.6,  z: 0.3,  mat: "wood" },
  { id: "bedside-lamp-01",      x: 0.2, y: 0.45, z: 0.2,  mat: "wood" },
  { id: "vanity-table-01",      x: 1.0, y: 0.75, z: 0.45, mat: "wood" },
  { id: "clothes-hanger-01",    x: 0.5, y: 1.7,  z: 0.5,  mat: "wood" },
  { id: "storage-bench-01",     x: 1.2, y: 0.5,  z: 0.4,  mat: "wood" },
  { id: "blanket-chest-01",     x: 1.0, y: 0.5,  z: 0.45, mat: "wood" },
  { id: "jewelry-box-01",       x: 0.25,y: 0.15, z: 0.2,  mat: "wood" },
  { id: "linen-cabinet-01",     x: 0.8, y: 1.8,  z: 0.4,  mat: "wood" },

  // Kitchen (9 new; microwave-01, toaster-01, bar-stool-01 exist)
  { id: "dishwasher-01",        x: 0.6, y: 0.85, z: 0.6,  mat: "silver" },
  { id: "kitchen-island-01",    x: 1.5, y: 0.9,  z: 0.8,  mat: "silver" },
  { id: "spice-rack-01",        x: 0.4, y: 0.4,  z: 0.1,  mat: "wood" },
  { id: "trash-can-01",         x: 0.3, y: 0.7,  z: 0.3,  mat: "silver" },
  { id: "blender-01",           x: 0.2, y: 0.4,  z: 0.2,  mat: "silver" },
  { id: "coffee-maker-01",      x: 0.25,y: 0.35, z: 0.2,  mat: "silver" },
  { id: "pot-rack-01",          x: 1.0, y: 0.4,  z: 0.4,  mat: "metal" },
  { id: "range-hood-01",        x: 0.9, y: 0.5,  z: 0.5,  mat: "silver" },
  { id: "cutting-board-01",     x: 0.4, y: 0.03, z: 0.3,  mat: "wood" },

  // Bathroom (8)
  { id: "towel-rack-01",        x: 0.6, y: 0.8,  z: 0.15, mat: "ceramic" },
  { id: "medicine-cabinet-01",  x: 0.5, y: 0.6,  z: 0.15, mat: "ceramic" },
  { id: "bath-mat-01",          x: 0.8, y: 0.02, z: 0.5,  mat: "ceramic" },
  { id: "laundry-basket-01",    x: 0.45,y: 0.6,  z: 0.35, mat: "ceramic" },
  { id: "soap-dispenser-01",    x: 0.08,y: 0.2,  z: 0.08, mat: "ceramic" },
  { id: "bathroom-scale-01",    x: 0.3, y: 0.05, z: 0.3,  mat: "ceramic" },
  { id: "toilet-paper-holder-01", x: 0.15, y: 0.15, z: 0.1, mat: "ceramic" },
  { id: "wall-mirror-01",       x: 0.6, y: 0.8,  z: 0.05, mat: "ceramic" },

  // Office (10)
  { id: "standing-desk-01",     x: 1.4, y: 1.1,  z: 0.7,  mat: "wood" },
  { id: "monitor-stand-01",     x: 0.5, y: 0.15, z: 0.25, mat: "wood" },
  { id: "printer-01",           x: 0.45,y: 0.3,  z: 0.4,  mat: "silver" },
  { id: "whiteboard-01",        x: 1.2, y: 0.9,  z: 0.05, mat: "ceramic" },
  { id: "desk-lamp-01",         x: 0.2, y: 0.45, z: 0.2,  mat: "metal" },
  { id: "paper-shredder-01",    x: 0.35,y: 0.5,  z: 0.25, mat: "silver" },
  { id: "file-organizer-01",    x: 0.35,y: 0.3,  z: 0.25, mat: "wood" },
  { id: "keyboard-tray-01",     x: 0.65,y: 0.05, z: 0.3,  mat: "wood" },
  { id: "ergonomic-chair-01",   x: 0.65,y: 1.2,  z: 0.65, mat: "fabric" },
  { id: "conference-table-01",  x: 2.4, y: 0.75, z: 1.2,  mat: "wood" },

  // Dining (8)
  { id: "buffet-table-01",      x: 1.6, y: 0.85, z: 0.5,  mat: "wood" },
  { id: "china-cabinet-01",     x: 1.0, y: 1.8,  z: 0.4,  mat: "wood" },
  { id: "wine-rack-01",         x: 0.6, y: 1.0,  z: 0.3,  mat: "wood" },
  { id: "serving-cart-01",      x: 0.8, y: 0.8,  z: 0.45, mat: "metal" },
  { id: "bar-cabinet-01",       x: 0.9, y: 1.1,  z: 0.45, mat: "wood" },
  { id: "high-chair-01",        x: 0.5, y: 0.9,  z: 0.5,  mat: "wood" },
  { id: "bench-seat-01",        x: 1.2, y: 0.45, z: 0.4,  mat: "wood" },
  { id: "lazy-susan-01",        x: 0.4, y: 0.05, z: 0.4,  mat: "wood" },

  // Outdoor (12)
  { id: "garden-bench-01",      x: 1.5, y: 0.85, z: 0.55, mat: "green" },
  { id: "patio-table-01",       x: 1.2, y: 0.75, z: 1.2,  mat: "green" },
  { id: "lounge-chair-outdoor-01", x: 1.8, y: 0.8, z: 0.7, mat: "green" },
  { id: "planter-box-01",       x: 0.6, y: 0.5,  z: 0.3,  mat: "green" },
  { id: "grill-01",             x: 1.2, y: 1.0,  z: 0.6,  mat: "metal" },
  { id: "umbrella-01",          x: 0.1, y: 2.2,  z: 0.1,  mat: "green" },
  { id: "hammock-stand-01",     x: 3.0, y: 1.2,  z: 1.0,  mat: "metal" },
  { id: "fire-pit-01",          x: 0.8, y: 0.5,  z: 0.8,  mat: "metal" },
  { id: "bird-bath-01",         x: 0.5, y: 0.8,  z: 0.5,  mat: "ceramic" },
  { id: "garden-light-01",      x: 0.15,y: 0.6,  z: 0.15, mat: "metal" },
  { id: "swing-set-01",         x: 2.5, y: 2.0,  z: 1.5,  mat: "metal" },
  { id: "outdoor-rug-01",       x: 2.0, y: 0.02, z: 1.5,  mat: "green" },

  // Decor (10)
  { id: "wall-art-01",          x: 0.8, y: 0.6,  z: 0.03, mat: "wood" },
  { id: "vase-01",              x: 0.15,y: 0.35, z: 0.15, mat: "ceramic" },
  { id: "candle-holder-01",     x: 0.1, y: 0.25, z: 0.1,  mat: "metal" },
  { id: "photo-frame-01",       x: 0.25,y: 0.3,  z: 0.05, mat: "wood" },
  { id: "wall-clock-01",        x: 0.3, y: 0.3,  z: 0.05, mat: "wood" },
  { id: "sculpture-01",         x: 0.3, y: 0.5,  z: 0.3,  mat: "ceramic" },
  { id: "flower-arrangement-01",x: 0.3, y: 0.4,  z: 0.3,  mat: "green" },
  { id: "globe-01",             x: 0.25,y: 0.35, z: 0.25, mat: "wood" },
  { id: "terrarium-01",         x: 0.2, y: 0.3,  z: 0.2,  mat: "green" },
  { id: "incense-holder-01",    x: 0.25,y: 0.05, z: 0.05, mat: "wood" },

  // Utility (8)
  { id: "ironing-board-01",     x: 1.2, y: 0.9,  z: 0.35, mat: "metal" },
  { id: "vacuum-01",            x: 0.3, y: 1.1,  z: 0.3,  mat: "silver" },
  { id: "mop-bucket-01",        x: 0.4, y: 0.35, z: 0.3,  mat: "silver" },
  { id: "tool-chest-01",        x: 0.7, y: 0.5,  z: 0.4,  mat: "metal" },
  { id: "step-ladder-01",       x: 0.5, y: 1.5,  z: 0.7,  mat: "metal" },
  { id: "storage-bin-01",       x: 0.5, y: 0.4,  z: 0.35, mat: "silver" },
  { id: "shoe-cabinet-01",      x: 0.8, y: 1.0,  z: 0.35, mat: "wood" },
  { id: "key-holder-01",        x: 0.25,y: 0.15, z: 0.05, mat: "wood" },

  // Kids (7)
  { id: "crib-01",              x: 1.3, y: 1.0,  z: 0.7,  mat: "kids" },
  { id: "toy-box-01",           x: 0.8, y: 0.5,  z: 0.5,  mat: "kids" },
  { id: "kids-desk-01",         x: 0.8, y: 0.6,  z: 0.5,  mat: "kids" },
  { id: "rocking-horse-01",     x: 0.7, y: 0.7,  z: 0.3,  mat: "kids" },
  { id: "kids-bookshelf-01",    x: 0.8, y: 1.0,  z: 0.3,  mat: "kids" },
  { id: "changing-table-01",    x: 0.9, y: 0.9,  z: 0.55, mat: "kids" },
  { id: "play-tent-01",         x: 1.2, y: 1.2,  z: 1.2,  mat: "kids" },

  // Gym (5)
  { id: "treadmill-01",         x: 1.8, y: 1.4,  z: 0.8,  mat: "metal" },
  { id: "dumbbell-rack-01",     x: 1.0, y: 0.8,  z: 0.5,  mat: "metal" },
  { id: "yoga-mat-01",          x: 1.8, y: 0.02, z: 0.6,  mat: "green" },
  { id: "exercise-bike-01",     x: 1.0, y: 1.2,  z: 0.5,  mat: "metal" },
  { id: "weight-bench-01",      x: 1.2, y: 0.5,  z: 0.45, mat: "metal" },
];

// ── Build a GLB binary for a box mesh ─────────────────────────
// GLB = glTF 2.0 binary container: 12-byte header + JSON chunk + BIN chunk
function buildBoxGlb(
  w: number, h: number, d: number,
  color: [number, number, number],
  roughness: number,
  metalness: number,
): Buffer {
  // Half-extents
  const hw = w / 2, hh = h / 2, hd = d / 2;

  // Box vertices: 24 vertices (4 per face, 6 faces) with normals
  // Each face has its own vertices for correct normals
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Face definitions: [normal, 4 corner offsets]
  const faces: Array<{ n: [number, number, number]; v: Array<[number, number, number]> }> = [
    // +Z face (front)
    { n: [0, 0, 1], v: [[-hw, 0, hd], [hw, 0, hd], [hw, h, hd], [-hw, h, hd]] },
    // -Z face (back)
    { n: [0, 0, -1], v: [[hw, 0, -hd], [-hw, 0, -hd], [-hw, h, -hd], [hw, h, -hd]] },
    // +X face (right)
    { n: [1, 0, 0], v: [[hw, 0, hd], [hw, 0, -hd], [hw, h, -hd], [hw, h, hd]] },
    // -X face (left)
    { n: [-1, 0, 0], v: [[-hw, 0, -hd], [-hw, 0, hd], [-hw, h, hd], [-hw, h, -hd]] },
    // +Y face (top)
    { n: [0, 1, 0], v: [[-hw, h, hd], [hw, h, hd], [hw, h, -hd], [-hw, h, -hd]] },
    // -Y face (bottom)
    { n: [0, -1, 0], v: [[-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd]] },
  ];

  let vi = 0;
  for (const face of faces) {
    for (const v of face.v) {
      positions.push(v[0], v[1], v[2]);
      normals.push(face.n[0], face.n[1], face.n[2]);
    }
    indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
    vi += 4;
  }

  // Compute bounding box for accessor min/max
  const posMin = [
    Math.min(...positions.filter((_, i) => i % 3 === 0)),
    Math.min(...positions.filter((_, i) => i % 3 === 1)),
    Math.min(...positions.filter((_, i) => i % 3 === 2)),
  ];
  const posMax = [
    Math.max(...positions.filter((_, i) => i % 3 === 0)),
    Math.max(...positions.filter((_, i) => i % 3 === 1)),
    Math.max(...positions.filter((_, i) => i % 3 === 2)),
  ];

  // Build binary buffer: indices (uint16) + positions (float32) + normals (float32)
  const indexCount = indices.length;
  const vertexCount = positions.length / 3;

  const indexBytes = indexCount * 2;
  const indexPadded = (indexBytes + 3) & ~3; // pad to 4-byte boundary
  const posBytes = positions.length * 4;
  const normBytes = normals.length * 4;
  const totalBinBytes = indexPadded + posBytes + normBytes;

  const binBuffer = Buffer.alloc(totalBinBytes);
  let offset = 0;

  // Write indices
  for (const idx of indices) {
    binBuffer.writeUInt16LE(idx, offset);
    offset += 2;
  }
  offset = indexPadded; // skip padding

  // Write positions
  for (const p of positions) {
    binBuffer.writeFloatLE(p, offset);
    offset += 4;
  }

  // Write normals
  for (const n of normals) {
    binBuffer.writeFloatLE(n, offset);
    offset += 4;
  }

  // Linear sRGB conversion for glTF (glTF uses linear)
  const linearColor = color.map((c) => Math.pow(c, 2.2));

  // Build glTF JSON
  const gltf = {
    asset: { version: "2.0", generator: "architect-studio-glb-gen" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 1, NORMAL: 2 },
        indices: 0,
        material: 0,
      }],
    }],
    materials: [{
      pbrMetallicRoughness: {
        baseColorFactor: [linearColor[0], linearColor[1], linearColor[2], 1.0],
        metallicFactor: metalness,
        roughnessFactor: roughness,
      },
    }],
    accessors: [
      // 0: indices
      {
        bufferView: 0,
        componentType: 5123, // UNSIGNED_SHORT
        count: indexCount,
        type: "SCALAR",
        max: [vertexCount - 1],
        min: [0],
      },
      // 1: positions
      {
        bufferView: 1,
        componentType: 5126, // FLOAT
        count: vertexCount,
        type: "VEC3",
        max: posMax,
        min: posMin,
      },
      // 2: normals
      {
        bufferView: 2,
        componentType: 5126,
        count: vertexCount,
        type: "VEC3",
        max: [1, 1, 1],
        min: [-1, -1, -1],
      },
    ],
    bufferViews: [
      // 0: indices
      { buffer: 0, byteOffset: 0, byteLength: indexBytes, target: 34963 },
      // 1: positions
      { buffer: 0, byteOffset: indexPadded, byteLength: posBytes, target: 34962 },
      // 2: normals
      { buffer: 0, byteOffset: indexPadded + posBytes, byteLength: normBytes, target: 34962 },
    ],
    buffers: [{ byteLength: totalBinBytes }],
  };

  const jsonStr = JSON.stringify(gltf);
  const jsonBytes = Buffer.from(jsonStr, "utf8");
  // Pad JSON to 4-byte boundary with spaces
  const jsonPadded = Buffer.alloc((jsonBytes.length + 3) & ~3, 0x20); // 0x20 = space
  jsonBytes.copy(jsonPadded);

  // GLB structure:
  // 12-byte header: magic(4) + version(4) + length(4)
  // JSON chunk: chunkLength(4) + chunkType(4) + data
  // BIN chunk:  chunkLength(4) + chunkType(4) + data
  const totalLength = 12 + 8 + jsonPadded.length + 8 + totalBinBytes;
  const glb = Buffer.alloc(totalLength);
  let pos = 0;

  // Header
  glb.writeUInt32LE(0x46546C67, pos); pos += 4; // 'glTF'
  glb.writeUInt32LE(2, pos);          pos += 4; // version
  glb.writeUInt32LE(totalLength, pos); pos += 4; // total length

  // JSON chunk
  glb.writeUInt32LE(jsonPadded.length, pos); pos += 4;
  glb.writeUInt32LE(0x4E4F534A, pos);        pos += 4; // 'JSON'
  jsonPadded.copy(glb, pos);                 pos += jsonPadded.length;

  // BIN chunk
  glb.writeUInt32LE(totalBinBytes, pos); pos += 4;
  glb.writeUInt32LE(0x004E4942, pos);    pos += 4; // 'BIN\0'
  binBuffer.copy(glb, pos);

  return glb;
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  let created = 0;
  let skipped = 0;

  for (const item of items) {
    const outPath = path.join(OUTPUT_DIR, `${item.id}.glb`);

    if (existsSync(outPath)) {
      console.log(`  SKIP (exists): ${item.id}.glb`);
      skipped++;
      continue;
    }

    const matDef = MAT[item.mat];
    const glb = buildBoxGlb(
      item.x, item.y, item.z,
      matDef.color as [number, number, number],
      matDef.roughness,
      matDef.metalness,
    );

    await writeFile(outPath, glb);
    created++;
    console.log(`  [${created}] ${item.id}.glb (${(glb.length / 1024).toFixed(1)} KB)`);
  }

  console.log(`\nDone! Created ${created} GLB files, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
