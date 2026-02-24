/**
 * Perplexity API Client
 * Uses the sonar model to search real planning permission data
 * and check conservation area / listed building status.
 */

import pLimit from "p-limit";
import pRetry from "p-retry";
import type { RealApprovalData } from "../shared/schema.js";

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const limit = pLimit(1);

function getApiKey(): string {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error("PERPLEXITY_API_KEY environment variable is required");
  return key;
}

async function callPerplexity(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch(PERPLEXITY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    }),
  });

  if (res.status === 429) throw new Error("Perplexity rate limited");
  if (res.status === 401 || res.status === 403) {
    throw new pRetry.AbortError("Perplexity API authentication failed. Check PERPLEXITY_API_KEY.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Perplexity API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function extractJSON(text: string): any {
  // Try to extract JSON from markdown code blocks or raw text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr);
}

// ─── Search Real Planning Approvals ─────────────────────────

export interface PlanningSearchParams {
  postcode: string;
  address: string;
  propertyType: string;
  councilName?: string;
}

export async function searchRealPlanningApprovals(
  params: PlanningSearchParams,
): Promise<{ success: boolean; data?: RealApprovalData; error?: string }> {
  return limit(() =>
    pRetry(
      async () => {
        console.log(`[Perplexity] Searching planning approvals near ${params.postcode}`);

        const systemPrompt = `You are a UK planning permission research assistant. Search for real planning applications near the given address. Return ONLY valid JSON matching this exact schema:
{
  "searchSummary": "Brief description of what was found",
  "councilName": "Name of the local council/planning authority",
  "councilPlanningPortalUrl": "URL to the council's planning search portal",
  "recentApprovals": [
    {
      "applicationRef": "The planning application reference number",
      "address": "Address of the application",
      "description": "Description of the approved work",
      "decision": "Granted/Refused/Withdrawn",
      "decisionDate": "YYYY-MM-DD or approximate",
      "modificationType": "rear_extension/side_extension/loft_conversion/two_storey_extension/wraparound/garage_conversion/outbuilding",
      "source": "URL or source where this was found"
    }
  ],
  "areaCharacteristics": "Description of the local area's character and typical housing",
  "commonExtensionTypes": ["Most common types of extensions approved in this area"],
  "knownRestrictions": ["Any known planning restrictions, conservation areas, Article 4 directions, TPOs etc."]
}

Focus on residential extension applications (rear, side, loft, two-storey) within 500m of the postcode. Include both approved AND refused applications if found. Search local council planning portals and planning registers.`;

        const userPrompt = `Search for planning permission applications for house extensions near:
Address: ${params.address || "Not specified"}
Postcode: ${params.postcode}
Property type: ${params.propertyType}
${params.councilName ? `Council: ${params.councilName}` : ""}

Find recent (last 3 years) planning applications for residential extensions in this area. Include application reference numbers, addresses, descriptions of work, and decisions. Also identify the local council and any known restrictions in the area.`;

        const response = await callPerplexity(systemPrompt, userPrompt);

        try {
          const data = extractJSON(response) as RealApprovalData;
          console.log(`[Perplexity] Found ${data.recentApprovals?.length ?? 0} applications`);
          return { success: true, data };
        } catch (parseError) {
          console.error("[Perplexity] Failed to parse JSON response:", response.slice(0, 500));
          // Return a partial result with the raw text
          return {
            success: true,
            data: {
              searchSummary: response.slice(0, 500),
              councilName: "Unknown",
              councilPlanningPortalUrl: "",
              recentApprovals: [],
              areaCharacteristics: "",
              commonExtensionTypes: [],
              knownRestrictions: [],
            },
          };
        }
      },
      {
        retries: 2,
        minTimeout: 3000,
        maxTimeout: 15000,
        factor: 2,
        onFailedAttempt: (err) => {
          console.warn(`[Perplexity] Search attempt ${err.attemptNumber} failed: ${err.message}`);
        },
      },
    ),
  );
}

// ─── Conservation Area & Listed Building Check ──────────────

export interface ConservationCheckResult {
  isConservationArea: boolean;
  conservationAreaName?: string;
  isListedBuilding: boolean;
  listedBuildingGrade?: string;
  notes: string[];
}

export async function checkConservationAndListing(
  postcode: string,
  address: string,
): Promise<ConservationCheckResult> {
  return limit(() =>
    pRetry(
      async () => {
        console.log(`[Perplexity] Checking conservation/listing for ${postcode}`);

        const systemPrompt = `You are a UK property heritage checker. Determine if a property is in a conservation area or is a listed building. Return ONLY valid JSON:
{
  "isConservationArea": true/false,
  "conservationAreaName": "Name of conservation area or null",
  "isListedBuilding": true/false,
  "listedBuildingGrade": "I/II*/II or null",
  "notes": ["Any relevant notes about restrictions or designations"]
}

Search Historic England databases, local council conservation area maps, and the National Heritage List for England. Be accurate — if you cannot confirm, default to false.`;

        const userPrompt = `Check if this property is in a conservation area or is a listed building:
Address: ${address || "Not specified"}
Postcode: ${postcode}

Check the National Heritage List for England, the local council's conservation area designations, and any other heritage databases.`;

        const response = await callPerplexity(systemPrompt, userPrompt);

        try {
          const result = extractJSON(response) as ConservationCheckResult;
          console.log(
            `[Perplexity] Conservation: ${result.isConservationArea}, Listed: ${result.isListedBuilding}${result.listedBuildingGrade ? ` (Grade ${result.listedBuildingGrade})` : ""}`,
          );
          return result;
        } catch {
          console.error("[Perplexity] Failed to parse conservation check response");
          return {
            isConservationArea: false,
            isListedBuilding: false,
            notes: ["Unable to confirm conservation/listing status — recommend checking with local council"],
          };
        }
      },
      {
        retries: 2,
        minTimeout: 2000,
        maxTimeout: 10000,
        factor: 2,
        onFailedAttempt: (err) => {
          console.warn(`[Perplexity] Conservation check attempt ${err.attemptNumber} failed: ${err.message}`);
        },
      },
    ),
  );
}
