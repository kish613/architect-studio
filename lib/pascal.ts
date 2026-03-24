import { z } from "zod";
import {
  CURRENT_SCENE_SCHEMA_VERSION,
  type BuildingNode,
  type DoorNode,
  type ItemNode,
  type LevelNode,
  type SceneData,
  type SlabNode,
  type SiteNode,
  type WallNode,
  type WindowNode,
  type ZoneNode,
} from "../shared/pascal-scene.js";
import { ensurePascalScene } from "../shared/pascal-load.js";
import { matchCatalogItem } from "../shared/furniture-catalog.js";
import { autoFurnishZone, computeZoneBBox } from "./pascal-autofurnish.js";

const defaultTransform = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
} as const;

const zoneDefaultColors: Record<string, string> = {
  room: "#4A90D9",
  hallway: "#B0B0B0",
  bathroom: "#5DADE2",
  kitchen: "#F4D03F",
  bedroom: "#82E0AA",
  living: "#AF7AC5",
  garage: "#AAB7B8",
  utility: "#F0B27A",
  other: "#D5DBDB",
};

const geminiWallSchema = z.object({
  startX: z.number(),
  startZ: z.number(),
  endX: z.number(),
  endZ: z.number(),
  height: z.number().optional(),
  thickness: z.number().optional(),
});

const geminiDoorSchema = z.object({
  wallIndex: z.number().int().nonnegative(),
  position: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  doorType: z.enum(["single", "double", "sliding", "french", "bifold"]).optional(),
  swing: z.enum(["left", "right"]).optional(),
});

const geminiWindowSchema = z.object({
  wallIndex: z.number().int().nonnegative(),
  position: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  sillHeight: z.number().optional(),
  windowType: z.enum(["fixed", "casement", "sash", "sliding", "bay", "skylight"]).optional(),
});

const geminiRoomPointSchema = z.object({
  x: z.number(),
  z: z.number(),
});

const geminiRoomSchema = z.object({
  name: z.string().min(1),
  zoneType: z
    .enum([
      "room",
      "hallway",
      "bathroom",
      "kitchen",
      "bedroom",
      "living",
      "garage",
      "utility",
      "other",
    ])
    .default("room"),
  points: z.array(geminiRoomPointSchema).default([]),
  color: z.string().nullable().optional(),
});

const geminiItemSchema = z.object({
  name: z.string().min(1),
  itemType: z.enum(["furniture", "appliance", "fixture"]).optional(),
  position: geminiRoomPointSchema,
  dimensions: z
    .object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    })
    .optional(),
});

const geminiLevelSchema = z.object({
  name: z.string().min(1).default("Ground Floor"),
  index: z.number().int().default(0),
  elevation: z.number().default(0),
  walls: z.array(geminiWallSchema).default([]),
  doors: z.array(geminiDoorSchema).default([]),
  windows: z.array(geminiWindowSchema).default([]),
  rooms: z.array(geminiRoomSchema).default([]),
  items: z.array(geminiItemSchema).default([]),
});

const geminiFloorplanLevelsSchema = z.object({
  levels: z.array(geminiLevelSchema).min(1),
});

const geminiFloorplanSingleLevelSchema = z.object({
  walls: z.array(geminiWallSchema).default([]),
  doors: z.array(geminiDoorSchema).default([]),
  windows: z.array(geminiWindowSchema).default([]),
  rooms: z.array(geminiRoomSchema).default([]),
  items: z.array(geminiItemSchema).default([]),
});

export type GeminiWall = z.infer<typeof geminiWallSchema>;
export type GeminiDoor = z.infer<typeof geminiDoorSchema>;
export type GeminiWindow = z.infer<typeof geminiWindowSchema>;
export type GeminiRoom = z.infer<typeof geminiRoomSchema>;
export type GeminiItem = z.infer<typeof geminiItemSchema>;
export type GeminiLevel = z.infer<typeof geminiLevelSchema>;
export interface GeminiFloorplanData {
  levels: GeminiLevel[];
}

export function normalizeGeminiFloorplanData(raw: unknown): GeminiFloorplanData {
  // Unwrap common Gemini response wrappers
  let unwrapped = raw;
  if (unwrapped && typeof unwrapped === "object" && !Array.isArray(unwrapped)) {
    const obj = unwrapped as Record<string, unknown>;
    // Unwrap { floorPlan: ... }, { floor_plan: ... }, { data: ... }, { result: ... }
    for (const key of ["floorPlan", "floor_plan", "floorplan", "data", "result", "response"]) {
      if (obj[key] && typeof obj[key] === "object") {
        unwrapped = obj[key];
        break;
      }
    }
  }
  // Handle array-at-root: [{ walls: [...] }] → { levels: [...] }
  if (Array.isArray(unwrapped)) {
    unwrapped = { levels: unwrapped };
  }

  const multiLevel = geminiFloorplanLevelsSchema.safeParse(unwrapped);
  const singleLevel = !multiLevel.success ? geminiFloorplanSingleLevelSchema.safeParse(unwrapped) : null;

  let normalized: GeminiFloorplanData;
  if (multiLevel.success) {
    normalized = multiLevel.data;
  } else if (singleLevel?.success) {
    normalized = {
      levels: [
        {
          name: "Ground Floor",
          index: 0,
          elevation: 0,
          ...singleLevel.data,
        },
      ],
    };
  } else {
    // Last resort: try original raw in case unwrapping went wrong
    const fallback = geminiFloorplanSingleLevelSchema.safeParse(raw);
    if (fallback.success) {
      normalized = {
        levels: [{ name: "Ground Floor", index: 0, elevation: 0, ...fallback.data }],
      };
    } else {
      throw new Error(
        `Gemini floorplan output could not be parsed. Expected { levels: [...] } or { walls: [...] }. Got keys: ${
          raw && typeof raw === "object" ? Object.keys(raw as object).join(", ") : typeof raw
        }`
      );
    }
  }

  const wallCount = normalized.levels.reduce((total, level) => total + level.walls.length, 0);
  if (wallCount === 0) {
    throw new Error(
      `Gemini floorplan output contained no walls. Parsed ${normalized.levels.length} level(s) but all had empty wall arrays. This usually means Gemini returned an unexpected JSON structure.`
    );
  }

  // Filter out doors/windows with invalid wallIndex (instead of throwing)
  for (const level of normalized.levels) {
    level.doors = level.doors.filter((door) => {
      if (!level.walls[door.wallIndex]) {
        console.warn(`[pascal] Dropping door with invalid wallIndex ${door.wallIndex} on level "${level.name}"`);
        return false;
      }
      return true;
    });

    level.windows = level.windows.filter((win) => {
      if (!level.walls[win.wallIndex]) {
        console.warn(`[pascal] Dropping window with invalid wallIndex ${win.wallIndex} on level "${level.name}"`);
        return false;
      }
      return true;
    });
  }

  return normalized;
}

export function parseGeminiFloorplanJson(jsonText: string): GeminiFloorplanData {
  let parsedJsonText = jsonText.trim();
  const fencedMatch = parsedJsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    parsedJsonText = fencedMatch[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(parsedJsonText);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini floorplan output was not valid JSON: ${reason}`);
  }

  return normalizeGeminiFloorplanData(parsed);
}

export function extractGeminiFloorplanText(response: unknown): string {
  const candidate =
    response && typeof response === "object" && Array.isArray((response as { candidates?: unknown[] }).candidates)
      ? (response as { candidates: Array<Record<string, unknown>> }).candidates[0]
      : null;

  if (!candidate) {
    throw new Error("Gemini floorplan response had no candidates");
  }

  const finishReason = candidate.finishReason;
  if (finishReason && finishReason !== "STOP") {
    throw new Error(`Gemini floorplan generation blocked or incomplete: ${String(finishReason)}`);
  }

  const content = candidate.content;
  const parts =
    content && typeof content === "object" && Array.isArray((content as { parts?: unknown[] }).parts)
      ? (content as { parts: Array<Record<string, unknown>> }).parts
      : [];

  const textPart = parts.find((part) => typeof part.text === "string");
  if (!textPart || typeof textPart.text !== "string") {
    throw new Error("Gemini floorplan response returned no text content");
  }

  return textPart.text;
}

export async function parseFloorplanWithGemini(
  imageBuffer: Buffer,
  mimeType: string
): Promise<GeminiFloorplanData> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
  }

  const prompt = `Analyze this 2D architectural floor plan image and extract all structural elements, rooms/zones, and visible furniture as JSON.

Return ONLY a valid JSON object with no markdown, no code fences, no explanation text.

The JSON must have this exact structure:
{
  "levels": [
    {
      "name": "Ground Floor",
      "index": 0,
      "elevation": 0,
      "walls": [
        { "startX": number, "startZ": number, "endX": number, "endZ": number, "height": number, "thickness": number }
      ],
      "doors": [
        { "wallIndex": number, "position": number, "width": number, "height": number, "doorType": "single"|"double"|"sliding"|"french"|"bifold", "swing": "left"|"right" }
      ],
      "windows": [
        { "wallIndex": number, "position": number, "width": number, "height": number, "sillHeight": number, "windowType": "fixed"|"casement"|"sash"|"sliding"|"bay"|"skylight" }
      ],
      "rooms": [
        { "name": "Living Room", "zoneType": "room"|"hallway"|"bathroom"|"kitchen"|"bedroom"|"living"|"garage"|"utility"|"other", "points": [{"x": number, "z": number}], "color": null }
      ],
      "items": [
        { "name": "Sofa", "itemType": "furniture"|"appliance"|"fixture", "position": { "x": number, "z": number }, "dimensions": { "x": number, "y": number, "z": number } }
      ]
    }
  ]
}

Rules:
- Coordinates are in meters. Normalize so the floor plan fits roughly within a 20x20 metre bounding box.
- X axis goes right, Z axis goes down.
- Y is always 0.
- Include every visible wall, door, and window.
- Use default values when uncertain.
- Include every visible room or space, including small utility spaces.
- Door "position" must be between 0.05 and 0.95 (never at wall endpoints).
- Door "wallIndex" must be a valid index into the "walls" array for this level.
- Window "wallIndex" must be a valid index into the "walls" array for this level.
- Default window width: 1.2, window height: 1.2, sill height: 0.9.
- Window "position" must be between 0.1 and 0.9 (never at wall endpoints).
- Every exterior wall MUST have at least one window unless it is a garage, utility, or bathroom wall.
- Bathrooms should have smaller, higher windows (width: 0.6, height: 0.6, sillHeight: 1.5).
- Bedrooms and living rooms should have larger windows (width: 1.5, height: 1.4).
- Kitchens should have at least one window above the countertop (sillHeight: 1.0).
- windowType should be "casement" for most rooms, "fixed" for large living room windows, "sash" for bedrooms.
- All coordinates must be positive numbers.
- For furniture items, use these exact names when the item is detected: Sofa, Armchair, Coffee Table, TV Stand, Bookshelf, Double Bed, Single Bed, Nightstand, Wardrobe, Dresser, Dining Table, Dining Chair, Refrigerator, Stove, Kitchen Sink, Toilet, Bathtub, Shower, Bathroom Vanity, Desk, Office Chair, Office Desk, Floor Lamp, Table Lamp, Plant, Rug, Mirror, Coat Rack
- Room "zoneType" should accurately reflect the room's purpose: use "bedroom" for sleeping areas, "kitchen" for cooking areas, "bathroom" for wet rooms, "living" for living/lounge areas, "office" for work spaces, "hallway" for corridors and entries, "garage" for vehicle storage.
- Every room must have "points" defining its floor polygon boundary (at least 3 points forming a closed shape).`;

  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";
  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBuffer.toString("base64"),
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API failed (${response.status}): ${errorText}`);
  }

  const body = await response.json();
  const jsonText = extractGeminiFloorplanText(body);
  const raw = parseGeminiFloorplanJson(jsonText);
  return postProcessGeminiData(raw);
}

function createBaseNode(type: string, name?: string) {
  const id = crypto.randomUUID();
  return {
    id,
    parentId: null,
    childIds: [] as string[],
    name: name ?? `${type}-${id.slice(0, 4)}`,
    visible: true,
    locked: false,
  };
}

// ---------- Geometry post-processing ----------

/** Snap tolerance in meters — endpoints closer than this get merged. */
const SNAP_TOLERANCE = 0.05;

/** Minimum wall length in meters — shorter walls are removed. */
const MIN_WALL_LENGTH = 0.05;

function wallLength(w: GeminiWall): number {
  const dx = w.endX - w.startX;
  const dz = w.endZ - w.startZ;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Post-process Gemini floorplan data to improve geometry quality:
 * 1. Remove degenerate (zero/near-zero length) walls
 * 2. Snap wall endpoints that are close together
 * 3. Center all coordinates around the origin so the viewer camera can see the scene
 */
export function postProcessGeminiData(data: GeminiFloorplanData): GeminiFloorplanData {
  const levels = data.levels.map((level) => {
    // Step 1: Remove degenerate walls
    let walls = level.walls.filter((w) => wallLength(w) >= MIN_WALL_LENGTH);

    // Build a map from old wall index → new wall index for door/window references
    const oldToNew = new Map<number, number>();
    let newIdx = 0;
    for (let oldIdx = 0; oldIdx < level.walls.length; oldIdx++) {
      if (wallLength(level.walls[oldIdx]) >= MIN_WALL_LENGTH) {
        oldToNew.set(oldIdx, newIdx++);
      }
    }

    // Step 2: Snap endpoints — collect all unique endpoints and cluster nearby ones
    const endpoints: Array<{ x: number; z: number }> = [];
    for (const w of walls) {
      endpoints.push({ x: w.startX, z: w.startZ });
      endpoints.push({ x: w.endX, z: w.endZ });
    }

    // Greedy clustering: for each point, find or create a cluster centroid
    const centroids: Array<{ x: number; z: number }> = [];
    const pointToCluster: number[] = [];
    for (const pt of endpoints) {
      let bestIdx = -1;
      let bestDist = SNAP_TOLERANCE;
      for (let i = 0; i < centroids.length; i++) {
        const dx = pt.x - centroids[i].x;
        const dz = pt.z - centroids[i].z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        pointToCluster.push(bestIdx);
      } else {
        pointToCluster.push(centroids.length);
        centroids.push({ x: pt.x, z: pt.z });
      }
    }

    // Apply snapped coordinates back to walls
    walls = walls.map((w, i) => ({
      ...w,
      startX: centroids[pointToCluster[i * 2]].x,
      startZ: centroids[pointToCluster[i * 2]].z,
      endX: centroids[pointToCluster[i * 2 + 1]].x,
      endZ: centroids[pointToCluster[i * 2 + 1]].z,
    }));

    // Re-filter: snapping may have created zero-length walls
    const snappedWalls: GeminiWall[] = [];
    const snappedOldToNew = new Map<number, number>();
    let finalIdx = 0;
    for (let i = 0; i < walls.length; i++) {
      if (wallLength(walls[i]) >= MIN_WALL_LENGTH) {
        snappedWalls.push(walls[i]);
        // Find the original old index for this wall
        for (const [oldKey, newVal] of oldToNew.entries()) {
          if (newVal === i) {
            snappedOldToNew.set(oldKey, finalIdx);
            break;
          }
        }
        finalIdx++;
      }
    }

    // Remap door/window wallIndex references
    const doors = level.doors
      .map((d) => {
        const mapped = snappedOldToNew.get(d.wallIndex);
        return mapped !== undefined ? { ...d, wallIndex: mapped } : null;
      })
      .filter((d): d is GeminiDoor => d !== null);

    const windows = level.windows
      .map((w) => {
        const mapped = snappedOldToNew.get(w.wallIndex);
        return mapped !== undefined ? { ...w, wallIndex: mapped } : null;
      })
      .filter((w): w is GeminiWindow => w !== null);

    // Geometry-snap orphaned doors to nearest surviving wall
    const orphanedDoors = level.doors.filter((d) => snappedOldToNew.get(d.wallIndex) === undefined);
    const snappedDoors = [...doors];

    for (const orphan of orphanedDoors) {
      const origWall = level.walls[orphan.wallIndex];
      if (!origWall) continue;
      const t = orphan.position ?? 0.5;
      const worldX = origWall.startX + (origWall.endX - origWall.startX) * t;
      const worldZ = origWall.startZ + (origWall.endZ - origWall.startZ) * t;

      let bestWallIdx = -1;
      let bestDist = 1.0;
      let bestT = 0.5;
      for (let i = 0; i < snappedWalls.length; i++) {
        const w = snappedWalls[i];
        const dx = w.endX - w.startX;
        const dz = w.endZ - w.startZ;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.05) continue;
        const projT = Math.max(0.05, Math.min(0.95,
          ((worldX - w.startX) * dx + (worldZ - w.startZ) * dz) / (len * len)
        ));
        const projX = w.startX + dx * projT;
        const projZ = w.startZ + dz * projT;
        const dist = Math.sqrt((worldX - projX) ** 2 + (worldZ - projZ) ** 2);
        if (dist < bestDist) {
          bestDist = dist;
          bestWallIdx = i;
          bestT = projT;
        }
      }
      if (bestWallIdx >= 0) {
        snappedDoors.push({ ...orphan, wallIndex: bestWallIdx, position: bestT });
      }
    }

    // Geometry-snap orphaned windows to nearest surviving wall
    const orphanedWindows = level.windows.filter((w) => snappedOldToNew.get(w.wallIndex) === undefined);
    const snappedWindows = [...windows];

    for (const orphan of orphanedWindows) {
      const origWall = level.walls[orphan.wallIndex];
      if (!origWall) continue;
      const t = orphan.position ?? 0.5;
      const worldX = origWall.startX + (origWall.endX - origWall.startX) * t;
      const worldZ = origWall.startZ + (origWall.endZ - origWall.startZ) * t;

      let bestWallIdx = -1;
      let bestDist = 1.0;
      let bestT = 0.5;
      for (let i = 0; i < snappedWalls.length; i++) {
        const w = snappedWalls[i];
        const dx = w.endX - w.startX;
        const dz = w.endZ - w.startZ;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.05) continue;
        const projT = Math.max(0.05, Math.min(0.95,
          ((worldX - w.startX) * dx + (worldZ - w.startZ) * dz) / (len * len)
        ));
        const projX = w.startX + dx * projT;
        const projZ = w.startZ + dz * projT;
        const dist = Math.sqrt((worldX - projX) ** 2 + (worldZ - projZ) ** 2);
        if (dist < bestDist) {
          bestDist = dist;
          bestWallIdx = i;
          bestT = projT;
        }
      }
      if (bestWallIdx >= 0) {
        snappedWindows.push({ ...orphan, wallIndex: bestWallIdx, position: bestT });
      }
    }

    return { ...level, walls: snappedWalls, doors: snappedDoors, windows: snappedWindows };
  });

  // Step 3: Center all geometry around the origin
  const allXs: number[] = [];
  const allZs: number[] = [];
  for (const level of levels) {
    for (const w of level.walls) {
      allXs.push(w.startX, w.endX);
      allZs.push(w.startZ, w.endZ);
    }
  }

  if (allXs.length === 0) {
    return { levels };
  }

  const minX = Math.min(...allXs);
  const maxX = Math.max(...allXs);
  const minZ = Math.min(...allZs);
  const maxZ = Math.max(...allZs);
  const offsetX = (minX + maxX) / 2;
  const offsetZ = (minZ + maxZ) / 2;

  // Only shift if the center is notably off-origin (> 1m)
  if (Math.abs(offsetX) < 1 && Math.abs(offsetZ) < 1) {
    return { levels };
  }

  const centeredLevels = levels.map((level) => ({
    ...level,
    walls: level.walls.map((w) => ({
      ...w,
      startX: w.startX - offsetX,
      startZ: w.startZ - offsetZ,
      endX: w.endX - offsetX,
      endZ: w.endZ - offsetZ,
    })),
    rooms: level.rooms.map((r) => ({
      ...r,
      points: r.points.map((p) => ({ x: p.x - offsetX, z: p.z - offsetZ })),
    })),
    items: level.items.map((item) => ({
      ...item,
      position: { x: item.position.x - offsetX, z: item.position.z - offsetZ },
    })),
  }));

  return { levels: centeredLevels };
}

export function buildSceneFromGemini(geminiData: GeminiFloorplanData): SceneData {
  const nodes: SceneData["nodes"] = {};

  const site: SiteNode = {
    ...createBaseNode("site", "Site"),
    type: "site",
    transform: { ...defaultTransform },
  };
  const building: BuildingNode = {
    ...createBaseNode("building", "Building 1"),
    type: "building",
    parentId: site.id,
    transform: { ...defaultTransform },
  };

  site.childIds = [building.id];
  nodes[site.id] = site;
  nodes[building.id] = building;

  for (const levelData of geminiData.levels) {
    const level: LevelNode = {
      ...createBaseNode("level", levelData.name),
      type: "level",
      parentId: building.id,
      elevation: levelData.elevation,
      height: 2.7,
      index: levelData.index,
      transform: { ...defaultTransform },
    };

    nodes[level.id] = level;
    building.childIds.push(level.id);

    const wallIds: string[] = [];
    for (const wallData of levelData.walls) {
      const wall: WallNode = {
        ...createBaseNode("wall"),
        type: "wall",
        parentId: level.id,
        start: { x: wallData.startX, y: 0, z: wallData.startZ },
        end: { x: wallData.endX, y: 0, z: wallData.endZ },
        height: wallData.height ?? 2.7,
        thickness: wallData.thickness ?? 0.15,
        material: "plaster",
        finishId: "wall-plaster",
        finishVariantId: "warm",
        transform: { ...defaultTransform },
      };

      nodes[wall.id] = wall;
      wallIds.push(wall.id);
      level.childIds.push(wall.id);
    }

    for (const doorData of levelData.doors) {
      const wallId = wallIds[doorData.wallIndex];
      const door: DoorNode = {
        ...createBaseNode("door"),
        type: "door",
        parentId: wallId,
        wallId,
        position: doorData.position ?? 0.5,
        width: doorData.width ?? 0.9,
        height: doorData.height ?? 2.1,
        doorType: doorData.doorType ?? "single",
        swing: doorData.swing ?? "left",
        transform: { ...defaultTransform },
      };

      nodes[door.id] = door;
      const wallNode = nodes[wallId] as WallNode;
      wallNode.childIds.push(door.id);
    }

    for (const windowData of levelData.windows) {
      const wallId = wallIds[windowData.wallIndex];
      const windowNode: WindowNode = {
        ...createBaseNode("window"),
        type: "window",
        parentId: wallId,
        wallId,
        position: windowData.position ?? 0.5,
        width: windowData.width ?? 1.2,
        height: windowData.height ?? 1.2,
        sillHeight: windowData.sillHeight ?? 0.9,
        windowType: windowData.windowType ?? "casement",
        transform: { ...defaultTransform },
      };

      nodes[windowNode.id] = windowNode;
      const wallNode = nodes[wallId] as WallNode;
      wallNode.childIds.push(windowNode.id);
    }

    for (const roomData of levelData.rooms) {
      const zoneType = roomData.zoneType ?? "room";
      const zone: ZoneNode = {
        ...createBaseNode("zone", roomData.name),
        type: "zone",
        parentId: level.id,
        zoneType,
        label: roomData.name,
        color: roomData.color ?? zoneDefaultColors[zoneType] ?? zoneDefaultColors.other,
        points: roomData.points.map((point) => ({ x: point.x, y: 0, z: point.z })),
        transform: { ...defaultTransform },
      };

      nodes[zone.id] = zone;
      level.childIds.push(zone.id);

      // Generate a floor slab from the room polygon (needs ≥ 3 points)
      if (roomData.points.length >= 3) {
        const slab: SlabNode = {
          ...createBaseNode("slab", `${roomData.name} Floor`),
          type: "slab",
          parentId: level.id,
          points: roomData.points.map((point) => ({ x: point.x, y: 0, z: point.z })),
          thickness: 0.2,
          material: "concrete",
          finishId: "slab-concrete",
          finishVariantId: "smooth",
          transform: { ...defaultTransform },
        };

        nodes[slab.id] = slab;
        level.childIds.push(slab.id);
      }
    }

    for (const itemData of levelData.items) {
      const item: ItemNode = {
        ...createBaseNode("item", itemData.name),
        type: "item",
        parentId: level.id,
        itemType: itemData.itemType ?? "furniture",
        dimensions: itemData.dimensions ?? { x: 1, y: 1, z: 1 },
        material: "wood",
        finishId: "item-oak",
        finishVariantId: "natural",
        materialSlots: [],
        assetQualityTier: "placeholder",
        assetStyleTier: "realistic",
        transform: {
          position: { x: itemData.position.x, y: 0, z: itemData.position.z },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
      };

      const catalogMatch = matchCatalogItem(itemData.name);
      if (catalogMatch) {
        item.catalogId = catalogMatch.id;
        item.modelUrl = catalogMatch.modelUrl;
        item.dimensions = catalogMatch.dimensions;
        item.finishId = catalogMatch.materialSlots[0]?.finishId ?? item.finishId;
        item.finishVariantId = catalogMatch.materialSlots[0]?.finishVariantId ?? item.finishVariantId;
        item.materialSlots = catalogMatch.materialSlots;
        item.assetQualityTier = catalogMatch.qualityTier;
        item.assetStyleTier = catalogMatch.styleTier;
        item.bimRef = catalogMatch.bimRef;
      }

      nodes[item.id] = item;
      level.childIds.push(item.id);
    }

    // Auto-furnish: for zones with no matched catalog items, add furniture
    const matchedItemCount = levelData.items.filter((i) => matchCatalogItem(i.name) !== null).length;
    if (matchedItemCount < levelData.rooms.length) {
      for (const roomData of levelData.rooms) {
        if (roomData.points.length < 3) continue;
        const bbox = computeZoneBBox(roomData.points.map((p) => ({ x: p.x, z: p.z })));
        const furnishItems = autoFurnishZone(roomData.zoneType ?? "room", bbox);
        for (const fi of furnishItems) {
          const alreadyPlaced = Object.values(nodes).some(
            (n) => n.type === "item" && (n as ItemNode).catalogId === fi.catalogId
          );
          if (alreadyPlaced) continue;

          const item: ItemNode = {
            ...createBaseNode("item", fi.name),
            type: "item",
            parentId: level.id,
            itemType: "furniture",
            catalogId: fi.catalogId,
            modelUrl: fi.modelUrl,
            dimensions: fi.dimensions,
            material: "wood",
            finishId: fi.materialSlots?.[0]?.finishId ?? "item-oak",
            finishVariantId: fi.materialSlots?.[0]?.finishVariantId ?? "natural",
            materialSlots: fi.materialSlots ?? [],
            assetQualityTier: (fi.qualityTier as "placeholder" | "draft" | "production") ?? "placeholder",
            assetStyleTier: (fi.styleTier as "realistic" | "stylized") ?? "realistic",
            bimRef: fi.bimRef,
            transform: {
              position: { x: fi.position.x, y: 0, z: fi.position.z },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            },
          };
          nodes[item.id] = item;
          level.childIds.push(item.id);
        }
      }
    }
  }

  return validateSceneData({
    schemaVersion: CURRENT_SCENE_SCHEMA_VERSION,
    nodes,
    rootNodeIds: [site.id],
  });
}

export function validateSceneData(sceneData: SceneData): SceneData {
  const parsed = ensurePascalScene(sceneData).sceneData;
  const nodesToRemove: string[] = [];

  // 1. Remove orphaned doors/windows (instead of throwing)
  for (const node of Object.values(parsed.nodes)) {
    if (node.type === "door" || node.type === "window") {
      const wallNode = parsed.nodes[node.wallId];
      if (!wallNode || wallNode.type !== "wall") {
        console.warn(`[pascal] Removing orphaned ${node.type} "${node.id}"`);
        nodesToRemove.push(node.id);
      }
    }
  }

  // 2. Remove items outside scene bounds (±50m)
  for (const node of Object.values(parsed.nodes)) {
    if (node.type === "item") {
      const pos = node.transform.position;
      if (Math.abs(pos.x) > 50 || Math.abs(pos.z) > 50) {
        nodesToRemove.push(node.id);
      }
    }
  }

  // 3. Remove duplicate items (same catalogId within 0.5m)
  const items = Object.values(parsed.nodes).filter((n): n is ItemNode => n.type === "item");
  for (let i = 0; i < items.length; i++) {
    if (nodesToRemove.includes(items[i].id)) continue;
    for (let j = i + 1; j < items.length; j++) {
      if (nodesToRemove.includes(items[j].id)) continue;
      if (items[i].catalogId && items[i].catalogId === items[j].catalogId) {
        const dx = items[i].transform.position.x - items[j].transform.position.x;
        const dz = items[i].transform.position.z - items[j].transform.position.z;
        if (Math.sqrt(dx * dx + dz * dz) < 0.5) {
          nodesToRemove.push(items[j].id);
        }
      }
    }
  }

  // Apply removals
  for (const id of nodesToRemove) {
    const node = parsed.nodes[id];
    if (node?.parentId) {
      const parent = parsed.nodes[node.parentId];
      if (parent) parent.childIds = parent.childIds.filter((cid) => cid !== id);
    }
    delete parsed.nodes[id];
  }

  return parsed;
}

export function summarizeGeminiFloorplanData(data: GeminiFloorplanData) {
  return {
    levelCount: data.levels.length,
    wallCount: data.levels.reduce((total, level) => total + level.walls.length, 0),
    doorCount: data.levels.reduce((total, level) => total + level.doors.length, 0),
    windowCount: data.levels.reduce((total, level) => total + level.windows.length, 0),
    roomCount: data.levels.reduce((total, level) => total + level.rooms.length, 0),
    itemCount: data.levels.reduce((total, level) => total + level.items.length, 0),
  };
}

export function summarizeSceneData(sceneData: SceneData) {
  const nodes = Object.values(sceneData.nodes);
  return {
    nodeCount: nodes.length,
    wallCount: nodes.filter((node) => node.type === "wall").length,
    doorCount: nodes.filter((node) => node.type === "door").length,
    windowCount: nodes.filter((node) => node.type === "window").length,
    zoneCount: nodes.filter((node) => node.type === "zone").length,
    slabCount: nodes.filter((node) => node.type === "slab").length,
    itemCount: nodes.filter((node) => node.type === "item").length,
  };
}
