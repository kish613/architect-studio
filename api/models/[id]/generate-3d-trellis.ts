import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";
import { Client, handle_file } from "@gradio/client";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";

// Allow up to 5 minutes for TRELLIS generation
export const maxDuration = 300;

const TRELLIS_SPACE = process.env.TRELLIS_SPACE || "trellis-community/TRELLIS";

// Inline schema
const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  lastModified: timestamp("last_modified").notNull().defaultNow(),
});

const floorplanModels = pgTable("floorplan_models", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  originalUrl: text("original_url").notNull(),
  isometricUrl: text("isometric_url"),
  isometricPrompt: text("isometric_prompt"),
  model3dUrl: text("model_3d_url"),
  baseModel3dUrl: text("base_model_3d_url"),
  meshyTaskId: text("meshy_task_id"),
  texturePrompt: text("texture_prompt"),
  retextureTaskId: text("retexture_task_id"),
  retextureUsed: boolean("retexture_used").notNull().default(false),
  status: text("status").notNull().default("uploaded"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Inline db connection
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql);
}

// Inline auth helpers
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

// TRELLIS 3D generation via Gradio Space
async function generateWithTrellis(imageUrl: string) {
  const hfToken = process.env.HF_TOKEN;

  // Download the image first so we can upload it directly to the Gradio Space.
  // Passing a URL via handle_file relies on the Space server fetching the image,
  // which fails for external URLs (e.g. Vercel Blob) with a "file not found" error.
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch isometric image for TRELLIS: ${imageResponse.status}`);
  }
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  const client = await Client.connect(TRELLIS_SPACE, {
    hf_token: hfToken as `hf_${string}` | undefined,
  });

  const result = await client.predict("/generate_and_extract_glb", [
    handle_file(imageBuffer), // image — uploaded as blob to the Space
    null,                      // multiimages
    false,                     // is_multiimage
    0,                         // seed
    7.5,                       // ss_guidance_strength
    12,                        // ss_sampling_steps
    3.0,                       // slat_guidance_strength
    12,                        // slat_sampling_steps
    "stochastic",              // multiimage_algo
    0.95,                      // mesh_simplify
    1024,                      // texture_size
  ]);

  // Result: [state_dict, video_url, glb_display, glb_download]
  const data = result.data as any[];
  const glbOutput = data[3];

  let glbUrl: string | undefined;
  if (glbOutput && typeof glbOutput === "object" && glbOutput.url) {
    glbUrl = glbOutput.url;
  } else if (typeof glbOutput === "string") {
    glbUrl = glbOutput;
  }

  if (!glbUrl) {
    throw new Error("TRELLIS did not return a GLB file");
  }

  return glbUrl;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check authentication
  const cookieHeader = req.headers.cookie || null;
  const token = getSessionFromCookies(cookieHeader);

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const session = await verifySession(token);
  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const userId = user.id;
  const { id } = req.query;
  const modelId = parseInt(id as string);

  if (isNaN(modelId)) {
    return res.status(400).json({ error: "Invalid model ID" });
  }

  try {
    const [model] = await db.select().from(floorplanModels).where(eq(floorplanModels.id, modelId));
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    // Verify model ownership through project
    const [project] = await db.select().from(projects).where(eq(projects.id, model.projectId));
    if (!project || project.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!model.isometricUrl) {
      return res.status(400).json({ error: "Isometric image not yet generated" });
    }

    // Update status to generating
    await db.update(floorplanModels).set({ status: "generating_3d" }).where(eq(floorplanModels.id, modelId));

    // Generate 3D model with TRELLIS (synchronous - blocks until complete)
    const tempGlbUrl = await generateWithTrellis(model.isometricUrl);

    // Download GLB from the Space's temporary URL
    const glbResponse = await fetch(tempGlbUrl);
    if (!glbResponse.ok) {
      throw new Error(`Failed to download GLB: ${glbResponse.status}`);
    }
    const glbBuffer = await glbResponse.arrayBuffer();

    // Upload to Vercel Blob for permanent storage
    const blob = await put(
      `models/${modelId}/trellis-model.glb`,
      Buffer.from(glbBuffer),
      { access: "public", contentType: "model/gltf-binary" }
    );

    // Update model with the permanent Blob URL
    const [updatedModel] = await db.update(floorplanModels).set({
      model3dUrl: blob.url,
      status: "completed",
    }).where(eq(floorplanModels.id, modelId)).returning();

    res.json(updatedModel);
  } catch (error: any) {
    console.error("TRELLIS 3D generation error:", error);
    await db.update(floorplanModels).set({ status: "failed" }).where(eq(floorplanModels.id, modelId));
    res.status(500).json({
      error: error.message || "Failed to generate 3D model with TRELLIS",
    });
  }
}
