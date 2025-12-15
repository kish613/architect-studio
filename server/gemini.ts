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

          const basePrompt = `Transform this 2D floorplan into a 3D interior cutaway isometric visualization.

CRITICAL REQUIREMENTS:
- View angle: Top-down isometric view (35-45 degrees from above), looking directly into the interior
- NO roof - the ceiling is removed to show the interior layout
- NO exterior facades, outdoor scenery, landscaping, or sky
- Show the interior rooms, walls with realistic thickness, doors, and windows
- Include furniture and fixtures appropriate for each room type
- Walls should be visible from above like an architectural section/cutaway
- Style: Clean exploded axonometric floorplan render, like professional interior design presentations

Visual style:
- Soft ambient lighting from above
- Neutral color palette with warm wood floors
- White or light-colored walls
- Modern, clean aesthetic
- Professional architectural rendering quality`;

          const prompt = stylePrompt 
            ? `${basePrompt}\n\nAdditional style preferences: ${stylePrompt}`
            : basePrompt;

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
