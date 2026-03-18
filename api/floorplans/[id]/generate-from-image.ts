import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, and } from "drizzle-orm";
import { put } from "@vercel/blob";
import { getSubscriptionStatus, deductCredit } from "../../lib/subscription-manager.js";
import { requireAuth } from "../../lib/auth.js";
import { db } from "../../lib/db.js";
import { floorplanDesigns } from "../../../shared/schema.js";
import { isPdfBuffer, processPdf } from "../../../lib/pdf-utils.js";

export const config = { api: { bodyParser: false } };

// Server-side node types — mirrors client/src/lib/pascal/schemas.ts

type Vec3 = { x: number; y: number; z: number };

interface BaseNode {
  id: string;
  parentId: string | null;
  childIds: string[];
  name: string;
  visible: boolean;
  locked: boolean;
}

interface DefaultTransform {
  transform: {
    position: Vec3;
    rotation: Vec3;
    scale: Vec3;
  };
}

interface SiteNode extends BaseNode, DefaultTransform { type: "site" }
interface BuildingNode extends BaseNode, DefaultTransform { type: "building" }
interface LevelNode extends BaseNode, DefaultTransform {
  type: "level";
  elevation: number;
  height: number;
  index: number;
}
interface WallNode extends BaseNode, DefaultTransform {
  type: "wall";
  start: Vec3;
  end: Vec3;
  height: number;
  thickness: number;
  material: string;
}
interface DoorNode extends BaseNode, DefaultTransform {
  type: "door";
  wallId: string;
  position: number;
  width: number;
  height: number;
  doorType: "single" | "double" | "sliding" | "french" | "bifold";
  swing: "left" | "right";
}
interface WindowNode extends BaseNode, DefaultTransform {
  type: "window";
  wallId: string;
  position: number;
  width: number;
  height: number;
  sillHeight: number;
  windowType: "fixed" | "casement" | "sash" | "sliding" | "bay" | "skylight";
}
interface ZoneNode extends BaseNode, DefaultTransform {
  type: "zone";
  zoneType: "room" | "hallway" | "bathroom" | "kitchen" | "bedroom" | "living" | "garage" | "utility" | "other";
  label: string;
  color: string;
  points: Vec3[];
}
interface ItemNode extends BaseNode, DefaultTransform {
  type: "item";
  itemType: "furniture" | "appliance" | "fixture" | "light" | "custom";
  catalogId?: string;
  dimensions: Vec3;
  material: string;
  modelUrl?: string;
}

type AnyNode = SiteNode | BuildingNode | LevelNode | WallNode | DoorNode | WindowNode | ZoneNode | ItemNode;

interface SceneData {
  nodes: Record<string, AnyNode>;
  rootNodeIds: string[];
}

const defaultTransform: DefaultTransform["transform"] = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

function makeId(): string {
  return crypto.randomUUID();
}

function makeBase(type: string, name?: string): BaseNode & { type: string } {
  const id = makeId();
  return {
    id,
    parentId: null,
    childIds: [],
    name: name ?? `${type}-${id.slice(0, 4)}`,
    visible: true,
    locked: false,
    type,
  };
}

const ZONE_DEFAULT_COLORS: Record<string, string> = {
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

interface GeminiWall {
  id?: string;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  height?: number;
  thickness?: number;
}

interface GeminiDoor {
  wallIndex: number;
  position?: number;
  width?: number;
  height?: number;
  doorType?: string;
  swing?: string;
}

interface GeminiWindow {
  wallIndex: number;
  position?: number;
  width?: number;
  height?: number;
  sillHeight?: number;
  windowType?: string;
}

interface GeminiRoom {
  name: string;
  zoneType: string;
  points: Array<{ x: number; z: number }>;
  color?: string;
}

interface GeminiItem {
  name: string;
  itemType?: "furniture" | "appliance" | "fixture";
  position: { x: number; z: number };
  dimensions?: { x: number; y: number; z: number };
}

interface GeminiLevel {
  name: string;
  index: number;
  elevation: number;
  walls: GeminiWall[];
  doors: GeminiDoor[];
  windows: GeminiWindow[];
  rooms?: GeminiRoom[];
  items?: GeminiItem[];
}

/** Normalised Gemini output — always has a levels array */
interface NormalisedGeminiData {
  levels: GeminiLevel[];
}

/**
 * Backward-compatible normaliser: if Gemini returns the old flat format
 * (walls/doors/windows at top level without a levels wrapper), wrap it
 * into a single-level structure so downstream code always works with levels.
 */
function normaliseGeminiData(raw: any): NormalisedGeminiData {
  if (Array.isArray(raw.levels) && raw.levels.length > 0) {
    // New multi-level format — ensure per-level arrays exist
    const levels: GeminiLevel[] = raw.levels.map((lvl: any, i: number) => ({
      name: lvl.name ?? `Level ${i}`,
      index: typeof lvl.index === "number" ? lvl.index : i,
      elevation: typeof lvl.elevation === "number" ? lvl.elevation : i * 2.7,
      walls: Array.isArray(lvl.walls) ? lvl.walls : [],
      doors: Array.isArray(lvl.doors) ? lvl.doors : [],
      windows: Array.isArray(lvl.windows) ? lvl.windows : [],
      rooms: Array.isArray(lvl.rooms) ? lvl.rooms : [],
      items: Array.isArray(lvl.items) ? lvl.items : [],
    }));
    return { levels };
  }

  // Old flat format — wrap in a single level for backward compatibility
  return {
    levels: [{
      name: "Ground Floor",
      index: 0,
      elevation: 0,
      walls: Array.isArray(raw.walls) ? raw.walls : [],
      doors: Array.isArray(raw.doors) ? raw.doors : [],
      windows: Array.isArray(raw.windows) ? raw.windows : [],
      rooms: Array.isArray(raw.rooms) ? raw.rooms : [],
      items: Array.isArray(raw.items) ? raw.items : [],
    }],
  };
}

function buildSceneFromGemini(geminiData: any): SceneData {
  const normalised = normaliseGeminiData(geminiData);
  const nodes: Record<string, AnyNode> = {};

  // Site
  const site: SiteNode = {
    ...(makeBase("site", "Site") as BaseNode),
    type: "site",
    transform: { ...defaultTransform },
  };

  // Building
  const building: BuildingNode = {
    ...(makeBase("building", "Building 1") as BaseNode),
    type: "building",
    parentId: site.id,
    transform: { ...defaultTransform },
  };

  site.childIds = [building.id];
  building.childIds = [];

  nodes[site.id] = site;
  nodes[building.id] = building;

  // Create one LevelNode per detected level
  for (const lvl of normalised.levels) {
    const level: LevelNode = {
      ...(makeBase("level", lvl.name) as BaseNode),
      type: "level",
      parentId: building.id,
      elevation: lvl.elevation,
      height: 2.7,
      index: lvl.index,
      transform: { ...defaultTransform },
    };

    building.childIds.push(level.id);
    nodes[level.id] = level;

    const wallIds: string[] = [];

    // Create walls
    for (const w of lvl.walls) {
      const wall: WallNode = {
        ...(makeBase("wall") as BaseNode),
        type: "wall",
        parentId: level.id,
        start: { x: w.startX, y: 0, z: w.startZ },
        end: { x: w.endX, y: 0, z: w.endZ },
        height: w.height ?? 2.7,
        thickness: w.thickness ?? 0.15,
        material: "plaster",
        transform: { ...defaultTransform },
      };
      nodes[wall.id] = wall;
      wallIds.push(wall.id);
      level.childIds.push(wall.id);
    }

    // Create doors — attach to parent wall
    for (const d of lvl.doors) {
      const wallId = wallIds[d.wallIndex];
      if (!wallId) continue;

      const door: DoorNode = {
        ...(makeBase("door") as BaseNode),
        type: "door",
        parentId: wallId,
        wallId,
        position: d.position ?? 0.5,
        width: d.width ?? 0.9,
        height: d.height ?? 2.1,
        doorType: (d.doorType as DoorNode["doorType"]) ?? "single",
        swing: (d.swing as DoorNode["swing"]) ?? "left",
        transform: { ...defaultTransform },
      };
      nodes[door.id] = door;
      (nodes[wallId] as WallNode).childIds.push(door.id);
    }

    // Create windows — attach to parent wall
    for (const w of lvl.windows) {
      const wallId = wallIds[w.wallIndex];
      if (!wallId) continue;

      const win: WindowNode = {
        ...(makeBase("window") as BaseNode),
        type: "window",
        parentId: wallId,
        wallId,
        position: w.position ?? 0.5,
        width: w.width ?? 1.2,
        height: w.height ?? 1.2,
        sillHeight: w.sillHeight ?? 0.9,
        windowType: (w.windowType as WindowNode["windowType"]) ?? "casement",
        transform: { ...defaultTransform },
      };
      nodes[win.id] = win;
      (nodes[wallId] as WallNode).childIds.push(win.id);
    }

    // Create zones (rooms) — children of level
    for (const r of lvl.rooms ?? []) {
      const zt = (r.zoneType ?? "room") as ZoneNode["zoneType"];
      const zone: ZoneNode = {
        ...(makeBase("zone", r.name) as BaseNode),
        type: "zone",
        parentId: level.id,
        zoneType: zt,
        label: r.name,
        color: r.color ?? ZONE_DEFAULT_COLORS[zt] ?? ZONE_DEFAULT_COLORS.other,
        points: (r.points ?? []).map((p) => ({ x: p.x, y: 0, z: p.z })),
        transform: { ...defaultTransform },
      };
      nodes[zone.id] = zone;
      level.childIds.push(zone.id);
    }

    // Create items (furniture / appliances / fixtures) — children of level
    for (const item of lvl.items ?? []) {
      const itemNode: ItemNode = {
        ...(makeBase("item", item.name) as BaseNode),
        type: "item",
        parentId: level.id,
        itemType: item.itemType ?? "furniture",
        dimensions: item.dimensions
          ? { x: item.dimensions.x, y: item.dimensions.y, z: item.dimensions.z }
          : { x: 1, y: 1, z: 1 },
        material: "wood",
        transform: {
          position: { x: item.position.x, y: 0, z: item.position.z },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
      };
      nodes[itemNode.id] = itemNode;
      level.childIds.push(itemNode.id);
    }
  }

  return { nodes, rootNodeIds: [site.id] };
}

// ─── Gemini request ────────────────────────────────────────

async function parseFloorplanWithGemini(imageBuffer: Buffer, mimeType: string) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not configured");

  const base64Image = imageBuffer.toString("base64");

  const prompt = `Analyze this 2D architectural floor plan image and extract all structural elements, rooms/zones, and visible furniture as JSON.

Return ONLY a valid JSON object with no markdown, no code fences, no explanation text — just the raw JSON object.

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

Multi-floor detection:
- If the image shows multiple floors (e.g. ground floor and first floor side by side, or labeled sections for different levels), create a separate entry in the "levels" array for each floor.
- Use index 0 for ground floor, 1 for first floor, -1 for basement, etc.
- Set elevation in meters: 0 for ground, 2.7 for first floor, 5.4 for second, -2.7 for basement.
- Each level has its own independent walls, doors, windows, rooms, and items arrays. The wallIndex references are local to that level's walls array.
- If only one floor is visible, return a single level with index 0 and elevation 0.

Rules:
- Coordinates are in meters. Normalise so the floor plan fits roughly within a 20x20 metre bounding box.
- X axis goes right, Z axis goes down (top-down view).
- Y is always 0 (ground floor slab level).
- wall "startX/startZ" and "endX/endZ" are the two endpoints of each wall segment.
- door/window "wallIndex" is the 0-based index into the walls array of the wall the opening belongs to.
- door/window "position" is a value between 0 and 1 indicating where along the wall the centre of the opening sits (0 = start, 1 = end).
- Default wall height: 2.7, default wall thickness: 0.15.
- Default door width: 0.9, door height: 2.1.
- Default window width: 1.2, window height: 1.2, sill height: 0.9.
- Include ALL visible walls, doors, and windows.
- If a value cannot be determined, use the default.

Room/zone rules:
- Identify every distinct room or space visible in the floor plan (labelled or inferred from layout).
- "name" is the room label (e.g. "Living Room", "Kitchen", "Bedroom 1", "Hallway").
- "zoneType" classifies the room: use "kitchen" for kitchens, "bathroom" for bathrooms/WCs/ensuites, "bedroom" for bedrooms, "living" for living/family/lounge rooms, "hallway" for corridors/hallways/entries, "garage" for garages, "utility" for laundry/storage/utility rooms, "room" for generic rooms, "other" for anything else.
- "points" is an array of polygon vertices (in clockwise order) that define the room boundary in the XZ plane, using the same coordinate system as walls. The polygon should follow the inner edges of the enclosing walls.
- "color" should be null (a default will be assigned based on zoneType).
- Include ALL rooms/spaces, even small ones like closets or pantries.

Furniture / items:
- Only include items that are clearly visible or labeled in the floor plan (e.g. sofas, beds, tables, kitchen appliances, bathroom fixtures).
- "itemType" must be one of: "furniture" (sofas, beds, tables, chairs, desks), "appliance" (ovens, fridges, washing machines), or "fixture" (toilets, sinks, bathtubs, showers).
- "position" is the centre point of the item in the same coordinate system as walls.
- "dimensions" is width (x), height (y), and depth (z) in meters. Use reasonable estimates if exact sizes are not clear.
- If no furniture is visible, return an empty items array.`;

  const modelName = "gemini-3.1-flash-preview";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

  console.log("=== GEMINI FLOOR PLAN PARSE START ===");
  console.log(`Model: ${modelName}`);
  console.log(`Image size: ${Math.round(base64Image.length / 1024)} KB`);
  console.log(`MIME type: ${mimeType}`);

  const requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Image,
          },
        },
      ],
    }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  };

  const fetchResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(50000),
  });

  const requestStatus = fetchResponse.status;
  console.log(`Gemini HTTP status: ${requestStatus}`);

  if (!fetchResponse.ok) {
    const errorText = await fetchResponse.text();
    console.error("Gemini error body:", errorText);
    throw new Error(`Gemini API request failed with status ${requestStatus}: ${errorText}`);
  }

  const response = await fetchResponse.json();
  console.log("=== GEMINI RESPONSE RECEIVED ===");

  const candidate = response.candidates?.[0];
  if (!candidate) {
    throw new Error("No candidates in Gemini API response");
  }

  if (candidate.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(`Gemini generation did not complete normally: ${candidate.finishReason}`);
  }

  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error("Invalid Gemini response structure — no parts array");
  }

  const textPart = parts.find((p: any) => typeof p.text === "string");
  if (!textPart?.text) {
    throw new Error("Gemini returned no text content");
  }

  console.log("Raw Gemini text (first 500 chars):", textPart.text.substring(0, 500));

  // Strip markdown fences if present (defensive)
  let jsonText = textPart.text.trim();
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonText = fenceMatch[1].trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (parseError: any) {
    throw new Error(`Failed to parse Gemini JSON response: ${parseError.message}. Raw text: ${jsonText.substring(0, 300)}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Gemini response is not a JSON object");
  }

  // Log summary — handle both multi-level and flat formats
  if (Array.isArray(parsed.levels)) {
    console.log(`Parsed: ${parsed.levels.length} level(s)`);
    for (const lvl of parsed.levels) {
      const walls = Array.isArray(lvl.walls) ? lvl.walls.length : 0;
      const doors = Array.isArray(lvl.doors) ? lvl.doors.length : 0;
      const windows = Array.isArray(lvl.windows) ? lvl.windows.length : 0;
      const rooms = Array.isArray(lvl.rooms) ? lvl.rooms.length : 0;
      const items = Array.isArray(lvl.items) ? lvl.items.length : 0;
      console.log(`  Level "${lvl.name ?? "?"}" (index ${lvl.index ?? "?"}): ${walls} walls, ${doors} doors, ${windows} windows, ${rooms} rooms, ${items} items`);
    }
  } else {
    // Flat format — ensure arrays exist even if Gemini omits them
    parsed.walls = Array.isArray(parsed.walls) ? parsed.walls : [];
    parsed.doors = Array.isArray(parsed.doors) ? parsed.doors : [];
    parsed.windows = Array.isArray(parsed.windows) ? parsed.windows : [];
    parsed.rooms = Array.isArray(parsed.rooms) ? parsed.rooms : [];
    const rooms = parsed.rooms.length;
    const items = Array.isArray(parsed.items) ? parsed.items.length : 0;
    console.log(`Parsed (flat): ${parsed.walls.length} walls, ${parsed.doors.length} doors, ${parsed.windows.length} windows, ${rooms} rooms, ${items} items`);
  }

  return parsed;
}

// ─── Read raw body ─────────────────────────────────────────

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// ─── Handler ──────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("=== generate-from-image request start ===");
  console.log("Method:", req.method);
  console.log("Query:", req.query);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth
  const session = await requireAuth(req, res);
  if (!session) return;

  const userId = session.userId;

  // Parse floorplan ID from route
  const { id } = req.query;
  const floorplanId = parseInt(id as string);
  if (isNaN(floorplanId)) {
    return res.status(400).json({ error: "Invalid floorplan ID" });
  }

  console.log("User ID:", userId);
  console.log("Floorplan ID:", floorplanId);

  // Check API key early
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    console.error("GOOGLE_GEMINI_API_KEY is not set");
    return res.status(500).json({
      error: "AI service not configured",
      details: "Please set GOOGLE_GEMINI_API_KEY in environment variables",
    });
  }

  try {
    // Ownership check — floorplan must belong to this user
    const [floorplan] = await db
      .select()
      .from(floorplanDesigns)
      .where(and(eq(floorplanDesigns.id, floorplanId), eq(floorplanDesigns.userId, userId)));

    if (!floorplan) {
      return res.status(404).json({ error: "Floorplan not found" });
    }

    // Deduct credit upfront to prevent race conditions. Credit consumed for attempt, not success.
    const deducted = await deductCredit(userId);
    if (!deducted) {
      const status = await getSubscriptionStatus(userId);
      return res.status(403).json({
        error: "Credit limit reached",
        code: "LIMIT_REACHED",
        details: {
          remaining: status.remaining,
          limit: status.generationsLimit,
          plan: status.plan,
        },
        message: "No credits remaining. Please purchase more credits to continue generating.",
        redirectTo: "/pricing",
      });
    }
    console.log("Deducted 1 credit from user", userId);

    // Read raw image body
    const imageBuffer = await readRawBody(req);
    if (!imageBuffer.length) {
      return res.status(400).json({ error: "No image data in request body" });
    }

    // Size limit: 10 MB
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return res.status(413).json({ error: "Image too large. Maximum 10MB." });
    }

    const contentType = (req.headers["content-type"] as string) || "image/png";
    let mimeType = contentType.split(";")[0].trim();

    console.log(`Raw buffer size: ${imageBuffer.length} bytes`);
    console.log(`Content-Type header: ${mimeType}`);

    // Detect PDF uploads via content-type header or magic bytes and convert to PNG
    let geminiBuffer = imageBuffer;
    const detectedPdf =
      mimeType === "application/pdf" || isPdfBuffer(imageBuffer);

    if (detectedPdf) {
      console.log("PDF detected — converting first page to PNG...");
      try {
        const result = await processPdf(imageBuffer);
        geminiBuffer = result.imageBuffer;
        mimeType = result.mimeType;
        console.log(
          `PDF converted: ${result.width}x${result.height} px, ${result.pageCount} page(s), ` +
            `PNG size ${Math.round(geminiBuffer.length / 1024)} KB`
        );
      } catch (pdfError: any) {
        console.error("PDF conversion error:", pdfError.message);
        return res.status(422).json({
          error: "Failed to process PDF file",
          details: pdfError.message,
        });
      }
    }

    console.log(`Gemini buffer size: ${geminiBuffer.length} bytes`);
    console.log(`MIME type for Gemini: ${mimeType}`);

    // Upload original file to Vercel Blob for reference
    const ext = detectedPdf
      ? "pdf"
      : mimeType.includes("jpeg") || mimeType.includes("jpg")
        ? "jpg"
        : "png";
    const blobFilename = `floorplans/${floorplanId}/source-${Date.now()}.${ext}`;
    console.log("Uploading source file to Vercel Blob:", blobFilename);

    const blob = await put(blobFilename, imageBuffer, {
      access: "public",
      contentType: detectedPdf ? "application/pdf" : mimeType,
    });
    console.log("Uploaded source file:", blob.url);

    // Call Gemini to parse the floor plan (always send the PNG / image buffer)
    console.log("Calling Gemini to parse floor plan...");
    let geminiData: any;
    try {
      geminiData = await parseFloorplanWithGemini(geminiBuffer, mimeType);
    } catch (parseError: any) {
      console.error("Gemini parse error:", parseError.message);
      return res.status(422).json({
        error: "Failed to parse floor plan image",
        details: parseError.message,
      });
    }

    // Map Gemini output to Pascal SceneData
    const sceneData: SceneData = buildSceneFromGemini(geminiData);

    console.log(
      `SceneData built: ${Object.keys(sceneData.nodes).length} nodes, rootNodeIds: [${sceneData.rootNodeIds.join(", ")}]`
    );

    return res.status(200).json({ sceneData: JSON.stringify(sceneData) });
  } catch (error: any) {
    console.error("=== ERROR in generate-from-image ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);

    const errorMessage = error?.message || "Unexpected error";

    if (errorMessage.includes("quota") || errorMessage.includes("rate limit") || errorMessage.includes("429")) {
      return res.status(429).json({ error: "AI service rate limit reached. Please try again later." });
    }
    if (errorMessage.includes("GOOGLE_GEMINI_API_KEY")) {
      return res.status(500).json({ error: "AI service is not configured properly" });
    }

    return res.status(500).json({
      error: "An unexpected error occurred during floor plan generation",
      details: errorMessage,
    });
  }
}
