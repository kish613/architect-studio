/**
 * Pipeline stage 2: extract.
 *
 * Takes a preprocessed raster and produces a canonical BIM model. The stage
 * is deliberately isolated behind the `FloorplanExtractor` interface so we
 * can swap in alternative extractors (vision models, CV pipelines, imported
 * IFCs, synthetic fixtures) without touching the API route.
 *
 * The initial implementation wraps the existing Gemini prompt — previously
 * living inline in `api/floorplans/[id]/generate-from-image.ts` — but the
 * output shape is canonical BIM JSON rather than Pascal SceneData.
 */

import {
  canonicalBimSchema,
  type CanonicalBim,
  type Wall,
  type Door,
  type Window,
  type Room,
  type Furniture,
  type Fixture,
  type Level,
  type Vec2,
} from "../../shared/bim/canonical-schema.js";
import type {
  ExtractorResult,
  FloorplanExtractor,
  PipelineDiagnostic,
  PreprocessResult,
} from "./types.js";

// ─────────────────────────────────────────────────────────────
// Raw model shape returned by the Gemini prompt
// ─────────────────────────────────────────────────────────────

interface RawWall {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  height?: number;
  thickness?: number;
  isExterior?: boolean;
}

interface RawOpening {
  wallIndex: number;
  position?: number;
  width?: number;
  height?: number;
  sillHeight?: number;
  doorType?: string;
  swing?: string;
  windowType?: string;
}

interface RawRoom {
  name?: string;
  zoneType?: string;
  points?: Array<{ x: number; z: number }>;
  color?: string | null;
}

interface RawItem {
  name?: string;
  itemType?: "furniture" | "appliance" | "fixture";
  position?: { x: number; z: number };
  dimensions?: { x: number; y: number; z: number };
  category?: string;
}

interface RawLevel {
  name?: string;
  index?: number;
  elevation?: number;
  walls?: RawWall[];
  doors?: RawOpening[];
  windows?: RawOpening[];
  rooms?: RawRoom[];
  items?: RawItem[];
}

interface RawModel {
  levels?: RawLevel[];
  walls?: RawWall[];
  doors?: RawOpening[];
  windows?: RawOpening[];
  rooms?: RawRoom[];
  items?: RawItem[];
  metadata?: {
    scaleConfidence?: number;
    extractionNotes?: string[];
  };
}

// ─────────────────────────────────────────────────────────────
// Gemini extractor prompt
// ─────────────────────────────────────────────────────────────

const GEMINI_PROMPT = `You are an expert architectural BIM extractor. Extract the EXACT layout from this 2D floor plan as structured BIM data.

Return ONLY a valid JSON object with no markdown, no code fences, no explanation text.

Schema:
{
  "levels": [
    {
      "name": "Ground Floor",
      "index": 0,
      "elevation": 0,
      "walls": [
        { "startX": number, "startZ": number, "endX": number, "endZ": number, "height": number, "thickness": number, "isExterior": boolean }
      ],
      "doors": [
        { "wallIndex": number, "position": number, "width": number, "height": number, "doorType": "single"|"double"|"sliding"|"french"|"bifold", "swing": "left"|"right" }
      ],
      "windows": [
        { "wallIndex": number, "position": number, "width": number, "height": number, "sillHeight": number, "windowType": "fixed"|"casement"|"sash"|"sliding"|"bay"|"skylight" }
      ],
      "rooms": [
        { "name": "Living Room", "zoneType": "room"|"hallway"|"bathroom"|"kitchen"|"bedroom"|"living"|"dining"|"office"|"garage"|"utility"|"closet"|"stairwell"|"other", "points": [{"x": number, "z": number}], "color": null }
      ],
      "items": [
        { "name": "Sofa", "itemType": "furniture"|"appliance"|"fixture", "position": { "x": number, "z": number }, "dimensions": { "x": number, "y": number, "z": number } }
      ]
    }
  ],
  "metadata": { "scaleConfidence": 0..1, "extractionNotes": ["..."] }
}

Rules:
- Coordinates are in meters, origin at top-left of the drawing.
- X axis right, Z axis down (top-down view).
- Normalise so the footprint fits within a ~20x20 metre bounding box.
- wallIndex is the 0-based index into that level's walls array.
- position is a 0..1 parameter along the wall (0 = start, 1 = end).
- Default wall height 2.7 m, thickness 0.15 m.
- Default door 0.9 x 2.1 m, window 1.2 x 1.2 m with 0.9 m sill.
- Mark exterior walls with isExterior:true (they form the building envelope).
- Only place windows on exterior walls.
- Include ALL visible rooms, walls, doors, and windows.
- For multi-floor drawings, create a separate entry in "levels" per floor (-1 basement, 0 ground, 1 first, ...).
- scaleConfidence is YOUR self-reported confidence that the metric scale is correct (0..1).
- extractionNotes can carry short strings describing assumptions or missing info.

CRITICAL WINDOW GENERATION: Even if the source drawing does not show windows, add sensible windows to every habitable room that has an exterior wall, following building conventions:
- Living rooms: 2+ large windows (1.8 x 1.6, sill 0.7)
- Bedrooms: 1+ window (1.4 x 1.4, sill 0.8)
- Kitchens: 1 window above counter (1.2 x 1.0, sill 1.0)
- Bathrooms: 1 small privacy window (0.6 x 0.6, sill 1.5, only on exterior walls)
- Skip if a room has no exterior wall.

Furniture / items:
- Only include items that are clearly visible or labelled.
- itemType must be "furniture", "appliance", or "fixture".
- Use reasonable metric dimensions.`;

const GEMINI_MODEL = "gemini-3.1-pro-preview";

// ─────────────────────────────────────────────────────────────
// Gemini extractor
// ─────────────────────────────────────────────────────────────

async function callGemini(
  imageBuffer: Buffer,
  mimeType: string,
  apiKey: string
): Promise<RawModel> {
  const base64 = imageBuffer.toString("base64");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const body = {
    contents: [
      {
        parts: [
          { text: GEMINI_PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      mediaResolution: "MEDIA_RESOLUTION_HIGH",
    },
  };

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(50_000),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Gemini API request failed ${resp.status}: ${errorText}`);
  }

  const json = (await resp.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };
  const candidate = json.candidates?.[0];
  if (!candidate) throw new Error("Gemini returned no candidates");
  if (candidate.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(`Gemini did not finish normally: ${candidate.finishReason}`);
  }

  const text = candidate.content?.parts?.find((p) => typeof p.text === "string")
    ?.text;
  if (!text) throw new Error("Gemini returned no text content");

  let jsonText = text.trim();
  const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) jsonText = fence[1].trim();

  try {
    return JSON.parse(jsonText) as RawModel;
  } catch (err) {
    throw new Error(
      `Failed to parse Gemini JSON: ${(err as Error).message}. First chars: ${jsonText.slice(0, 200)}`
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Raw model → canonical BIM
// ─────────────────────────────────────────────────────────────

function normaliseRawModel(raw: RawModel): RawLevel[] {
  if (Array.isArray(raw.levels) && raw.levels.length > 0) {
    return raw.levels.map((lvl, i) => ({
      name: lvl.name ?? `Level ${i}`,
      index: typeof lvl.index === "number" ? lvl.index : i,
      elevation: typeof lvl.elevation === "number" ? lvl.elevation : i * 2.7,
      walls: Array.isArray(lvl.walls) ? lvl.walls : [],
      doors: Array.isArray(lvl.doors) ? lvl.doors : [],
      windows: Array.isArray(lvl.windows) ? lvl.windows : [],
      rooms: Array.isArray(lvl.rooms) ? lvl.rooms : [],
      items: Array.isArray(lvl.items) ? lvl.items : [],
    }));
  }

  // Flat format (no levels wrapper) — coerce into a single ground-floor level.
  return [
    {
      name: "Ground Floor",
      index: 0,
      elevation: 0,
      walls: Array.isArray(raw.walls) ? raw.walls : [],
      doors: Array.isArray(raw.doors) ? raw.doors : [],
      windows: Array.isArray(raw.windows) ? raw.windows : [],
      rooms: Array.isArray(raw.rooms) ? raw.rooms : [],
      items: Array.isArray(raw.items) ? raw.items : [],
    },
  ];
}

function uuid(): string {
  return crypto.randomUUID();
}

function mapDoorFamily(raw?: string): Door["family"] {
  switch (raw) {
    case "double":
    case "sliding":
    case "french":
    case "bifold":
    case "pocket":
    case "garage":
      return raw;
    default:
      return "single";
  }
}

function mapWindowFamily(raw?: string): Window["family"] {
  switch (raw) {
    case "fixed":
    case "casement":
    case "sash":
    case "sliding":
    case "bay":
    case "skylight":
    case "awning":
    case "picture":
      return raw;
    default:
      return "casement";
  }
}

function mapRoomType(raw?: string): Room["roomType"] {
  switch (raw) {
    case "room":
    case "hallway":
    case "bathroom":
    case "kitchen":
    case "bedroom":
    case "living":
    case "dining":
    case "office":
    case "garage":
    case "utility":
    case "closet":
    case "stairwell":
    case "other":
      return raw;
    default:
      return "room";
  }
}

function mapFurnitureCategory(name?: string): Furniture["category"] {
  const lower = (name ?? "").toLowerCase();
  if (/(sofa|couch|chair|armchair|stool|bench)/.test(lower)) return "seating";
  if (/(table|desk\b|dining)/.test(lower)) return "table";
  if (/(bed)/.test(lower)) return "bed";
  if (/(wardrobe|closet|dresser|shelf|cabinet|bookcase)/.test(lower))
    return "storage";
  if (/(desk)/.test(lower)) return "desk";
  if (/(lamp|light)/.test(lower)) return "lighting";
  if (/(plant|rug|art|decor|mirror)/.test(lower)) return "decor";
  return "other";
}

function mapFixtureCategory(name?: string): Fixture["category"] {
  const lower = (name ?? "").toLowerCase();
  if (/toilet|wc/.test(lower)) return "toilet";
  if (/sink|basin|lavatory/.test(lower)) return "sink";
  if (/bath|tub/.test(lower)) return "bath";
  if (/shower/.test(lower)) return "shower";
  if (/oven|stove|cooker|range/.test(lower)) return "oven";
  if (/fridge|freezer|refrigerator/.test(lower)) return "fridge";
  if (/washer|washing|dryer/.test(lower)) return "washer";
  return "other";
}

export function rawModelToCanonicalBim(
  raw: RawModel,
  opts: { sourceType: "image" | "pdf"; sourceFileUrl?: string; processedImageUrl?: string } = {
    sourceType: "image",
  }
): CanonicalBim {
  const rawLevels = normaliseRawModel(raw);

  const levels: Level[] = [];
  const walls: Wall[] = [];
  const doors: Door[] = [];
  const windows: Window[] = [];
  const rooms: Room[] = [];
  const furniture: Furniture[] = [];
  const fixtures: Fixture[] = [];

  for (const lvl of rawLevels) {
    const levelId = `level-${lvl.index ?? 0}-${uuid().slice(0, 6)}`;
    levels.push({
      id: levelId,
      name: lvl.name ?? `Level ${lvl.index ?? 0}`,
      index: typeof lvl.index === "number" ? lvl.index : 0,
      elevation: typeof lvl.elevation === "number" ? lvl.elevation : 0,
      height: 2.7,
      tags: [],
    });

    // Walls — keep a per-level index so we can resolve door/window wallIndex.
    const wallIdsByIndex: string[] = [];
    for (const w of lvl.walls ?? []) {
      const wall: Wall = {
        id: uuid(),
        name: undefined,
        levelId,
        tags: [],
        kind: "wall",
        start: { x: w.startX, z: w.startZ } satisfies Vec2,
        end: { x: w.endX, z: w.endZ } satisfies Vec2,
        height: typeof w.height === "number" ? w.height : 2.7,
        thickness: typeof w.thickness === "number" ? w.thickness : 0.15,
        isExterior: Boolean(w.isExterior),
        isLoadBearing: false,
        materialId: undefined,
      };
      walls.push(wall);
      wallIdsByIndex.push(wall.id);
    }

    for (const d of lvl.doors ?? []) {
      const wallId = wallIdsByIndex[d.wallIndex];
      if (!wallId) continue;
      doors.push({
        id: uuid(),
        levelId,
        tags: [],
        kind: "door",
        hostWallId: wallId,
        position: typeof d.position === "number" ? clamp01(d.position) : 0.5,
        width: typeof d.width === "number" ? d.width : 0.9,
        height: typeof d.height === "number" ? d.height : 2.1,
        family: mapDoorFamily(d.doorType),
        swing: d.swing === "right" ? "right" : "left",
      });
    }

    for (const w of lvl.windows ?? []) {
      const wallId = wallIdsByIndex[w.wallIndex];
      if (!wallId) continue;
      windows.push({
        id: uuid(),
        levelId,
        tags: [],
        kind: "window",
        hostWallId: wallId,
        position: typeof w.position === "number" ? clamp01(w.position) : 0.5,
        width: typeof w.width === "number" ? w.width : 1.2,
        height: typeof w.height === "number" ? w.height : 1.2,
        sillHeight: typeof w.sillHeight === "number" ? w.sillHeight : 0.9,
        family: mapWindowFamily(w.windowType),
      });
    }

    for (const r of lvl.rooms ?? []) {
      rooms.push({
        id: uuid(),
        levelId,
        tags: [],
        kind: "room",
        name: r.name,
        label: r.name ?? "",
        roomType: mapRoomType(r.zoneType),
        outline: (r.points ?? []).map((p) => ({ x: p.x, z: p.z })),
        color: r.color ?? undefined,
      });
    }

    for (const item of lvl.items ?? []) {
      if (!item.position) continue;
      const dims = item.dimensions
        ? { x: item.dimensions.x, y: item.dimensions.y, z: item.dimensions.z }
        : { x: 1, y: 1, z: 1 };
      const position = { x: item.position.x, y: 0, z: item.position.z };

      if (item.itemType === "fixture") {
        fixtures.push({
          id: uuid(),
          levelId,
          tags: [],
          kind: "fixture",
          position,
          rotationY: 0,
          category: mapFixtureCategory(item.name),
          asset: {
            catalogId: `heuristic:${item.name ?? "fixture"}`,
            dimensions: dims,
            keywords: [],
            materialSlots: [],
          },
        });
      } else {
        furniture.push({
          id: uuid(),
          levelId,
          tags: [],
          kind: "furniture",
          position,
          rotationY: 0,
          category: mapFurnitureCategory(item.name),
          asset: {
            catalogId: `heuristic:${item.name ?? "furniture"}`,
            dimensions: dims,
            keywords: [],
            materialSlots: [],
          },
        });
      }
    }
  }

  return canonicalBimSchema.parse({
    metadata: {
      schemaVersion: 1,
      units: "meters",
      sourceType: opts.sourceType,
      sourceFileUrl: opts.sourceFileUrl,
      processedImageUrl: opts.processedImageUrl,
      scaleConfidence: clamp01(raw.metadata?.scaleConfidence ?? 0.5),
      extractionNotes: Array.isArray(raw.metadata?.extractionNotes)
        ? (raw.metadata!.extractionNotes as string[])
        : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    levels,
    walls,
    doors,
    windows,
    slabs: [],
    ceilings: [],
    roofs: [],
    rooms,
    stairs: [],
    columns: [],
    furniture,
    fixtures,
    materials: {},
  });
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

// ─────────────────────────────────────────────────────────────
// The default Gemini-backed extractor
// ─────────────────────────────────────────────────────────────

export interface GeminiExtractorOptions {
  apiKey: string;
  sourceType: "image" | "pdf";
  sourceFileUrl?: string;
  processedImageUrl?: string;
}

export function createGeminiExtractor(
  opts: GeminiExtractorOptions
): FloorplanExtractor {
  return {
    name: "gemini",
    async extract(input: PreprocessResult): Promise<ExtractorResult> {
      const diagnostics: PipelineDiagnostic[] = [];
      let raw: RawModel;
      try {
        raw = await callGemini(input.imageBuffer, input.mimeType, opts.apiKey);
      } catch (err) {
        diagnostics.push({
          stage: "extract",
          code: "extractor-failed",
          message: err instanceof Error ? err.message : "Extractor failed",
        });
        throw Object.assign(
          new Error(
            err instanceof Error ? err.message : "Extractor failed"
          ),
          { diagnostics }
        );
      }

      const bim = rawModelToCanonicalBim(raw, {
        sourceType: opts.sourceType,
        sourceFileUrl: opts.sourceFileUrl,
        processedImageUrl: opts.processedImageUrl,
      });

      if (bim.walls.length === 0) {
        diagnostics.push({
          stage: "extract",
          code: "no-walls",
          message:
            "Extractor produced zero walls — the floor plan may be unreadable.",
        });
      }

      return { bim, diagnostics };
    },
  };
}
