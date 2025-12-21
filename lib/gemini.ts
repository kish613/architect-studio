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

          const startTime = Date.now();
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

          const response = await fetchResponse.json();
          console.log("=== GEMINI API RESPONSE RECEIVED ===");
          console.log("Raw response size:", JSON.stringify(response).length, "bytes");

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

          if (isRateLimitError(error)) {
            console.error("Rate limit error detected, will retry...");
            throw error;
          }
          console.error("Non-retryable error, aborting...");
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



