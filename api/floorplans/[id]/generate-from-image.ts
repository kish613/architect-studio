import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, and } from "drizzle-orm";
import { put } from "@vercel/blob";
import { canUserGenerate, getSubscriptionStatus, deductCredit } from "../../lib/subscription-manager.js";
import { requireAuth } from "../../lib/auth.js";
import { db } from "../../lib/db.js";
import { floorplanDesigns } from "../../../shared/schema.js";

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

type AnyNode = SiteNode | BuildingNode | LevelNode | WallNode | DoorNode | WindowNode;

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

function buildSceneFromGemini(geminiData: {
  walls: Array<{
    id?: string;
    startX: number;
    startZ: number;
    endX: number;
    endZ: number;
    height?: number;
    thickness?: number;
  }>;
  doors: Array<{
    wallIndex: number;
    position?: number;
    width?: number;
    height?: number;
    doorType?: string;
    swing?: string;
  }>;
  windows: Array<{
    wallIndex: number;
    position?: number;
    width?: number;
    height?: number;
    sillHeight?: number;
    windowType?: string;
  }>;
}): SceneData {
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

  // Level (Ground Floor)
  const level: LevelNode = {
    ...(makeBase("level", "Ground Floor") as BaseNode),
    type: "level",
    parentId: building.id,
    elevation: 0,
    height: 2.7,
    index: 0,
    transform: { ...defaultTransform },
  };

  site.childIds = [building.id];
  building.childIds = [level.id];

  nodes[site.id] = site;
  nodes[building.id] = building;
  nodes[level.id] = level;

  const wallIds: string[] = [];

  // Create walls
  for (const w of geminiData.walls ?? []) {
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
  for (const d of geminiData.doors ?? []) {
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
  for (const w of geminiData.windows ?? []) {
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

  return { nodes, rootNodeIds: [site.id] };
}

// ─── Gemini request ────────────────────────────────────────

async function parseFloorplanWithGemini(imageBuffer: Buffer, mimeType: string) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not configured");

  const base64Image = imageBuffer.toString("base64");

  const prompt = `Analyze this 2D architectural floor plan image and extract all structural elements as JSON.

Return ONLY a valid JSON object with no markdown, no code fences, no explanation text — just the raw JSON object.

The JSON must have this exact structure:
{
  "walls": [
    { "startX": number, "startZ": number, "endX": number, "endZ": number, "height": number, "thickness": number }
  ],
  "doors": [
    { "wallIndex": number, "position": number, "width": number, "height": number, "doorType": "single"|"double"|"sliding"|"french"|"bifold", "swing": "left"|"right" }
  ],
  "windows": [
    { "wallIndex": number, "position": number, "width": number, "height": number, "sillHeight": number, "windowType": "fixed"|"casement"|"sash"|"sliding"|"bay"|"skylight" }
  ]
}

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
- Do NOT include any rooms, furniture, or annotations — only walls, doors, and windows.`;

  const modelName = "gemini-2.0-flash";
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

  // Ensure arrays exist even if Gemini omits them
  parsed.walls = Array.isArray(parsed.walls) ? parsed.walls : [];
  parsed.doors = Array.isArray(parsed.doors) ? parsed.doors : [];
  parsed.windows = Array.isArray(parsed.windows) ? parsed.windows : [];

  console.log(`Parsed: ${parsed.walls.length} walls, ${parsed.doors.length} doors, ${parsed.windows.length} windows`);

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

    // Credit check
    const hasCredits = await canUserGenerate(userId);
    if (!hasCredits) {
      const status = await getSubscriptionStatus(userId);
      return res.status(403).json({
        error: "Credit limit reached",
        code: "LIMIT_REACHED",
        details: {
          remaining: status.remaining,
          limit: status.generationsLimit,
          plan: status.plan,
        },
        message: "Please upgrade your plan or purchase additional generations",
        redirectTo: "/pricing",
      });
    }

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
    const mimeType = contentType.split(";")[0].trim();

    console.log(`Image buffer size: ${imageBuffer.length} bytes`);
    console.log(`MIME type: ${mimeType}`);

    // Upload original image to Vercel Blob for reference
    const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
    const blobFilename = `floorplans/${floorplanId}/source-${Date.now()}.${ext}`;
    console.log("Uploading source image to Vercel Blob:", blobFilename);

    const blob = await put(blobFilename, imageBuffer, {
      access: "public",
      contentType: mimeType,
    });
    console.log("Uploaded source image:", blob.url);

    // Call Gemini to parse the floor plan
    console.log("Calling Gemini to parse floor plan...");
    let geminiData: any;
    try {
      geminiData = await parseFloorplanWithGemini(imageBuffer, mimeType);
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

    // Deduct credit
    const deducted = await deductCredit(userId);
    if (!deducted) {
      console.error("Failed to deduct credit — possible race condition, continuing anyway");
    } else {
      console.log("Deducted 1 credit from user", userId);
    }

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
