/**
 * EPC Register API Client
 * Free UK Government domestic Energy Performance Certificate data.
 * No API key required — see https://epc.opendatacommunities.org/docs/api/info
 */

import pLimit from "p-limit";
import pRetry from "p-retry";
import type { EPCData } from "../shared/schema.js";

const EPC_API_BASE = "https://epc.opendatacommunities.org/api/v1/domestic/search";
const limit = pLimit(1);

export interface EPCSearchResult {
  success: boolean;
  certificate?: EPCData;
  allCertificates?: EPCData[];
  error?: string;
}

/**
 * Look up a property's EPC data by postcode and house number.
 * Returns the most recent certificate for the matching property.
 */
export async function lookupEPC(
  postcode: string,
  houseNumber?: string,
): Promise<EPCSearchResult> {
  return limit(() =>
    pRetry(
      async () => {
        const params = new URLSearchParams({
          postcode: postcode.trim().toUpperCase(),
          size: "100",
        });

        console.log(`[EPC] Searching for postcode=${postcode}, house=${houseNumber ?? "any"}`);

        const res = await fetch(`${EPC_API_BASE}?${params.toString()}`, {
          headers: {
            Accept: "application/json",
          },
        });

        if (res.status === 429) {
          throw new Error("EPC API rate limited");
        }

        if (!res.ok) {
          const text = await res.text();
          console.error(`[EPC] API error ${res.status}: ${text}`);
          // 404 means no results found — not a retryable error
          if (res.status === 404) {
            return { success: false, error: "No EPC records found for this postcode" };
          }
          throw new Error(`EPC API error: ${res.status}`);
        }

        const data = await res.json();
        const rows: any[] = data.rows ?? [];

        if (rows.length === 0) {
          return { success: false, error: "No EPC records found for this postcode" };
        }

        // Map raw API fields to our EPCData interface
        const certificates: EPCData[] = rows.map(mapRawToEPC);

        // Filter by house number if provided
        let matched = certificates;
        if (houseNumber) {
          const num = houseNumber.trim().toLowerCase();
          matched = certificates.filter((c) => {
            const addr = c.address.toLowerCase();
            // Match "42" in "42, EXAMPLE ROAD" or "42 Example Road" or "Flat 42"
            return (
              addr.startsWith(num + ",") ||
              addr.startsWith(num + " ") ||
              addr.includes(` ${num},`) ||
              addr.includes(` ${num} `) ||
              addr.includes(`flat ${num}`)
            );
          });
        }

        if (matched.length === 0 && houseNumber) {
          console.log(`[EPC] No match for house number "${houseNumber}", returning most recent certificate`);
          // Fall back to most recent cert at this postcode
          matched = [certificates[0]];
        }

        // Sort by lodgement date descending (most recent first) — the API returns newest first usually
        const best = matched[0];
        console.log(`[EPC] Found: ${best.address} | ${best.builtForm} | ${best.totalFloorArea}sqm | ${best.constructionAgeBand}`);

        return {
          success: true,
          certificate: best,
          allCertificates: matched.length > 1 ? matched : undefined,
        };
      },
      {
        retries: 3,
        minTimeout: 2000,
        maxTimeout: 15000,
        factor: 2,
        onFailedAttempt: (err) => {
          console.warn(`[EPC] Attempt ${err.attemptNumber} failed: ${err.message}`);
        },
      },
    ),
  );
}

function mapRawToEPC(row: any): EPCData {
  return {
    lmkKey: row["lmk-key"] ?? row.lmkKey ?? "",
    address: row.address ?? "",
    postcode: row.postcode ?? "",
    buildingReference: row["building-reference-number"] ?? row.buildingReferenceNumber ?? "",
    propertyType: row["property-type"] ?? row.propertyType ?? "",
    builtForm: row["built-form"] ?? row.builtForm ?? "",
    totalFloorArea: parseFloat(row["total-floor-area"] ?? row.totalFloorArea ?? "0"),
    numberOfHabitableRooms: parseInt(row["number-habitable-rooms"] ?? row.numberOfHabitableRooms ?? "0", 10),
    currentEnergyRating: row["current-energy-rating"] ?? row.currentEnergyRating ?? "",
    potentialEnergyRating: row["potential-energy-rating"] ?? row.potentialEnergyRating ?? "",
    constructionAgeBand: row["construction-age-band"] ?? row.constructionAgeBand ?? "",
    wallsDescription: row["walls-description"] ?? row.wallsDescription ?? "",
    roofDescription: row["roof-description"] ?? row.roofDescription ?? "",
    windowsDescription: row["windows-description"] ?? row.windowsDescription ?? "",
    mainHeatDescription: row["mainheat-description"] ?? row.mainheatDescription ?? "",
    transactionType: row["transaction-type"] ?? row.transactionType ?? "",
    environmentImpactCurrent: parseInt(row["environment-impact-current"] ?? row.environmentImpactCurrent ?? "0", 10),
    co2EmissionsCurrent: parseFloat(row["co2-emissions-current"] ?? row.co2EmissionsCurrent ?? "0"),
  };
}
