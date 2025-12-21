import type { VercelRequest, VercelResponse } from "@vercel/node";
import pLimit from "p-limit";
import pRetry, { AbortError } from "p-retry";
import { put } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, varchar, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";

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

const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  generationsUsed: integer("generations_used").notNull().default(0),
  generationsLimit: integer("generations_limit").notNull().default(2),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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

// Validate API key early
function getApiKey() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
  }
  return apiKey;
}

function isRateLimitError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

async function generateIsometricFloorplan(
  imageBuffer: Buffer,
  mimeType: string,
  stylePrompt?: string
) {
  const apiKey = getApiKey();
  const limit = pLimit(1);

  return limit(() =>
    pRetry(
      async () => {
        try {
          const base64Image = imageBuffer.toString("base64");

          const userStyle =
            stylePrompt ||
            "modern minimalist interior, neutral colors, clean aesthetic";

          const prompt = `Transform this 2D floorplan into a photorealistic 3D architectural visualization.

CRITICAL - PRESERVE ORIGINAL STRUCTURE (HIGHEST PRIORITY):
- WALLS: Keep ALL walls EXACTLY as shown in the original floorplan. Do NOT add, remove, or move any walls.
- DOORS: Keep ALL doors in their EXACT positions and sizes as shown in the original floorplan. Do NOT relocate doors.
- WINDOWS: Keep ALL windows in their EXACT positions as shown in the original floorplan.
- ROOM LAYOUT: The room layout is FIXED and must match the floorplan precisely.
- Only change the structure if the user explicitly requests it in their style preferences.

CRITICAL: You MUST follow the EXACT layout shown in the reference floorplan image:
- Match the EXACT room positions, shapes, and proportions from the floorplan
- Preserve ALL wall positions, thicknesses, and angles exactly as shown
- Keep room sizes PROPORTIONAL to what is shown in the floorplan
- Identify and render all rooms visible in the floorplan
- Door swings and openings must match the floorplan exactly

Create an isometric cutaway view of this SINGLE FLOOR layout with walls cut at eye level to reveal the interior.

STRUCTURAL ACCURACY (MOST IMPORTANT - DO NOT DEVIATE):
- Follow the exact wall layout from the floorplan image - NO modifications
- Each room must be enclosed with walls matching the floorplan boundaries EXACTLY
- Door positions are FIXED - render doors exactly where they appear in the source
- Window positions are FIXED - render windows exactly where they appear in the source
- Bathrooms must be their own separate enclosed rooms with doors where shown
- Match all room dimensions proportionally to the source floorplan

USER STYLE PREFERENCES (apply to decor/furniture ONLY, NOT structure):
${userStyle}

Style rendering:
- Apply the user's style preferences to all furniture, decor, and finishes
- Natural lighting from windows (place windows where shown in floorplan)
- Furniture SCALED appropriately for each room size
- Unreal Engine 5 quality, professional architectural rendering
- Soft global illumination and realistic shadows

CRITICAL FOR 3D MODEL CONVERSION (follow these EXACTLY):
- SOLID PURE WHITE BACKGROUND (#FFFFFF) - no gradients, no shadows on background
- Single clear architectural subject with sharply defined edges and corners
- ZERO text, watermarks, labels, or annotations anywhere
- HIGH CONTRAST: Dark shadows, bright highlights, clear material boundaries
- CLEAN TEXTURES: Smooth surfaces, no noise, no film grain, no post-processing effects
- SHARP FOCUS: Crystal clear details on all furniture, walls, and architectural elements
- NO atmospheric effects: No fog, haze, dust particles, lens flare, or bloom
- SOLID COLORS: Use distinct solid colors for different surfaces (walls, floors, furniture)
- DEFINED EDGES: Every object should have clear, sharp boundaries
- CONSISTENT LIGHTING: Even, studio-style lighting without harsh shadows on the model
- 4K QUALITY, photorealistic materials, ultra-high resolution textures`;

          // Use Gemini Flash Image REST API (more widely available)
          const modelName = "gemini-2.5-flash-image";
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

          console.log("=== GEMINI API CALL START ===");
          console.log(`Model: ${modelName}`);
          console.log(`Endpoint: ${endpoint}`);
          console.log(`Image size: ${Math.round(base64Image.length / 1024)} KB`);
          console.log(`API Key present: ${apiKey ? 'YES' : 'NO'}`);
          console.log(`API Key length: ${apiKey?.length || 0} chars`);
          console.log(`API Key prefix: ${apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING'}`);
          console.log(`MIME Type: ${mimeType}`);

          const requestBody = {
            contents: [{
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Image
                  }
                }
              ]
            }],
            generationConfig: {
              response_modalities: ["TEXT", "IMAGE"],
              image_config: {
                aspect_ratio: "16:9",
                image_size: "2K"
              }
            }
          };

          console.log("Request config:", JSON.stringify({
            aspectRatio: requestBody.generationConfig.image_config.aspect_ratio,
            imageSize: requestBody.generationConfig.image_config.image_size,
            responseModalities: requestBody.generationConfig.response_modalities,
            promptLength: prompt.length
          }, null, 2));

          // Log the FULL request structure (without base64 data)
          console.log("FULL REQUEST STRUCTURE:", JSON.stringify({
            contents: [{
              parts: [
                { text: `[PROMPT: ${prompt.substring(0, 100)}...]` },
                {
                  inline_data: {
                    mime_type: requestBody.contents[0].parts[1].inline_data.mime_type,
                    data: `[BASE64 DATA: ${requestBody.contents[0].parts[1].inline_data.data.length} chars]`
                  }
                }
              ]
            }],
            generationConfig: requestBody.generationConfig
          }, null, 2));

          const startTime = Date.now();
          let response;
          try {
            console.log(`Sending POST request to Gemini API...`);
            const fetchResponse = await fetch(endpoint, {
              method: "POST",
              headers: {
                "x-goog-api-key": apiKey,
                "Content-Type": "application/json"
              },
              body: JSON.stringify(requestBody)
            });

            const requestDuration = Date.now() - startTime;
            console.log(`Request completed in ${requestDuration}ms`);
            console.log(`HTTP Status: ${fetchResponse.status} ${fetchResponse.statusText}`);
            console.log(`Response Headers:`, JSON.stringify({
              contentType: fetchResponse.headers.get('content-type'),
              contentLength: fetchResponse.headers.get('content-length'),
              date: fetchResponse.headers.get('date'),
            }, null, 2));

            if (!fetchResponse.ok) {
              const errorText = await fetchResponse.text();
              console.error("=== API ERROR RESPONSE ===");
              console.error("Status:", fetchResponse.status);
              console.error("Status Text:", fetchResponse.statusText);
              console.error("Error Body:", errorText);

              let parsedError;
              try {
                parsedError = JSON.parse(errorText);
                console.error("Parsed Error:", JSON.stringify(parsedError, null, 2));
              } catch {
                console.error("Could not parse error as JSON");
              }

              throw new Error(`API request failed with status ${fetchResponse.status}: ${errorText}`);
            }

            response = await fetchResponse.json();
            console.log("=== GEMINI API RESPONSE RECEIVED ===");
            console.log("Raw response size:", JSON.stringify(response).length, "bytes");
          } catch (apiError: any) {
            console.error("=== GEMINI API CALL FAILED ===");
            console.error("Error type:", apiError?.constructor?.name);
            console.error("Error message:", apiError?.message);
            console.error("Full error:", JSON.stringify({
              message: apiError?.message,
              status: apiError?.status,
              statusText: apiError?.statusText,
              name: apiError?.name,
              code: apiError?.code,
              cause: apiError?.cause,
              stack: apiError?.stack?.split('\n').slice(0, 3).join('\n')
            }, null, 2));
            throw new Error(`Gemini API error: ${apiError?.message || 'Unknown error'}`);
          }

          // Validate response structure
          console.log("=== VALIDATING RESPONSE STRUCTURE ===");
          if (!response) {
            console.error("ERROR: Response object is null/undefined");
            throw new Error("No response received from Gemini API");
          }

          console.log("Response keys:", Object.keys(response));
          console.log("Response structure:", JSON.stringify({
            hasCandidates: !!response.candidates,
            candidatesLength: response.candidates?.length,
            candidatesIsArray: Array.isArray(response.candidates),
            firstCandidateHasContent: !!response.candidates?.[0]?.content,
            firstCandidateHasParts: !!response.candidates?.[0]?.content?.parts,
            partsLength: response.candidates?.[0]?.content?.parts?.length,
            partsIsArray: Array.isArray(response.candidates?.[0]?.content?.parts),
          }, null, 2));

          // Log full response structure (first 1000 chars)
          const responsePreview = JSON.stringify(response).substring(0, 1000);
          console.log("Response preview (first 1000 chars):", responsePreview);

          const candidate = response.candidates?.[0];
          if (!candidate) {
            console.error("ERROR: No candidates array or empty candidates");
            console.error("Full response:", JSON.stringify(response, null, 2));
            throw new Error("No candidates in API response");
          }

          console.log("Candidate structure:", JSON.stringify({
            hasContent: !!candidate.content,
            hasParts: !!candidate.content?.parts,
            partsCount: candidate.content?.parts?.length,
            finishReason: candidate.finishReason,
            safetyRatings: candidate.safetyRatings?.length || 0
          }, null, 2));

          const parts = candidate?.content?.parts;
          if (!parts || !Array.isArray(parts)) {
            console.error("ERROR: Parts is not an array or is missing");
            console.error("Candidate content:", JSON.stringify(candidate.content, null, 2));
            throw new Error("Invalid response structure - no parts array");
          }

          console.log(`Found ${parts.length} parts in response`);
          parts.forEach((part: any, idx: number) => {
            console.log(`Part ${idx}:`, JSON.stringify({
              hasText: !!part.text,
              textLength: part.text?.length || 0,
              hasInlineData: !!part.inline_data,
              hasMimeType: !!part.inline_data?.mime_type,
              mimeType: part.inline_data?.mime_type,
              hasData: !!part.inline_data?.data,
              dataLength: part.inline_data?.data?.length || 0
            }, null, 2));
          });

          const imagePart = parts.find((part: any) => part.inline_data);

          if (!imagePart?.inline_data?.data) {
            console.error("=== NO IMAGE DATA FOUND ===");
            console.error("Total parts:", parts.length);
            console.error("Parts breakdown:", parts.map((p: any, idx: number) => ({
              index: idx,
              hasText: !!p.text,
              textPreview: p.text?.substring(0, 100),
              hasInlineData: !!p.inline_data,
              inlineDataKeys: p.inline_data ? Object.keys(p.inline_data) : []
            })));
            console.error("Full candidate:", JSON.stringify(candidate, null, 2));
            throw new Error("No image data in API response - model may not support image generation");
          }

          console.log("=== IMAGE DATA FOUND ===");
          console.log("MIME Type:", imagePart.inline_data.mime_type);
          console.log("Data length:", imagePart.inline_data.data.length, "chars");
          console.log("Estimated image size:", Math.round(imagePart.inline_data.data.length * 0.75 / 1024), "KB");

          const outputMimeType = imagePart.inline_data.mime_type || "image/png";
          const ext = outputMimeType.includes("png") ? "png" : "jpg";
          const filename = `isometric-${Date.now()}.${ext}`;

          console.log("=== PROCESSING IMAGE DATA ===");
          console.log("Output MIME:", outputMimeType);
          console.log("File extension:", ext);
          console.log("Filename:", filename);

          const imageData = Buffer.from(imagePart.inline_data.data, "base64");
          console.log("Buffer created, size:", imageData.length, "bytes");

          // Upload to Vercel Blob
          console.log("Uploading to Vercel Blob...");
          const uploadStart = Date.now();
          const blob = await put(filename, imageData, {
            access: "public",
            contentType: outputMimeType,
          });
          console.log("Upload completed in", Date.now() - uploadStart, "ms");
          console.log("Blob URL:", blob.url);
          console.log("=== GEMINI API CALL SUCCESS ===");

          return {
            success: true,
            imageUrl: blob.url,
          };
        } catch (error: any) {
          if (isRateLimitError(error)) {
            throw error;
          }
          throw new AbortError(error.message || "Generation failed");
        }
      },
      {
        retries: 3,
        minTimeout: 2000,
        maxTimeout: 30000,
        factor: 2,
      }
    )
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("=== Generate Isometric Request Start ===");
  console.log("Method:", req.method);
  console.log("Query params:", req.query);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check authentication
  const cookieHeader = req.headers.cookie || null;
  const token = getSessionFromCookies(cookieHeader);

  if (!token) {
    console.log("ERROR: No authentication token");
    return res.status(401).json({ error: "Not authenticated" });
  }

  const session = await verifySession(token);
  if (!session) {
    console.log("ERROR: Invalid session token");
    return res.status(401).json({ error: "Not authenticated" });
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!user) {
    console.log("ERROR: User not found");
    return res.status(401).json({ error: "Not authenticated" });
  }

  const userId = user.id;
  const { id } = req.query;
  const modelId = parseInt(id as string);

  console.log("User ID:", userId);
  console.log("Model ID:", modelId);

  if (isNaN(modelId)) {
    return res.status(400).json({ error: "Invalid model ID" });
  }

  try {
    // Verify API key is set
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    console.log("API Key exists:", !!apiKey);
    console.log("API Key prefix:", apiKey ? apiKey.substring(0, 10) + "..." : "missing");

    if (!apiKey) {
      console.error("ERROR: GOOGLE_GEMINI_API_KEY environment variable is not set");
      return res.status(500).json({
        error: "AI service not configured",
        details: "Please set GOOGLE_GEMINI_API_KEY in Vercel environment variables"
      });
    }
    // Check usage limits
    let [subscription] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
    if (!subscription) {
      [subscription] = await db.insert(userSubscriptions).values({
        userId,
        plan: "free",
        generationsLimit: 2,
      }).returning();
    }

    if (subscription.generationsUsed >= subscription.generationsLimit) {
      return res.status(403).json({
        error: "Generation limit reached",
        message: "Please upgrade your plan or purchase additional generations",
        redirectTo: "/pricing",
      });
    }

    const [model] = await db.select().from(floorplanModels).where(eq(floorplanModels.id, modelId));
    if (!model) {
      console.error("Model not found for ID:", modelId);
      return res.status(404).json({ error: "Model not found" });
    }

    console.log("Model found:", {
      id: model.id,
      status: model.status,
      hasOriginalUrl: !!model.originalUrl,
      hasIsometricUrl: !!model.isometricUrl,
      projectId: model.projectId
    });

    // Verify model ownership through project
    const [project] = await db.select().from(projects).where(eq(projects.id, model.projectId));

    console.log("Ownership verification:", JSON.stringify({
      projectExists: !!project,
      projectId: model.projectId,
      projectUserId: project?.userId,
      projectUserIdType: typeof project?.userId,
      currentUserId: userId,
      currentUserIdType: typeof userId,
      idsMatch: project?.userId === userId,
      strictEquality: project?.userId === userId,
      looseEquality: project?.userId == userId
    }, null, 2));

    if (!project) {
      console.error("Access denied - project not found");
      return res.status(403).json({ error: "Access denied - project not found" });
    }

    if (project.userId !== userId) {
      console.error("Access denied - user ID mismatch:", {
        expected: userId,
        actual: project.userId
      });
      return res.status(403).json({ error: "Access denied - not your project" });
    }

    const { prompt } = req.body || {};
    console.log("Custom prompt provided:", !!prompt);
    console.log("Prompt length:", prompt?.length || 0);

    // Update status to generating
    console.log("Updating model status to generating_isometric...");
    await db.update(floorplanModels).set({
      status: "generating_isometric",
      isometricPrompt: prompt || null,
    }).where(eq(floorplanModels.id, modelId));

    // Fetch the original image from the URL
    console.log("Fetching original image from:", model.originalUrl);
    const imageResponse = await fetch(model.originalUrl);
    console.log("Image fetch status:", imageResponse.status);
    console.log("Image content-type:", imageResponse.headers.get("content-type"));
    console.log("Image content-length:", imageResponse.headers.get("content-length"));

    if (!imageResponse.ok) {
      console.error("Failed to fetch image, status:", imageResponse.status);
      throw new Error("Failed to fetch original image");
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const mimeType = imageResponse.headers.get("content-type") || "image/png";
    console.log("Image buffer size:", imageBuffer.length, "bytes");
    console.log("Detected MIME type:", mimeType);

    // Generate isometric view
    console.log("Calling generateIsometricFloorplan...");
    const generationStart = Date.now();
    const result = await generateIsometricFloorplan(imageBuffer, mimeType, prompt);
    const generationDuration = Date.now() - generationStart;
    console.log("Generation completed in", generationDuration, "ms");

    if (result.success && result.imageUrl) {
      console.log("Generation successful!");
      console.log("Result image URL:", result.imageUrl);

      // Increment usage count on successful generation
      console.log("Incrementing usage count from", subscription.generationsUsed, "to", subscription.generationsUsed + 1);
      await db.update(userSubscriptions).set({
        generationsUsed: subscription.generationsUsed + 1,
        updatedAt: new Date(),
      }).where(eq(userSubscriptions.userId, userId));

      console.log("Updating model status to isometric_ready...");
      const [updatedModel] = await db.update(floorplanModels).set({
        status: "isometric_ready",
        isometricUrl: result.imageUrl,
      }).where(eq(floorplanModels.id, modelId)).returning();

      console.log("=== Generation Complete - SUCCESS ===");
      res.json(updatedModel);
    } else {
      console.error("Generation failed - result:", result);
      await db.update(floorplanModels).set({ status: "failed" }).where(eq(floorplanModels.id, modelId));
      res.status(500).json({
        error: "Failed to generate isometric view",
      });
    }
  } catch (error: any) {
    console.error("=== ERROR GENERATING ISOMETRIC ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error?.message);
    console.error("Error name:", error?.name);
    console.error("Error code:", error?.code);
    console.error("Error cause:", error?.cause);
    console.error("Full error object:", JSON.stringify({
      message: error?.message,
      name: error?.name,
      code: error?.code,
      cause: error?.cause,
      status: error?.status
    }, null, 2));
    console.error("Error stack:", error?.stack);

    const errorMessage = error?.message || "Failed to generate isometric view";

    // Update model status to failed
    try {
      console.log("Updating model status to failed...");
      await db.update(floorplanModels).set({ status: "failed" }).where(eq(floorplanModels.id, modelId));
    } catch (updateError) {
      console.error("Failed to update model status:", updateError);
    }

    // Check for specific error types
    if (errorMessage.includes("GOOGLE_GEMINI_API_KEY")) {
      return res.status(500).json({ error: "AI service is not configured properly" });
    }
    if (errorMessage.includes("quota") || errorMessage.includes("rate limit") || errorMessage.includes("429")) {
      return res.status(429).json({ error: "AI service rate limit reached. Please try again later." });
    }
    if (errorMessage.includes("Generation limit reached")) {
      return res.status(403).json({ error: errorMessage });
    }
    if (errorMessage.includes("Gemini API error")) {
      return res.status(500).json({
        error: "AI generation failed. Please try again or contact support if the issue persists.",
        details: errorMessage
      });
    }
    if (errorMessage.includes("No image data in API response")) {
      return res.status(500).json({
        error: "The AI model failed to generate an image. This might be a temporary issue - please try again.",
        details: errorMessage
      });
    }

    res.status(500).json({
      error: "An unexpected error occurred during generation",
      details: errorMessage
    });
  }
}
