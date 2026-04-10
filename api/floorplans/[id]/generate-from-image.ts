/**
 * POST /api/floorplans/:id/generate-from-image
 *
 * BIM-first generation endpoint.
 *
 * Flow:
 *   1. Authenticate + check ownership
 *   2. Deduct a generation credit (preserved from the legacy route)
 *   3. Read the raw body and detect whether it is an image or a PDF
 *   4. Upload the source file to blob storage
 *   5. Run the modular floorplan pipeline (preprocess → extract → validate)
 *   6. Persist canonical BIM JSON + legacy Pascal sceneData + source URL +
 *      diagnostics on the floorplan_designs row
 *   7. Return a rich response containing the canonical BIM, pascal sceneData
 *      (for the legacy editor), and any derived asset URLs the server knows
 *      about (IFC/GLB/Fragments stay empty until downstream builders wire
 *      in — the shape is already in place)
 *
 * This file is intentionally slim. All business logic lives in
 * `lib/floorplan-pipeline/*` so it can be unit tested without a request.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, and } from "drizzle-orm";
import { put } from "@vercel/blob";

import { requireAuth } from "../../lib/auth.js";
import { db } from "../../lib/db.js";
import {
  deductCredit,
  getSubscriptionStatus,
} from "../../lib/subscription-manager.js";
import { floorplanDesigns } from "../../../shared/schema.js";

import {
  canonicalBimToPascalScene,
  createGeminiExtractor,
  detectSource,
  runFloorplanPipeline,
  toBimViewerPayload,
} from "../../../lib/floorplan-pipeline/index.js";
import type { FloorplanSourceFile } from "../../../lib/floorplan-pipeline/index.js";

export const config = { api: { bodyParser: false } };

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// ─────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("=== generate-from-image (BIM pipeline) start ===");
  console.log("Method:", req.method);
  console.log("Query:", req.query);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth (unchanged — existing pattern)
  const session = await requireAuth(req, res);
  if (!session) return;

  const userId = session.userId;

  const floorplanId = parseInt((req.query.id as string) ?? "", 10);
  if (Number.isNaN(floorplanId)) {
    return res.status(400).json({ error: "Invalid floorplan ID" });
  }

  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    console.error("GOOGLE_GEMINI_API_KEY is not set");
    return res.status(500).json({
      error: "AI service not configured",
      details: "Please set GOOGLE_GEMINI_API_KEY in environment variables",
    });
  }

  try {
    // 1. Ownership check
    const [floorplan] = await db
      .select()
      .from(floorplanDesigns)
      .where(
        and(
          eq(floorplanDesigns.id, floorplanId),
          eq(floorplanDesigns.userId, userId)
        )
      );
    if (!floorplan) {
      return res.status(404).json({ error: "Floorplan not found" });
    }

    // 2. Credit gate (preserved from the legacy route)
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
        message:
          "No credits remaining. Please purchase more credits to continue generating.",
        redirectTo: "/pricing",
      });
    }

    // 3. Read and size-check the raw body
    const rawBuffer = await readRawBody(req);
    if (!rawBuffer.length) {
      return res
        .status(400)
        .json({ error: "No file data in request body" });
    }

    // Allow slightly more for PDFs (they are often multi-page); cap at 20 MB.
    if (rawBuffer.length > 20 * 1024 * 1024) {
      return res
        .status(413)
        .json({ error: "File too large. Maximum 20MB." });
    }

    // 4. Detect source kind and upload original to blob storage.
    const source: FloorplanSourceFile = detectSource(
      rawBuffer,
      req.headers["content-type"] as string | undefined
    );

    const blobKey = `floorplans/${floorplanId}/source-${Date.now()}.${source.ext}`;
    console.log("Uploading original source:", blobKey);
    const sourceBlob = await put(blobKey, source.buffer, {
      access: "public",
      contentType:
        source.kind === "pdf" ? "application/pdf" : source.mimeType,
    });
    console.log("Source URL:", sourceBlob.url);

    // 5. Run the modular pipeline
    const extractor = createGeminiExtractor({
      apiKey: process.env.GOOGLE_GEMINI_API_KEY,
      sourceType: source.kind,
      sourceFileUrl: sourceBlob.url,
    });

    let pipelineResult;
    try {
      pipelineResult = await runFloorplanPipeline({ source, extractor });
    } catch (err) {
      const diagnostics =
        (err as Error & { diagnostics?: unknown }).diagnostics ?? [];
      console.error("Pipeline failure:", err);
      return res.status(422).json({
        error: "Failed to generate BIM model from floor plan",
        details: err instanceof Error ? err.message : "Unknown pipeline error",
        diagnostics,
      });
    }

    const { bim, diagnostics } = pipelineResult;

    // 6. Derive legacy Pascal scene (bridge only — not the source of truth)
    const pascalScene = canonicalBimToPascalScene(bim);

    // 7. Persist canonical BIM + legacy sceneData + diagnostics + source
    const canonicalJson = JSON.stringify(bim);
    const sceneData = JSON.stringify(pascalScene);
    const diagnosticsJson = JSON.stringify({
      generatedAt: new Date().toISOString(),
      extractor: extractor.name,
      totals: toBimViewerPayload(bim).totals,
      scaleConfidence: bim.metadata.scaleConfidence,
      messages: diagnostics,
    });

    const [updated] = await db
      .update(floorplanDesigns)
      .set({
        canonicalJson,
        sceneData,
        sourceFileUrl: sourceBlob.url,
        diagnosticsJson,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(floorplanDesigns.id, floorplanId),
          eq(floorplanDesigns.userId, userId)
        )
      )
      .returning();

    console.log(
      `BIM generated: ${bim.walls.length} walls, ${bim.rooms.length} rooms, ${bim.doors.length} doors, ${bim.windows.length} windows, ${bim.furniture.length + bim.fixtures.length} assets`
    );

    // 8. Rich response — new callers read canonicalJson, legacy callers
    //    keep reading sceneData. Both are JSON strings to match the existing
    //    API contract.
    return res.status(200).json({
      floorplan: updated ?? null,
      canonicalJson,
      sceneData,
      sourceFileUrl: sourceBlob.url,
      ifcUrl: updated?.ifcUrl ?? null,
      fragmentsUrl: updated?.fragmentsUrl ?? null,
      glbUrl: updated?.glbUrl ?? null,
      diagnostics,
      summary: toBimViewerPayload(bim).totals,
    });
  } catch (error: any) {
    console.error("=== ERROR in generate-from-image (BIM pipeline) ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);

    const message = error?.message || "Unexpected error";

    if (
      message.includes("quota") ||
      message.includes("rate limit") ||
      message.includes("429")
    ) {
      return res
        .status(429)
        .json({
          error: "AI service rate limit reached. Please try again later.",
        });
    }
    if (message.includes("GOOGLE_GEMINI_API_KEY")) {
      return res
        .status(500)
        .json({ error: "AI service is not configured properly" });
    }

    return res.status(500).json({
      error: "An unexpected error occurred during BIM generation",
      details: message,
    });
  }
}
