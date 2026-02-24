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
  realApprovalData: text("real_approval_data"),
  pdrAssessment: text("pdr_assessment"),
  isConservationArea: boolean("is_conservation_area").default(false),
  isListedBuilding: boolean("is_listed_building").default(false),
  listedBuildingGrade: text("listed_building_grade"),
  conservationAreaName: text("conservation_area_name"),
  orientation: text("orientation"),
  partyWallAssessment: text("party_wall_assessment"),
  neighbourImpact: text("neighbour_impact"),
  extensionOptions: text("extension_options"),
  selectedOptionTier: text("selected_option_tier"),
  costEstimate: text("cost_estimate"),
  generatedOptionFloorplans: text("generated_option_floorplans"),
  satelliteImageUrl: text("satellite_image_url"),
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

/**
 * POST /api/planning/[id]/extend
 * Main orchestrator for the Smart Extension Advisor pipeline.
 * Runs: EPC lookup → conservation check → PDR calculation → real planning search →
 *       option generation → cost estimation → party wall + neighbour impact
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

  const db = getDb();

  try {
    // Fetch the analysis and verify ownership
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

    if (!analysis.postcode) {
      return res.status(400).json({ error: "Postcode is required for Smart Extension analysis" });
    }

    // ── Step 1: EPC Lookup ─────────────────────────────────────
    await db
      .update(planningAnalyses)
      .set({ status: "epc_lookup", updatedAt: new Date() })
      .where(eq(planningAnalyses.id, analysisId));

    const { lookupEPC } = await import("../../../lib/epc.js");
    const epcResult = await lookupEPC(analysis.postcode, analysis.houseNumber || undefined);

    let epcData = epcResult.certificate || null;
    if (epcData) {
      await db
        .update(planningAnalyses)
        .set({ epcData: JSON.stringify(epcData), updatedAt: new Date() })
        .where(eq(planningAnalyses.id, analysisId));
    }
    console.log(`[Extend] EPC lookup: ${epcResult.success ? "found" : "not found"}`);

    // ── Step 2: Conservation Area & Listed Building Check ──────
    const { checkConservationAndListing } = await import("../../../lib/perplexity.js");
    const conservationResult = await checkConservationAndListing(
      analysis.postcode,
      analysis.address || ""
    );

    await db
      .update(planningAnalyses)
      .set({
        isConservationArea: conservationResult.isConservationArea,
        isListedBuilding: conservationResult.isListedBuilding,
        listedBuildingGrade: conservationResult.listedBuildingGrade || null,
        conservationAreaName: conservationResult.conservationAreaName || null,
        updatedAt: new Date(),
      })
      .where(eq(planningAnalyses.id, analysisId));

    console.log(`[Extend] Conservation: ${conservationResult.isConservationArea}, Listed: ${conservationResult.isListedBuilding}`);

    // ── Step 3: PDR Calculation ───────────────────────────────
    await db
      .update(planningAnalyses)
      .set({ status: "pdr_calculating", updatedAt: new Date() })
      .where(eq(planningAnalyses.id, analysisId));

    const {
      calculatePDR,
      buildPDRInputFromEPC,
      generateExtensionOptions,
      estimateCosts,
      assessPartyWall,
      assessNeighbourImpact,
    } = await import("../../../lib/pdr-rules.js");

    // Build PDR input from EPC data or fallback defaults
    const pdrInput = epcData
      ? buildPDRInputFromEPC(
          epcData,
          conservationResult.isConservationArea,
          conservationResult.isListedBuilding
        )
      : {
          propertyType: "semi_detached" as const,
          builtForm: "Semi-Detached",
          isConservationArea: conservationResult.isConservationArea,
          isListedBuilding: conservationResult.isListedBuilding,
          totalFloorAreaSqM: 80,
          stories: 2,
        };

    const pdrAssessment = calculatePDR(pdrInput);
    await db
      .update(planningAnalyses)
      .set({ pdrAssessment: JSON.stringify(pdrAssessment), updatedAt: new Date() })
      .where(eq(planningAnalyses.id, analysisId));

    console.log(`[Extend] PDR calculated: ${pdrAssessment.overallPDRSummary.slice(0, 80)}`);

    // ── Step 4: Real Planning Search via Perplexity ──────────
    await db
      .update(planningAnalyses)
      .set({ status: "searching_real", updatedAt: new Date() })
      .where(eq(planningAnalyses.id, analysisId));

    const { searchRealPlanningApprovals } = await import("../../../lib/perplexity.js");
    const realApprovalResult = await searchRealPlanningApprovals({
      postcode: analysis.postcode,
      address: analysis.address || "",
      propertyType: epcData?.propertyType || pdrInput.builtForm,
    });

    if (realApprovalResult.success && realApprovalResult.data) {
      await db
        .update(planningAnalyses)
        .set({ realApprovalData: JSON.stringify(realApprovalResult.data), updatedAt: new Date() })
        .where(eq(planningAnalyses.id, analysisId));
    }

    console.log(`[Extend] Real planning search: ${realApprovalResult.data?.recentApprovals?.length ?? 0} applications found`);

    // ── Step 5: Generate Extension Options ───────────────────
    const extensionOptions = generateExtensionOptions(
      pdrAssessment,
      epcData || undefined,
      realApprovalResult.data || undefined,
      analysis.orientation || undefined
    );

    // ── Step 6: Estimate Costs ───────────────────────────────
    const optionsWithCosts = estimateCosts(extensionOptions, analysis.postcode);

    // ── Step 7: Party Wall Assessment ────────────────────────
    // Use the moderate option as representative for party wall assessment
    const moderateOption = optionsWithCosts.find((o) => o.tier === "moderate_planning") || optionsWithCosts[1];
    const partyWallAssessment = assessPartyWall(
      pdrInput.propertyType,
      moderateOption?.extensions || []
    );

    // ── Step 8: Neighbour Impact Analysis ────────────────────
    const neighbourImpact = assessNeighbourImpact(
      pdrInput.propertyType,
      moderateOption?.extensions || [],
      analysis.orientation || undefined
    );

    // ── Save Everything & Set Status ─────────────────────────
    await db
      .update(planningAnalyses)
      .set({
        extensionOptions: JSON.stringify(optionsWithCosts),
        partyWallAssessment: JSON.stringify(partyWallAssessment),
        neighbourImpact: JSON.stringify(neighbourImpact),
        status: "options_ready",
        updatedAt: new Date(),
      })
      .where(eq(planningAnalyses.id, analysisId));

    console.log(`[Extend] Pipeline complete — ${optionsWithCosts.length} options ready`);

    // Return the full updated analysis
    const [updated] = await db
      .select()
      .from(planningAnalyses)
      .where(eq(planningAnalyses.id, analysisId));

    return res.status(200).json({
      ...updated,
      epcData: updated.epcData ? JSON.parse(updated.epcData) : null,
      realApprovalData: updated.realApprovalData ? JSON.parse(updated.realApprovalData) : null,
      pdrAssessment: updated.pdrAssessment ? JSON.parse(updated.pdrAssessment) : null,
      extensionOptions: updated.extensionOptions ? JSON.parse(updated.extensionOptions) : null,
      partyWallAssessment: updated.partyWallAssessment ? JSON.parse(updated.partyWallAssessment) : null,
      neighbourImpact: updated.neighbourImpact ? JSON.parse(updated.neighbourImpact) : null,
    });
  } catch (error) {
    console.error("[Extend] Pipeline error:", error);

    await db
      .update(planningAnalyses)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Smart extension analysis failed",
        updatedAt: new Date(),
      })
      .where(eq(planningAnalyses.id, analysisId));

    return res.status(500).json({ error: "Smart extension analysis failed" });
  }
}
