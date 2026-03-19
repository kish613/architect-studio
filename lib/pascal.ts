import { z } from "zod";
import {
  sceneDataSchema,
  type BuildingNode,
  type DoorNode,
  type ItemNode,
  type LevelNode,
  type SceneData,
  type SiteNode,
  type WallNode,
  type WindowNode,
  type ZoneNode,
} from "../shared/pascal-scene.js";
import { matchCatalogItem } from "../client/src/lib/pascal/furniture-catalog.js";

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
  const multiLevel = geminiFloorplanLevelsSchema.safeParse(raw);
  const normalized = multiLevel.success
    ? multiLevel.data
    : {
        levels: [
          {
            name: "Ground Floor",
            index: 0,
            elevation: 0,
            ...geminiFloorplanSingleLevelSchema.parse(raw),
          },
        ],
      };

  const wallCount = normalized.levels.reduce((total, level) => total + level.walls.length, 0);
  if (wallCount === 0) {
    throw new Error("Gemini floorplan output did not contain any walls");
  }

  for (const level of normalized.levels) {
    for (const door of level.doors) {
      if (!level.walls[door.wallIndex]) {
        throw new Error(
          `Gemini floorplan output referenced door wallIndex ${door.wallIndex} on level "${level.name}" without a matching wall`
        );
      }
    }

    for (const window of level.windows) {
      if (!level.walls[window.wallIndex]) {
        throw new Error(
          `Gemini floorplan output referenced window wallIndex ${window.wallIndex} on level "${level.name}" without a matching wall`
        );
      }
    }
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
- Include every visible room or space, including small utility spaces.`;

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
  return parseGeminiFloorplanJson(jsonText);
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
    }

    for (const itemData of levelData.items) {
      const item: ItemNode = {
        ...createBaseNode("item", itemData.name),
        type: "item",
        parentId: level.id,
        itemType: itemData.itemType ?? "furniture",
        dimensions: itemData.dimensions ?? { x: 1, y: 1, z: 1 },
        material: "wood",
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
      }

      nodes[item.id] = item;
      level.childIds.push(item.id);
    }
  }

  return validateSceneData({
    nodes,
    rootNodeIds: [site.id],
  });
}

export function validateSceneData(sceneData: SceneData): SceneData {
  const parsed = sceneDataSchema.parse(sceneData);

  for (const node of Object.values(parsed.nodes)) {
    if (node.type === "door" || node.type === "window") {
      const wallNode = parsed.nodes[node.wallId];
      if (!wallNode || wallNode.type !== "wall") {
        throw new Error(`Scene node "${node.id}" references missing wall "${node.wallId}"`);
      }
    }
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
    itemCount: nodes.filter((node) => node.type === "item").length,
  };
}
