import type { VercelRequest, VercelResponse } from "@vercel/node";
import pLimit from "p-limit";
import pRetry, { AbortError } from "p-retry";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";
import { canUserGenerate, deductCredit } from "../../lib/subscription-manager.js";

// Inline schema
const users = pgTable("users", {
  id: varchar("id").primaryKey(),
});

const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
});

const floorplanModels = pgTable("floorplan_models", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  originalUrl: text("original_url").notNull(),
  pascalData: text("pascal_data"),
  status: text("status").notNull().default("uploaded"),
});

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");
  return drizzle(neon(process.env.DATABASE_URL));
}

function getSessionFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const sessionCookie = cookieHeader.split(";").map(c => c.trim()).find(c => c.startsWith("auth_session="));
  return sessionCookie ? sessionCookie.split("=")[1] : null;
}

async function verifySession(token: string): Promise<{ userId: string } | null> {
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.userId === "string" ? { userId: payload.userId } : null;
  } catch {
    return null;
  }
}

function getApiKey() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
  return apiKey;
}

async function extractPascalGeometry(
  imageBuffer: Buffer,
  mimeType: string
) {
  const apiKey = getApiKey();
  const limit = pLimit(1);

  return limit(() =>
    pRetry(
      async () => {
        try {
          const base64Image = imageBuffer.toString("base64");
          const prompt = `Analyze this 2D floorplan and extract the geometric primitive node graph.
Return ONLY a structured JSON representation of the architecture.
The JSON should map nodes like WALL, DOOR, WINDOW, and SLAB, including relative coordinates and sizes.
Ensure it is a valid JSON that a Pascal geometric engine could use.`;

          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

          const requestBody = {
            contents: [{
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Image
                  }
                }
              ]
            }],
            generationConfig: {
              responseModalities: ["TEXT"],
              responseMimeType: "application/json"
            }
          };

          const fetchResponse = await fetch(endpoint, {
            method: "POST",
            headers: {
              "x-goog-api-key": apiKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(90_000),
          });

          if (!fetchResponse.ok) {
            throw new Error(`API request failed with status ${fetchResponse.status}: ${await fetchResponse.text()}`);
          }

          const response = await fetchResponse.json();
          const candidate = response.candidates?.[0];
          
          if (!candidate || candidate.finishReason !== "STOP") {
            throw new Error("Generation failed or blocked");
          }

          const textResult = candidate.content?.parts?.[0]?.text;
          if (!textResult) throw new Error("No text response received");

          return { success: true, geometry: JSON.parse(textResult) };
        } catch (error: any) {
          if (error?.message?.includes("status 4")) {
            throw new AbortError(error.message);
          }
          throw error;
        }
      },
      { retries: 2, minTimeout: 2000, maxTimeout: 5000 }
    )
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = getSessionFromCookies(req.headers.cookie || null);
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const session = await verifySession(token);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const modelId = parseInt(req.query.id as string);
  if (isNaN(modelId)) return res.status(400).json({ error: "Invalid model ID" });

  try {
    const hasCredits = await canUserGenerate(session.userId);
    if (!hasCredits) return res.status(403).json({ error: "Credit limit reached" });

    const [model] = await db.select().from(floorplanModels).where(eq(floorplanModels.id, modelId));
    if (!model) return res.status(404).json({ error: "Model not found" });

    const [project] = await db.select().from(projects).where(eq(projects.id, model.projectId));
    if (!project || project.userId !== session.userId) return res.status(403).json({ error: "Access denied" });

    await db.update(floorplanModels).set({ status: "generating_pascal" }).where(eq(floorplanModels.id, modelId));

    const imageResponse = await fetch(model.originalUrl);
    if (!imageResponse.ok) throw new Error("Failed to fetch original image");

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const mimeType = imageResponse.headers.get("content-type") || "image/png";

    const result = await extractPascalGeometry(imageBuffer, mimeType);

    if (result.success) {
      await deductCredit(session.userId);
      // Update status to mark geometry as ready
      const [updatedModel] = await db.update(floorplanModels).set({
        status: "pascal_ready",
        pascalData: JSON.stringify(result.geometry),
      }).where(eq(floorplanModels.id, modelId)).returning();
      
      res.json({ ...updatedModel, geometryData: result.geometry });
    } else {
      await db.update(floorplanModels).set({ status: "uploaded" }).where(eq(floorplanModels.id, modelId));
      res.status(500).json({ error: "Failed to generate Pascal geometry" });
    }
  } catch (error: any) {
    await db.update(floorplanModels).set({ status: "uploaded" }).where(eq(floorplanModels.id, modelId));
    res.status(500).json({ error: error?.message || "An unexpected error occurred" });
  }
}
