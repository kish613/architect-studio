import { GoogleGenAI, Modality } from "@google/genai";
import pLimit from "p-limit";
import pRetry, { AbortError } from "p-retry";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Gemini AI with Replit AI Integrations
const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "",
  },
});

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
  originalImagePath: string,
  stylePrompt?: string
): Promise<IsometricGenerationResult> {
  const limit = pLimit(1);

  return limit(() =>
    pRetry(
      async () => {
        try {
          const imageBuffer = await fs.readFile(originalImagePath);
          const base64Image = imageBuffer.toString("base64");
          const mimeType = originalImagePath.endsWith(".png") ? "image/png" : "image/jpeg";

          const userStyle = stylePrompt || "modern minimalist interior, neutral colors, clean aesthetic";
          
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

          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType, data: base64Image } },
                ],
              },
            ],
            config: {
              responseModalities: [Modality.TEXT, Modality.IMAGE],
            },
          });

          const candidate = response.candidates?.[0];
          const imagePart = candidate?.content?.parts?.find(
            (part: any) => part.inlineData
          );

          if (!imagePart?.inlineData?.data) {
            throw new Error("No image data in response");
          }

          const outputMimeType = imagePart.inlineData.mimeType || "image/png";
          const ext = outputMimeType.includes("png") ? "png" : "jpg";
          const filename = `isometric-${Date.now()}.${ext}`;
          const outputPath = path.join(__dirname, "../uploads", filename);

          const imageData = Buffer.from(imagePart.inlineData.data, "base64");
          await fs.writeFile(outputPath, imageData);

          return {
            success: true,
            imageUrl: `/uploads/${filename}`,
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
