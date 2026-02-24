import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
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
  houseNumber: text("house_number"),
  workflowMode: text("workflow_mode").default("classic"),
  extensionOptions: text("extension_options"),
  selectedOptionTier: text("selected_option_tier"),
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

const VALID_TIERS = ["pdr_only", "moderate_planning", "maximum_extension"] as const;

/**
 * POST /api/planning/[id]/select-option
 * Selects one of the 3 extension option tiers.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

  const { optionTier } = req.body || {};
  if (!optionTier || !VALID_TIERS.includes(optionTier)) {
    return res.status(400).json({
      error: `Invalid option tier. Must be one of: ${VALID_TIERS.join(", ")}`,
    });
  }

  try {
    const db = getDb();

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

    if (analysis.workflowMode !== "extend") {
      return res.status(400).json({ error: "This analysis is not in extend mode" });
    }

    if (analysis.status !== "options_ready") {
      return res.status(400).json({ error: "Extension options must be generated first" });
    }

    await db
      .update(planningAnalyses)
      .set({
        selectedOptionTier: optionTier,
        updatedAt: new Date(),
      })
      .where(eq(planningAnalyses.id, analysisId));

    const [updated] = await db
      .select()
      .from(planningAnalyses)
      .where(eq(planningAnalyses.id, analysisId));

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Select option error:", error);
    return res.status(500).json({ error: "Failed to select option" });
  }
}
