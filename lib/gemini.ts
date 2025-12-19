import pLimit from "p-limit";
import pRetry, { AbortError } from "p-retry";
import { put } from "@vercel/blob";

// Get API key
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

export interface IsometricGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export async function generateIsometricFloorplan(
  imageBuffer: Buffer,
  mimeType: string,
  stylePrompt?: string
): Promise<IsometricGenerationResult> {
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

          console.log(`Calling Gemini 3 Pro Image API with model: ${modelName}`);
          console.log("Image size:", Math.round(base64Image.length / 1024), "KB");

          const requestBody = {
            contents: [{
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Image
                  }
                }
              ]
            }],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
              imageConfig: {
                aspectRatio: "16:9",
                imageSize: "2K"
              }
            }
          };

          const fetchResponse = await fetch(endpoint, {
            method: "POST",
            headers: {
              "x-goog-api-key": apiKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
          });

          if (!fetchResponse.ok) {
            const errorText = await fetchResponse.text();
            console.error("API error response:", errorText);
            throw new Error(`API request failed with status ${fetchResponse.status}: ${errorText}`);
          }

          const response = await fetchResponse.json();
          console.log("Gemini API response received");

          const candidate = response.candidates?.[0];
          if (!candidate) {
            throw new Error("No candidates in API response");
          }

          const imagePart = candidate?.content?.parts?.find(
            (part: any) => part.inlineData
          );

          if (!imagePart?.inlineData?.data) {
            throw new Error("No image data in response");
          }

          const outputMimeType = imagePart.inlineData.mimeType || "image/png";
          const ext = outputMimeType.includes("png") ? "png" : "jpg";
          const filename = `isometric-${Date.now()}.${ext}`;

          const imageData = Buffer.from(imagePart.inlineData.data, "base64");

          // Upload to Vercel Blob
          const blob = await put(filename, imageData, {
            access: "public",
            contentType: outputMimeType,
          });

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



