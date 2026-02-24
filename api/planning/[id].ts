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

const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

  const db = getDb();

  if (req.method === "GET") {
    try {
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

      // Parse JSON fields
      const result = {
        ...analysis,
        propertyAnalysis: analysis.propertyAnalysis ? JSON.parse(analysis.propertyAnalysis) : null,
        approvalSearchResults: analysis.approvalSearchResults ? JSON.parse(analysis.approvalSearchResults) : null,
      };

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      return res.status(500).json({ error: "Failed to fetch analysis" });
    }
  }

  if (req.method === "DELETE") {
    try {
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

      await db.delete(planningAnalyses).where(eq(planningAnalyses.id, analysisId));

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting analysis:", error);
      return res.status(500).json({ error: "Failed to delete analysis" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
