import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { canUserGenerate, deductCredit } from "../../lib/subscription-manager.js";
import { requireAuth } from "../../lib/auth.js";
import { db } from "../../lib/db.js";
import { floorplanModels, projects, users } from "../../../shared/schema.js";
import { generateIsometricFloorplan } from "../../../lib/gemini.js";

export const maxDuration = 120;

function stringifyDiagnostics(diagnostics: unknown): string | null {
  if (!diagnostics) {
    return null;
  }

  try {
    return JSON.stringify(diagnostics);
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await requireAuth(req, res);
  if (!session) {
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const modelId = parseInt(req.query.id as string);
  if (Number.isNaN(modelId)) {
    return res.status(400).json({ error: "Invalid model ID" });
  }

  try {
    const [model] = await db.select().from(floorplanModels).where(eq(floorplanModels.id, modelId));
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, model.projectId));
    if (!project || project.userId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const hasCredits = await canUserGenerate(user.id);
    if (!hasCredits) {
      return res.status(403).json({
        error: "Credit limit reached",
        message: "No credits remaining. Please purchase more credits to continue generating.",
        redirectTo: "/pricing",
      });
    }

    const prompt =
      req.body && typeof req.body === "object" && typeof (req.body as { prompt?: unknown }).prompt === "string"
        ? (req.body as { prompt?: string }).prompt
        : undefined;

    const startedAt = new Date();
    await db
      .update(floorplanModels)
      .set({
        provider: "gemini",
        stage: "generating_isometric",
        status: "generating_isometric",
        isometricPrompt: prompt ?? null,
        startedAt,
        finishedAt: null,
        lastError: null,
        lastDiagnostics: null,
      })
      .where(eq(floorplanModels.id, modelId));

    const imageResponse = await fetch(model.originalUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch original image: ${imageResponse.status}`);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const mimeType = imageResponse.headers.get("content-type") || "image/png";
    const result = await generateIsometricFloorplan(imageBuffer, mimeType, prompt);

    if (!result.success || !result.imageUrl) {
      const [failedModel] = await db
        .update(floorplanModels)
        .set({
          provider: "gemini",
          stage: "failed",
          status: "failed",
          startedAt,
          finishedAt: new Date(),
          lastError: result.error || "Failed to generate isometric view",
          lastDiagnostics: stringifyDiagnostics(result.diagnostics),
        })
        .where(eq(floorplanModels.id, modelId))
        .returning();

      return res.status(500).json({
        error: result.error || "Failed to generate isometric view",
        model: failedModel,
      });
    }

    const deducted = await deductCredit(user.id);
    if (!deducted) {
      console.error("Failed to deduct credit after successful isometric generation");
    }

    const [updatedModel] = await db
      .update(floorplanModels)
      .set({
        provider: "gemini",
        stage: "isometric_ready",
        status: "isometric_ready",
        isometricUrl: result.imageUrl,
        isometricPrompt: prompt ?? null,
        startedAt,
        finishedAt: new Date(),
        lastError: null,
        lastDiagnostics: stringifyDiagnostics(result.diagnostics),
      })
      .where(eq(floorplanModels.id, modelId))
      .returning();

    return res.json(updatedModel);
  } catch (error: any) {
    const message = error?.message || "Failed to generate isometric view";

    await db
      .update(floorplanModels)
      .set({
        provider: "gemini",
        stage: "failed",
        status: "failed",
        finishedAt: new Date(),
        lastError: message,
        lastDiagnostics: stringifyDiagnostics(error?.diagnostics),
      })
      .where(eq(floorplanModels.id, modelId));

    if (message.includes("GOOGLE_GEMINI_API_KEY")) {
      return res.status(500).json({ error: "AI service is not configured properly" });
    }

    if (message.includes("quota") || message.includes("rate limit") || message.includes("429")) {
      return res.status(429).json({ error: "AI service rate limit reached. Please try again later." });
    }

    if (message.includes("NO_IMAGE_DATA")) {
      return res.status(500).json({
        error: "The AI model returned a text-only response after multiple retries. Please try again.",
      });
    }

    return res.status(500).json({ error: message });
  }
}
