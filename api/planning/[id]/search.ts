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

    if (!analysis.propertyAnalysis) {
      return res.status(400).json({ error: "Property must be analyzed first" });
    }

    // Check for address/postcode
    if (!analysis.address && !analysis.postcode) {
      return res.status(400).json({ error: "Address or postcode is required for planning search" });
    }

    const propertyAnalysis = JSON.parse(analysis.propertyAnalysis);

    // Geocode the address if coordinates not set
    let latitude = analysis.latitude ? parseFloat(analysis.latitude) : 0;
    let longitude = analysis.longitude ? parseFloat(analysis.longitude) : 0;

    if (!latitude || !longitude) {
      const { geocodeAddress } = await import("../../../lib/geocoding.js");
      const query = analysis.postcode || analysis.address || "";
      const geoResult = await geocodeAddress(query);
      
      if (geoResult) {
        latitude = geoResult.latitude;
        longitude = geoResult.longitude;
        
        // Update coordinates in database
        await db
          .update(planningAnalyses)
          .set({ 
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            updatedAt: new Date() 
          })
          .where(eq(planningAnalyses.id, analysisId));
      }
    }

    // Update status
    await db
      .update(planningAnalyses)
      .set({ status: "searching", updatedAt: new Date() })
      .where(eq(planningAnalyses.id, analysisId));

    // Search for planning approvals
    const { searchPlanningApprovals } = await import("../../../lib/planning-search.js");

    const result = await searchPlanningApprovals(
      propertyAnalysis,
      analysis.address || "",
      analysis.postcode || "",
      latitude,
      longitude
    );

    if (!result.success || !result.results) {
      await db
        .update(planningAnalyses)
        .set({ 
          status: "failed", 
          errorMessage: result.error || "Planning search failed",
          updatedAt: new Date() 
        })
        .where(eq(planningAnalyses.id, analysisId));

      return res.status(500).json({ error: result.error || "Planning search failed" });
    }

    // Update with search results
    await db
      .update(planningAnalyses)
      .set({ 
        approvalSearchResults: JSON.stringify(result.results),
        status: "awaiting_selection",
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
      propertyAnalysis,
      approvalSearchResults: result.results,
    });
  } catch (error) {
    console.error("Planning search error:", error);
    return res.status(500).json({ error: "Failed to search planning approvals" });
  }
}
