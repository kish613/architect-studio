import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { canUserGenerate, deductCredit } from "../../lib/subscription-manager.js";
import { requireAuth } from "../../lib/auth.js";
import { db } from "../../lib/db.js";
import { floorplanModels, projects, users } from "../../../shared/schema.js";
import {
  buildSceneFromGemini,
  parseFloorplanWithGemini,
  summarizeGeminiFloorplanData,
  summarizeSceneData,
} from "../../../lib/pascal.js";

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
      return res.status(403).json({ error: "Credit limit reached" });
    }

    const startedAt = new Date();
    await db
      .update(floorplanModels)
      .set({
        provider: "gemini",
        stage: "generating_pascal",
        status: "generating_pascal",
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

    console.log(`[generate-pascal] Model ${modelId}: Starting Gemini parse, image ${Math.round(imageBuffer.length / 1024)}KB, mime=${mimeType}`);
    const geminiData = await parseFloorplanWithGemini(imageBuffer, mimeType);
    const geminiSummary = summarizeGeminiFloorplanData(geminiData);
    console.log(`[generate-pascal] Model ${modelId}: Gemini returned ${geminiSummary.wallCount} walls, ${geminiSummary.doorCount} doors, ${geminiSummary.windowCount} windows, ${geminiSummary.roomCount} rooms, ${geminiSummary.itemCount} items`);

    const sceneData = buildSceneFromGemini(geminiData);
    const sceneSummary = summarizeSceneData(sceneData);
    console.log(`[generate-pascal] Model ${modelId}: Scene built with ${sceneSummary.nodeCount} nodes (${sceneSummary.wallCount}W ${sceneSummary.doorCount}D ${sceneSummary.windowCount}Win ${sceneSummary.zoneCount}Z ${sceneSummary.itemCount}I)`);

    const deducted = await deductCredit(user.id);
    if (!deducted) {
      console.error("Failed to deduct credit after successful Pascal generation");
    }

    const nextSceneVersion = model.pascalData
      ? Math.max(1, (model.sceneVersion ?? 1) + 1)
      : Math.max(1, model.sceneVersion ?? 1);
    const diagnostics = {
      gemini: summarizeGeminiFloorplanData(geminiData),
      scene: summarizeSceneData(sceneData),
    };

    const [updatedModel] = await db
      .update(floorplanModels)
      .set({
        provider: "gemini",
        stage: "pascal_ready",
        status: "pascal_ready",
        pascalData: JSON.stringify(sceneData),
        sceneVersion: nextSceneVersion,
        startedAt,
        finishedAt: new Date(),
        lastError: null,
        lastDiagnostics: stringifyDiagnostics(diagnostics),
      })
      .where(eq(floorplanModels.id, modelId))
      .returning();

    return res.json({
      ...updatedModel,
      sceneData: JSON.stringify(sceneData),
    });
  } catch (error: any) {
    const message = error?.message || "Failed to generate Pascal model";
    const diagnostics = stringifyDiagnostics(error?.diagnostics);

    await db
      .update(floorplanModels)
      .set({
        provider: "gemini",
        stage: "failed",
        status: "failed",
        finishedAt: new Date(),
        lastError: message,
        lastDiagnostics: diagnostics,
      })
      .where(eq(floorplanModels.id, modelId));

    return res.status(500).json({ error: message });
  }
}
