import pLimit from "p-limit";
import pRetry, { AbortError } from "p-retry";
import { put } from "@vercel/blob";
import { isValidGlbUrl } from "../shared/model-pipeline.js";

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
  diagnostics?: GeminiImageDiagnostics;
}

export interface GeminiImageDiagnostics {
  candidateCount: number;
  partCount: number;
  textPartCount: number;
  imagePartCount: number;
  hasImagePart: boolean;
  finishReason?: string;
  responseShape: string;
}

export interface GeminiImageParseSuccess {
  success: true;
  imagePart: {
    inline_data: {
      mime_type?: string;
      data: string;
    };
  };
  diagnostics: GeminiImageDiagnostics;
}

export interface GeminiImageParseFailure {
  success: false;
  error: string;
  retryable: boolean;
  diagnostics: GeminiImageDiagnostics;
}

export type GeminiImageParseResult = GeminiImageParseSuccess | GeminiImageParseFailure;

interface GeminiResponsePart {
  text?: string;
  inline_data?: {
    mime_type?: string;
    data?: string;
  };
}

export function parseGeminiImageResponse(response: unknown): GeminiImageParseResult {
  const candidates = (response && typeof response === "object" ? (response as any).candidates : null) as any[] | null;
  const candidate = candidates?.[0];
  const parts = Array.isArray(candidate?.content?.parts)
    ? (candidate.content.parts as GeminiResponsePart[])
    : null;

  const diagnostics: GeminiImageDiagnostics = {
    candidateCount: candidates?.length ?? 0,
    partCount: parts?.length ?? 0,
    textPartCount: 0,
    imagePartCount: 0,
    hasImagePart: false,
    finishReason: candidate?.finishReason,
    responseShape: Array.isArray(response)
      ? "array"
      : response && typeof response === "object"
        ? "object"
        : typeof response,
  };

  if (!candidates || candidates.length === 0) {
    return {
      success: false,
      error: "Gemini response had no candidates",
      retryable: false,
      diagnostics,
    };
  }

  if (!parts) {
    return {
      success: false,
      error: "Gemini response had no parts array",
      retryable: false,
      diagnostics,
    };
  }

  const imagePart = parts.find(
    (part: GeminiResponsePart) =>
      part?.inline_data?.data && typeof part.inline_data.data === "string"
  );
  const textParts = parts.filter((part: GeminiResponsePart) => typeof part?.text === "string");
  diagnostics.textPartCount = textParts.length;
  diagnostics.imagePartCount = imagePart ? 1 : 0;
  diagnostics.hasImagePart = Boolean(imagePart);

  if (imagePart?.inline_data?.data) {
    return {
      success: true,
      imagePart: {
        inline_data: {
          mime_type: imagePart.inline_data.mime_type,
          data: imagePart.inline_data.data,
        },
      },
      diagnostics,
    };
  }

  return {
    success: false,
    error: "NO_IMAGE_DATA: Model returned text-only response",
    retryable: true,
    diagnostics,
  };
}

export async function generateIsometricFloorplan(
  imageBuffer: Buffer,
  mimeType: string,
  stylePrompt?: string
): Promise<IsometricGenerationResult> {
  const apiKey = getApiKey();
  const limit = pLimit(1);

  try {
    return await limit(() =>
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
          const modelName = "gemini-3.1-flash-image-preview";
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
              responseModalities: ["TEXT", "IMAGE"],
              imageConfig: {
                aspectRatio: "16:9",
                imageSize: "2K"
              }
            }
          };

          console.log("Request config:", JSON.stringify({
            aspectRatio: requestBody.generationConfig.imageConfig.aspectRatio,
            imageSize: requestBody.generationConfig.imageConfig.imageSize,
            responseModalities: requestBody.generationConfig.responseModalities,
            promptLength: prompt.length
          }, null, 2));

          const startTime = Date.now();
          console.log(`Sending POST request to Gemini API...`);

          const fetchResponse = await fetch(endpoint, {
            method: "POST",
            headers: {
              "x-goog-api-key": apiKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(50000), // 50s timeout per request
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

          const response = await fetchResponse.json();
          console.log("=== GEMINI API RESPONSE RECEIVED ===");
          console.log("Raw response size:", JSON.stringify(response).length, "bytes");

          const parsed = parseGeminiImageResponse(response);
          if (!parsed.success) {
            const error = new Error(parsed.error);
            (error as Error & { diagnostics?: GeminiImageDiagnostics }).diagnostics = parsed.diagnostics;
            if (parsed.retryable) {
              throw error;
            }
            throw new AbortError(parsed.error);
          }

          const imagePart = parsed.imagePart;

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
            diagnostics: parsed.diagnostics,
          };
        } catch (error: any) {
          console.error("=== GEMINI GENERATION ERROR ===");
          console.error("Error type:", error?.constructor?.name);
          console.error("Error message:", error?.message);
          console.error("Full error:", JSON.stringify({
            message: error?.message,
            name: error?.name,
            code: error?.code,
            cause: error?.cause,
            status: error?.status
          }, null, 2));

          // Retry on rate limits and "no image data" responses (known Gemini issue)
          if (isRateLimitError(error) || error?.message?.includes("NO_IMAGE_DATA")) {
            console.log("Retryable error detected:", error?.message);
            throw error; // p-retry will retry this
          }
          console.error("Non-retryable error, aborting...");
          throw new AbortError(error.message || "Generation failed");
        }
      },
      {
        retries: 2,
        minTimeout: 2000,
        maxTimeout: 5000,
        factor: 2,
        onFailedAttempt: (error: any) => {
          console.log(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
          console.log(`Error: ${error.message}`);
        },
      }
      )
    );
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Generation failed",
      diagnostics: error?.diagnostics,
    };
  }
}
