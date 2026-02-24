import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { eq, and } from "drizzle-orm";
import { jwtVerify } from "jose";
import { canUserGenerate, deductCredit } from "../../../lib/subscription-manager.js";

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
  houseNumber: text("house_number"),
  workflowMode: text("workflow_mode").default("classic"),
  epcData: text("epc_data"),
  extensionOptions: text("extension_options"),
  selectedOptionTier: text("selected_option_tier"),
  generatedOptionFloorplans: text("generated_option_floorplans"),
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

    // Check if user can generate (has credits)
    const canGenerate = await canUserGenerate(session.userId);
    if (!canGenerate) {
      return res.status(403).json({ 
        error: "No credits remaining. Please upgrade your plan to continue generating.",
        code: "NO_CREDITS"
      });
    }

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

    // ── Extend Mode: Generate from selected extension option ──
    if (analysis.workflowMode === "extend") {
      if (!analysis.selectedOptionTier) {
        return res.status(400).json({ error: "Please select an extension option first" });
      }

      if (!analysis.extensionOptions) {
        return res.status(400).json({ error: "Extension options must be generated first" });
      }

      // Update status to generating
      await db
        .update(planningAnalyses)
        .set({ status: "generating", updatedAt: new Date() })
        .where(eq(planningAnalyses.id, analysisId));

      const extensionOptions = JSON.parse(analysis.extensionOptions);
      const selectedOption = extensionOptions.find(
        (opt: any) => opt.tier === analysis.selectedOptionTier
      );

      if (!selectedOption) {
        throw new Error("Selected option tier not found in extension options");
      }

      // Build a description from the selected extension option
      const extensionDescriptions = selectedOption.extensions
        .map((ext: any) => `${ext.description} (+${ext.additionalSqM}sqm)`)
        .join("; ");
      const modificationDescription = `${selectedOption.label}: ${extensionDescriptions}. Total additional: ${selectedOption.totalAdditionalSqM}sqm.`;

      // Floorplan is required for extend mode — generate modified floorplan
      if (!analysis.floorplanUrl) {
        throw new Error("Floorplan is required for extend mode");
      }

      const floorplanResponse = await fetch(analysis.floorplanUrl);
      if (!floorplanResponse.ok) {
        throw new Error("Failed to fetch floorplan image");
      }

      const floorplanBuffer = Buffer.from(await floorplanResponse.arrayBuffer());
      const floorplanMimeType = floorplanResponse.headers.get("content-type") || "image/png";

      const { generateFloorplanModification } = await import("../../../lib/planning-search.js");

      // Parse EPC data for property info if available
      const epcData = analysis.epcData ? JSON.parse(analysis.epcData) : null;
      const propertyAnalysis = analysis.propertyAnalysis
        ? JSON.parse(analysis.propertyAnalysis)
        : {
            propertyType: epcData?.builtForm?.toLowerCase()?.replace(/[- ]/g, "_") || "semi-detached",
            architecturalStyle: "Unknown",
            estimatedEra: epcData?.constructionAgeBand || "Unknown",
            materials: [],
            existingFeatures: [],
            stories: 2,
            estimatedSqFt: Math.round((epcData?.totalFloorArea || 80) * 10.764),
          };

      const modType = selectedOption.extensions[0]?.type?.replace(/_/g, " ") || "extension";
      const estimatedSqFt = Math.round(selectedOption.totalAdditionalSqM * 10.764);

      const floorplanResult = await generateFloorplanModification(
        floorplanBuffer,
        floorplanMimeType,
        propertyAnalysis,
        modType,
        estimatedSqFt
      );

      // Also generate exterior visualization if property image is available
      let exteriorResult = null;
      const imageResponse = await fetch(analysis.propertyImageUrl);
      if (imageResponse.ok) {
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const mimeType = imageResponse.headers.get("content-type") || "image/png";

        const { generatePropertyVisualization } = await import("../../../lib/planning-search.js");
        exteriorResult = await generatePropertyVisualization(
          imageBuffer,
          mimeType,
          propertyAnalysis,
          modType,
          modificationDescription
        );
      }

      // Deduct credit
      await deductCredit(session.userId);

      // Store generated floorplans map
      const existingFloorplans = analysis.generatedOptionFloorplans
        ? JSON.parse(analysis.generatedOptionFloorplans)
        : {};
      existingFloorplans[analysis.selectedOptionTier!] = floorplanResult?.success
        ? floorplanResult.imageUrl
        : null;

      await db
        .update(planningAnalyses)
        .set({
          generatedFloorplanUrl: floorplanResult?.success ? floorplanResult.imageUrl : null,
          generatedExteriorUrl: exteriorResult?.success ? exteriorResult.imageUrl : null,
          generatedOptionFloorplans: JSON.stringify(existingFloorplans),
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(planningAnalyses.id, analysisId));

      const [updated] = await db
        .select()
        .from(planningAnalyses)
        .where(eq(planningAnalyses.id, analysisId));

      return res.status(200).json(updated);
    }

    // ── Classic Mode: Original flow ──────────────────────────
    if (!analysis.selectedModification) {
      return res.status(400).json({ error: "Please select a modification type first" });
    }

    if (!analysis.propertyAnalysis || !analysis.approvalSearchResults) {
      return res.status(400).json({ error: "Analysis and search must be completed first" });
    }

    // Update status to generating
    await db
      .update(planningAnalyses)
      .set({ status: "generating", updatedAt: new Date() })
      .where(eq(planningAnalyses.id, analysisId));

    const propertyAnalysis = JSON.parse(analysis.propertyAnalysis);
    const searchResults = JSON.parse(analysis.approvalSearchResults);

    // Find a relevant approval for the description
    const relevantApproval = searchResults.approvals?.find(
      (a: any) => a.modificationType === analysis.selectedModification
    );
    const modificationDescription = relevantApproval?.description ||
      `A typical ${analysis.selectedModification?.replace(/_/g, ' ')} for a ${propertyAnalysis.propertyType} property`;

    // Fetch the property image
    const imageResponse = await fetch(analysis.propertyImageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch property image");
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const mimeType = imageResponse.headers.get("content-type") || "image/png";

    // Generate property visualization
    const { generatePropertyVisualization, generateFloorplanModification } =
      await import("../../../lib/planning-search.js");

    const exteriorResult = await generatePropertyVisualization(
      imageBuffer,
      mimeType,
      propertyAnalysis,
      analysis.selectedModification!,
      modificationDescription
    );

    if (!exteriorResult.success) {
      await db
        .update(planningAnalyses)
        .set({
          status: "failed",
          errorMessage: exteriorResult.error || "Visualization generation failed",
          updatedAt: new Date()
        })
        .where(eq(planningAnalyses.id, analysisId));

      return res.status(500).json({ error: exteriorResult.error || "Visualization generation failed" });
    }

    // Generate floorplan modification if floorplan was uploaded
    let floorplanResult = null;
    if (analysis.floorplanUrl) {
      const floorplanResponse = await fetch(analysis.floorplanUrl);
      if (floorplanResponse.ok) {
        const floorplanBuffer = Buffer.from(await floorplanResponse.arrayBuffer());
        const floorplanMimeType = floorplanResponse.headers.get("content-type") || "image/png";

        const estimatedSqFt = relevantApproval?.estimatedSqFt || 150;

        floorplanResult = await generateFloorplanModification(
          floorplanBuffer,
          floorplanMimeType,
          propertyAnalysis,
          analysis.selectedModification!,
          estimatedSqFt
        );
      }
    }

    // Deduct credit for the generation
    await deductCredit(session.userId);

    // Update with generated URLs
    await db
      .update(planningAnalyses)
      .set({
        generatedExteriorUrl: exteriorResult.imageUrl,
        generatedFloorplanUrl: floorplanResult?.success ? floorplanResult.imageUrl : null,
        status: "completed",
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
      approvalSearchResults: searchResults,
    });
  } catch (error) {
    console.error("Generate visualization error:", error);
    
    const db = getDb();
    await db
      .update(planningAnalyses)
      .set({ 
        status: "failed", 
        errorMessage: error instanceof Error ? error.message : "Generation failed",
        updatedAt: new Date() 
      })
      .where(eq(planningAnalyses.id, analysisId));

    return res.status(500).json({ error: "Failed to generate visualization" });
  }
}
