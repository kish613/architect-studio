import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../../lib/auth.js";
import { getSubscriptionStatus, deductCredit } from "../../lib/subscription-manager.js";
import { db } from "../../lib/db.js";
import { floorplanDesigns } from "../../../shared/schema.js";
import { callGeminiForEdits, buildSceneContext } from "../../../lib/ai-scene-editor.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth
  const session = await requireAuth(req, res);
  if (!session) return;

  const userId = session.userId;

  // Parse floorplan ID from route
  const { id } = req.query;
  const floorplanId = parseInt(id as string);
  if (isNaN(floorplanId)) {
    return res.status(400).json({ error: "Invalid floorplan ID" });
  }

  // Validate request body
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing prompt" });
  }

  try {
    // Ownership check — floorplan must belong to this user
    const [floorplan] = await db
      .select()
      .from(floorplanDesigns)
      .where(and(eq(floorplanDesigns.id, floorplanId), eq(floorplanDesigns.userId, userId)));

    if (!floorplan) {
      return res.status(404).json({ error: "Floorplan not found" });
    }

    if (!floorplan.sceneData) {
      return res.status(404).json({ error: "Floorplan has no scene data" });
    }

    // Deduct credit upfront to prevent race conditions
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
        message: "No credits remaining. Please purchase more credits to continue generating.",
        redirectTo: "/pricing",
      });
    }

    const sceneData =
      typeof floorplan.sceneData === "string"
        ? JSON.parse(floorplan.sceneData)
        : floorplan.sceneData;

    const context = buildSceneContext(sceneData.nodes ?? {});
    const result = await callGeminiForEdits(prompt, context);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("=== ERROR in ai-edit ===");
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);

    const errorMessage = error?.message || "Unexpected error";

    if (errorMessage.includes("quota") || errorMessage.includes("rate limit") || errorMessage.includes("429")) {
      return res.status(429).json({ error: "AI service rate limit reached. Please try again later." });
    }

    return res.status(500).json({
      error: "AI edit failed",
      details: errorMessage,
    });
  }
}
