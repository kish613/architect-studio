import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { eq, and } from "drizzle-orm";
import { jwtVerify } from "jose";

// Inline schema
const planningAnalyses = pgTable("planning_analyses", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  userId: varchar("user_id").notNull(),
  propertyImageUrl: text("property_image_url").notNull(),
  floorplanUrl: text("floorplan_url"),
  address: text("address"),
  postcode: text("postcode"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  propertyAnalysis: text("property_analysis"),
  approvalSearchResults: text("approval_search_results"),
  selectedModification: text("selected_modification"),
  generatedExteriorUrl: text("generated_exterior_url"),
  generatedFloorplanUrl: text("generated_floorplan_url"),
  generatedIsometricUrl: text("generated_isometric_url"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql);
}

function getSessionFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith("auth_session="));
  return sessionCookie ? sessionCookie.split("=")[1] : null;
}

async function verifySession(token: string): Promise<{ userId: string } | null> {
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId === "string") {
      return { userId: payload.userId };
    }
    return null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Authenticate user
  const sessionToken = getSessionFromCookies(req.headers.cookie || null);
  if (!sessionToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const session = await verifySession(sessionToken);
  if (!session) {
    return res.status(401).json({ error: "Invalid session" });
  }

  const { id } = req.query;
  const analysisId = parseInt(id as string);

  if (isNaN(analysisId)) {
    return res.status(400).json({ error: "Invalid analysis ID" });
  }

  // Get modification type from body
  let body: { modificationType?: string } = {};
  try {
    const bodyText = await new Promise<string>((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    // Body parsing failed
  }

  const { modificationType } = body;

  if (!modificationType) {
    return res.status(400).json({ error: "Modification type is required" });
  }

  try {
    const db = getDb();

    // Get the analysis
    const [analysis] = await db
      .select()
      .from(planningAnalyses)
      .where(
        and(
          eq(planningAnalyses.id, analysisId),
          eq(planningAnalyses.userId, session.userId)
        )
      );

    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    if (analysis.status !== "awaiting_selection") {
      return res.status(400).json({ error: "Analysis is not awaiting modification selection" });
    }

    // Update selected modification
    await db
      .update(planningAnalyses)
      .set({ 
        selectedModification: modificationType,
        updatedAt: new Date() 
      })
      .where(eq(planningAnalyses.id, analysisId));

    // Return the updated analysis
    const [updated] = await db
      .select()
      .from(planningAnalyses)
      .where(eq(planningAnalyses.id, analysisId));

    return res.status(200).json({
      ...updated,
      propertyAnalysis: analysis.propertyAnalysis ? JSON.parse(analysis.propertyAnalysis) : null,
      approvalSearchResults: analysis.approvalSearchResults ? JSON.parse(analysis.approvalSearchResults) : null,
    });
  } catch (error) {
    console.error("Select modification error:", error);
    return res.status(500).json({ error: "Failed to select modification" });
  }
}
