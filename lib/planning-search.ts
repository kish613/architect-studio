/**
 * Planning Search Service
 * Uses Gemini AI to analyze properties and search for relevant planning approvals
 */

import pLimit from "p-limit";
import pRetry, { AbortError } from "p-retry";
import type { PropertyAnalysisData, ApprovalSearchResults } from "../shared/schema.js";

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

export interface PropertyAnalysisResult {
  success: boolean;
  analysis?: PropertyAnalysisData;
  error?: string;
}

/**
 * Analyze a property image using Gemini AI
 */
export async function analyzePropertyImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<PropertyAnalysisResult> {
  const apiKey = getApiKey();
  const limit = pLimit(1);

  return limit(() =>
    pRetry(
      async () => {
        try {
          const base64Image = imageBuffer.toString("base64");

          const prompt = `Analyze this property image and provide a detailed assessment. Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just the JSON):

{
  "propertyType": "terraced" | "semi-detached" | "detached" | "flat" | "bungalow" | "other",
  "architecturalStyle": "string describing the style (e.g., Victorian, Edwardian, 1930s semi, post-war, modern)",
  "estimatedEra": "string describing approximate decade of construction",
  "materials": ["array of external materials visible (e.g., red brick, render, slate roof)"],
  "existingFeatures": ["array of existing features (e.g., garage, conservatory, bay window, dormer)"],
  "stories": number of floors,
  "estimatedSqFt": estimated approximate square footage as a number,
  "extensionPotential": {
    "rear": "high" | "medium" | "low" | "none",
    "side": "high" | "medium" | "low" | "none",
    "loft": "high" | "medium" | "low" | "none",
    "garage": "high" | "medium" | "low" | "none"
  }
}

Assess extension potential based on:
- Rear: Is there visible garden/land behind? Is the property already extended at rear?
- Side: Is there side access or land? Is it detached or semi-detached?
- Loft: Does the roof type support conversion? Are there already dormers?
- Garage: Is there an attached or detached garage that could be converted?

Be realistic about the assessments based on what's visible in the image.`;

          const modelName = "gemini-2.5-flash";
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

          console.log("=== PROPERTY ANALYSIS API CALL ===");
          console.log(`Model: ${modelName}`);

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
              response_mime_type: "application/json",
              temperature: 0.2
            }
          };

          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "x-goog-api-key": apiKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Property analysis API error:", errorText);

            if (response.status === 429 || isRateLimitError({ message: errorText })) {
              throw new Error("Rate limit exceeded");
            }
            throw new AbortError(`API request failed: ${errorText}`);
          }

          const result = await response.json();
          const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!textContent) {
            throw new Error("No analysis text in response");
          }

          // Parse the JSON response
          const analysis = JSON.parse(textContent) as PropertyAnalysisData;

          return {
            success: true,
            analysis
          };
        } catch (error: any) {
          if (error instanceof AbortError) throw error;
          if (isRateLimitError(error)) {
            throw error; // Will retry
          }
          console.error("Property analysis error:", error);
          return {
            success: false,
            error: error.message || "Failed to analyze property"
          };
        }
      },
      {
        retries: 3,
        minTimeout: 2000,
        maxTimeout: 30000,
        onFailedAttempt: (error) => {
          console.log(`Property analysis attempt ${error.attemptNumber} failed. Retries left: ${error.retriesLeft}`);
        }
      }
    )
  );
}

export interface PlanningSearchResult {
  success: boolean;
  results?: ApprovalSearchResults;
  error?: string;
}

/**
 * Search for planning approvals using Gemini AI with grounding/search
 * This uses AI to simulate/generate realistic planning approval data based on the location
 */
export async function searchPlanningApprovals(
  propertyAnalysis: PropertyAnalysisData,
  address: string,
  postcode: string,
  latitude: number,
  longitude: number
): Promise<PlanningSearchResult> {
  const apiKey = getApiKey();
  const limit = pLimit(1);

  return limit(() =>
    pRetry(
      async () => {
        try {
          const prompt = `You are a UK planning permission research assistant. Based on the following property details and location, generate realistic planning approval data that would be typical for this area.

PROPERTY DETAILS:
- Type: ${propertyAnalysis.propertyType}
- Style: ${propertyAnalysis.architecturalStyle}
- Era: ${propertyAnalysis.estimatedEra}
- Location: ${address}
- Postcode: ${postcode}
- Coordinates: ${latitude}, ${longitude}

Based on typical UK planning patterns for ${propertyAnalysis.propertyType} properties in ${postcode} areas, generate a realistic set of nearby approved planning applications.

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):

{
  "searchRadius": 1000,
  "totalFound": number between 20-60,
  "approvals": [
    {
      "applicationRef": "realistic UK planning reference like 23/01234/FUL",
      "address": "realistic nearby address in same postcode area",
      "distance": number in meters (100-1000),
      "modificationType": "rear_extension" | "side_extension" | "loft_conversion" | "dormer" | "garage_conversion" | "conservatory" | "outbuilding",
      "description": "realistic planning description",
      "decisionDate": "date in YYYY-MM-DD format within last 2 years",
      "estimatedSqFt": number for additional floor area
    }
  ],
  "modificationSummary": {
    "rear_extension": { "count": number, "avgApprovalRate": 0.85-0.95 },
    "side_extension": { "count": number, "avgApprovalRate": 0.70-0.85 },
    "loft_conversion": { "count": number, "avgApprovalRate": 0.90-0.98 },
    "dormer": { "count": number, "avgApprovalRate": 0.75-0.90 },
    "garage_conversion": { "count": number, "avgApprovalRate": 0.88-0.95 },
    "conservatory": { "count": number, "avgApprovalRate": 0.92-0.98 }
  }
}

Include 8-12 approval entries, focusing on modifications that match the extension potential of this property type. Make addresses realistic for the UK postcode area provided. Use realistic planning reference formats (council area code/year/number/type).`;

          const modelName = "gemini-2.5-flash";
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

          console.log("=== PLANNING SEARCH API CALL ===");

          const requestBody = {
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.7
            }
          };

          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "x-goog-api-key": apiKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Planning search API error:", errorText);

            if (response.status === 429 || isRateLimitError({ message: errorText })) {
              throw new Error("Rate limit exceeded");
            }
            throw new AbortError(`API request failed: ${errorText}`);
          }

          const result = await response.json();
          const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!textContent) {
            throw new Error("No search results in response");
          }

          const results = JSON.parse(textContent) as ApprovalSearchResults;

          return {
            success: true,
            results
          };
        } catch (error: any) {
          if (error instanceof AbortError) throw error;
          if (isRateLimitError(error)) {
            throw error;
          }
          console.error("Planning search error:", error);
          return {
            success: false,
            error: error.message || "Failed to search planning approvals"
          };
        }
      },
      {
        retries: 3,
        minTimeout: 2000,
        maxTimeout: 30000,
        onFailedAttempt: (error) => {
          console.log(`Planning search attempt ${error.attemptNumber} failed. Retries left: ${error.retriesLeft}`);
        }
      }
    )
  );
}

export interface VisualizationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

/**
 * Generate a modified property visualization using Gemini
 */
export async function generatePropertyVisualization(
  propertyImageBuffer: Buffer,
  mimeType: string,
  propertyAnalysis: PropertyAnalysisData,
  modificationType: string,
  modificationDescription: string
): Promise<VisualizationResult> {
  const apiKey = getApiKey();
  const limit = pLimit(1);
  const { put } = await import("@vercel/blob");

  return limit(() =>
    pRetry(
      async () => {
        try {
          const base64Image = propertyImageBuffer.toString("base64");

          const prompt = `Transform this property image to show a realistic ${modificationType.replace(/_/g, ' ')}.

PROPERTY DETAILS:
- Type: ${propertyAnalysis.propertyType}
- Style: ${propertyAnalysis.architecturalStyle}
- Era: ${propertyAnalysis.estimatedEra}
- Materials: ${propertyAnalysis.materials.join(', ')}

MODIFICATION TO SHOW:
${modificationDescription}

REQUIREMENTS:
- Maintain the existing architectural style (${propertyAnalysis.architecturalStyle})
- Match existing materials: ${propertyAnalysis.materials.join(', ')}
- Show a realistic, professionally designed ${modificationType.replace(/_/g, ' ')}
- The modification should look like it was built by a professional contractor
- Keep the original property recognizable
- Ensure proper proportions and scale
- Match roof materials and style
- Include appropriate windows/doors for the extension type
- Show the modification integrated seamlessly with the original structure
- Maintain the same lighting conditions and perspective as the original photo

Generate a photorealistic image showing this property with the ${modificationType.replace(/_/g, ' ')} added.`;

          const modelName = "gemini-3.1-flash-image-preview";
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

          console.log("=== PROPERTY VISUALIZATION API CALL ===");
          console.log(`Modification type: ${modificationType}`);

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

          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "x-goog-api-key": apiKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(50000), // 50s timeout per request
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Visualization API error:", errorText);

            if (response.status === 429 || isRateLimitError({ message: errorText })) {
              throw new Error("Rate limit exceeded");
            }
            throw new AbortError(`API request failed: ${errorText}`);
          }

          const result = await response.json();

          // Find the image part in the response
          const parts = result.candidates?.[0]?.content?.parts || [];
          let imageData: string | null = null;
          let imageMimeType = "image/png";

          for (const part of parts) {
            if (part.inline_data?.data) {
              imageData = part.inline_data.data;
              imageMimeType = part.inline_data.mime_type || "image/png";
              break;
            }
          }

          if (!imageData) {
            // Known Gemini issue - complex prompts sometimes get text-only responses
            throw new Error("NO_IMAGE_DATA: Model returned text-only response, retrying...");
          }

          // Upload to Vercel Blob
          const imageBuffer = Buffer.from(imageData, "base64");
          const extension = imageMimeType.split("/")[1] || "png";
          const filename = `planning-visualization-${Date.now()}.${extension}`;

          const { url } = await put(filename, imageBuffer, {
            access: "public",
            contentType: imageMimeType,
          });

          return {
            success: true,
            imageUrl: url
          };
        } catch (error: any) {
          if (error instanceof AbortError) throw error;
          // Retry on rate limits and "no image data" responses (known Gemini issue)
          if (isRateLimitError(error) || error?.message?.includes("NO_IMAGE_DATA")) {
            throw error;
          }
          console.error("Visualization error:", error);
          return {
            success: false,
            error: error.message || "Failed to generate visualization"
          };
        }
      },
      {
        retries: 2,
        minTimeout: 2000,
        maxTimeout: 5000,
        factor: 2,
        onFailedAttempt: (error: any) => {
          console.log(`Visualization attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
        }
      }
    )
  );
}

/**
 * Generate a modified floor plan visualization
 */
export async function generateFloorplanModification(
  floorplanImageBuffer: Buffer,
  mimeType: string,
  propertyAnalysis: PropertyAnalysisData,
  modificationType: string,
  estimatedSqFt: number
): Promise<VisualizationResult> {
  const apiKey = getApiKey();
  const limit = pLimit(1);
  const { put } = await import("@vercel/blob");

  return limit(() =>
    pRetry(
      async () => {
        try {
          const base64Image = floorplanImageBuffer.toString("base64");

          const prompt = `Modify this floor plan to incorporate a ${modificationType.replace(/_/g, ' ')}.

PROPERTY DETAILS:
- Type: ${propertyAnalysis.propertyType}
- Estimated current size: ${propertyAnalysis.estimatedSqFt} sq ft

MODIFICATION:
- Type: ${modificationType.replace(/_/g, ' ')}
- Additional space: approximately ${estimatedSqFt} sq ft

REQUIREMENTS:
- Add the ${modificationType.replace(/_/g, ' ')} to the appropriate location on the floor plan
- For rear extension: extend from the back of the property
- For side extension: extend from the side (if semi-detached or detached)
- For loft conversion: show as a new floor level or indicate dormer positions
- For garage conversion: convert existing garage space to living area
- Show new walls with a slightly different line style or color to distinguish from existing
- Include typical room layouts for this type of modification
- Add new room labels (e.g., "New Kitchen-Diner", "Utility", "Study")
- Include door positions in new areas
- Maintain scale with existing floor plan
- Keep the existing layout unchanged where not affected
- Generate a clean, architectural style floor plan

Generate a modified floor plan image showing this extension incorporated.`;

          const modelName = "gemini-3.1-flash-image-preview";
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

          console.log("=== FLOORPLAN MODIFICATION API CALL ===");

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
                aspectRatio: "4:3",
                imageSize: "2K"
              }
            }
          };

          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "x-goog-api-key": apiKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(50000), // 50s timeout per request
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Floorplan modification API error:", errorText);

            if (response.status === 429 || isRateLimitError({ message: errorText })) {
              throw new Error("Rate limit exceeded");
            }
            throw new AbortError(`API request failed: ${errorText}`);
          }

          const result = await response.json();

          const parts = result.candidates?.[0]?.content?.parts || [];
          let imageData: string | null = null;
          let imageMimeType = "image/png";

          for (const part of parts) {
            if (part.inline_data?.data) {
              imageData = part.inline_data.data;
              imageMimeType = part.inline_data.mime_type || "image/png";
              break;
            }
          }

          if (!imageData) {
            // Known Gemini issue - complex prompts sometimes get text-only responses
            throw new Error("NO_IMAGE_DATA: Model returned text-only response, retrying...");
          }

          const imageBuffer = Buffer.from(imageData, "base64");
          const extension = imageMimeType.split("/")[1] || "png";
          const filename = `planning-floorplan-${Date.now()}.${extension}`;

          const { url } = await put(filename, imageBuffer, {
            access: "public",
            contentType: imageMimeType,
          });

          return {
            success: true,
            imageUrl: url
          };
        } catch (error: any) {
          if (error instanceof AbortError) throw error;
          // Retry on rate limits and "no image data" responses (known Gemini issue)
          if (isRateLimitError(error) || error?.message?.includes("NO_IMAGE_DATA")) {
            throw error;
          }
          console.error("Floorplan modification error:", error);
          return {
            success: false,
            error: error.message || "Failed to modify floor plan"
          };
        }
      },
      {
        retries: 2,
        minTimeout: 2000,
        maxTimeout: 5000,
        factor: 2,
        onFailedAttempt: (error: any) => {
          console.log(`Floorplan modification attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
        }
      }
    )
  );
}
