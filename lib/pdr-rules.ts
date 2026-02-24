/**
 * UK Permitted Development Rights (PDR) Rules Engine
 * Based on: The Town and Country Planning (General Permitted Development)
 * (England) Order 2015, Schedule 2, Part 1
 *
 * Pure logic — no API calls.
 */

import type {
  PDRAssessment,
  ExtensionOption,
  ExtensionOptionTier,
  ExtensionDetail,
  ExtensionType,
  PartyWallAssessment,
  NeighbourImpactAnalysis,
  EPCData,
  RealApprovalData,
} from "../shared/schema.js";

// ─── PDR Input ──────────────────────────────────────────────

export interface PDRInput {
  propertyType: "detached" | "semi_detached" | "terraced" | "bungalow" | "flat" | "other";
  totalFloorAreaSqM: number;
  stories: number;
  isConservationArea: boolean;
  isListedBuilding: boolean;
  previouslyExtended: boolean;
}

// ─── Cost Data (GBP per sqm, 2024/2025 UK averages) ────────

const COST_PER_SQM: Record<ExtensionType, { low: number; mid: number; high: number }> = {
  rear_single_storey: { low: 1500, mid: 2200, high: 3200 },
  rear_two_storey:    { low: 1800, mid: 2500, high: 3500 },
  side:               { low: 1600, mid: 2300, high: 3300 },
  loft:               { low: 1200, mid: 1800, high: 2800 },
  wraparound:         { low: 1800, mid: 2600, high: 3800 },
  basement:           { low: 3000, mid: 4000, high: 6000 },
  outbuilding:        { low: 1000, mid: 1500, high: 2200 },
};

// Regional multipliers based on postcode area
const REGION_MULTIPLIERS: Record<string, { region: string; multiplier: number }> = {
  // London
  E: { region: "London", multiplier: 1.3 }, EC: { region: "London", multiplier: 1.3 },
  N: { region: "London", multiplier: 1.3 }, NW: { region: "London", multiplier: 1.3 },
  SE: { region: "London", multiplier: 1.3 }, SW: { region: "London", multiplier: 1.3 },
  W: { region: "London", multiplier: 1.3 }, WC: { region: "London", multiplier: 1.3 },
  // South East
  BN: { region: "South East", multiplier: 1.15 }, CT: { region: "South East", multiplier: 1.15 },
  GU: { region: "South East", multiplier: 1.15 }, HP: { region: "South East", multiplier: 1.15 },
  ME: { region: "South East", multiplier: 1.15 }, MK: { region: "South East", multiplier: 1.15 },
  OX: { region: "South East", multiplier: 1.15 }, PO: { region: "South East", multiplier: 1.15 },
  RG: { region: "South East", multiplier: 1.15 }, RH: { region: "South East", multiplier: 1.15 },
  SL: { region: "South East", multiplier: 1.15 }, SO: { region: "South East", multiplier: 1.15 },
  TN: { region: "South East", multiplier: 1.15 }, KT: { region: "South East", multiplier: 1.15 },
  SM: { region: "South East", multiplier: 1.15 }, CR: { region: "South East", multiplier: 1.15 },
  DA: { region: "South East", multiplier: 1.15 }, BR: { region: "South East", multiplier: 1.15 },
  // South West
  BA: { region: "South West", multiplier: 1.05 }, BS: { region: "South West", multiplier: 1.05 },
  DT: { region: "South West", multiplier: 1.05 }, EX: { region: "South West", multiplier: 1.05 },
  GL: { region: "South West", multiplier: 1.05 }, PL: { region: "South West", multiplier: 1.05 },
  SN: { region: "South West", multiplier: 1.05 }, SP: { region: "South West", multiplier: 1.05 },
  TA: { region: "South West", multiplier: 1.05 }, TQ: { region: "South West", multiplier: 1.05 },
  TR: { region: "South West", multiplier: 1.05 }, BH: { region: "South West", multiplier: 1.05 },
  // Midlands
  B: { region: "Midlands", multiplier: 1.0 }, CV: { region: "Midlands", multiplier: 1.0 },
  DE: { region: "Midlands", multiplier: 1.0 }, DY: { region: "Midlands", multiplier: 1.0 },
  LE: { region: "Midlands", multiplier: 1.0 }, NG: { region: "Midlands", multiplier: 1.0 },
  NN: { region: "Midlands", multiplier: 1.0 }, PE: { region: "Midlands", multiplier: 1.0 },
  ST: { region: "Midlands", multiplier: 1.0 }, WS: { region: "Midlands", multiplier: 1.0 },
  WV: { region: "Midlands", multiplier: 1.0 }, WR: { region: "Midlands", multiplier: 1.0 },
  // North
  BD: { region: "North", multiplier: 0.9 }, BL: { region: "North", multiplier: 0.9 },
  CH: { region: "North", multiplier: 0.9 }, CW: { region: "North", multiplier: 0.9 },
  DH: { region: "North", multiplier: 0.9 }, DL: { region: "North", multiplier: 0.9 },
  DN: { region: "North", multiplier: 0.9 }, FY: { region: "North", multiplier: 0.9 },
  HD: { region: "North", multiplier: 0.9 }, HG: { region: "North", multiplier: 0.9 },
  HU: { region: "North", multiplier: 0.9 }, HX: { region: "North", multiplier: 0.9 },
  L: { region: "North", multiplier: 0.9 }, LA: { region: "North", multiplier: 0.9 },
  LS: { region: "North", multiplier: 0.9 }, M: { region: "North", multiplier: 0.9 },
  NE: { region: "North", multiplier: 0.9 }, OL: { region: "North", multiplier: 0.9 },
  PR: { region: "North", multiplier: 0.9 }, S: { region: "North", multiplier: 0.9 },
  SK: { region: "North", multiplier: 0.9 }, SR: { region: "North", multiplier: 0.9 },
  TS: { region: "North", multiplier: 0.9 }, WA: { region: "North", multiplier: 0.9 },
  WF: { region: "North", multiplier: 0.9 }, WN: { region: "North", multiplier: 0.9 },
  YO: { region: "North", multiplier: 0.9 },
};

// ─── Helpers ────────────────────────────────────────────────

function getRegionInfo(postcode: string): { region: string; multiplier: number } {
  const prefix = postcode.replace(/\s/g, "").replace(/[0-9].*/, "").toUpperCase();
  return REGION_MULTIPLIERS[prefix] ?? { region: "England Average", multiplier: 1.0 };
}

function mapEPCBuiltForm(builtForm: string): PDRInput["propertyType"] {
  const lower = builtForm.toLowerCase();
  if (lower.includes("detach") && !lower.includes("semi")) return "detached";
  if (lower.includes("semi")) return "semi_detached";
  if (lower.includes("terrace") || lower.includes("mid-terrace") || lower.includes("end-terrace")) return "terraced";
  if (lower.includes("bungalow")) return "bungalow";
  if (lower.includes("flat") || lower.includes("maisonette") || lower.includes("apartment")) return "flat";
  return "other";
}

// ─── PDR Calculation ────────────────────────────────────────

export function calculatePDR(input: PDRInput): PDRAssessment {
  const { propertyType, isConservationArea, isListedBuilding } = input;
  const isFlat = propertyType === "flat";

  // Listed buildings have NO permitted development rights
  if (isListedBuilding) {
    return {
      propertyCategory: propertyType,
      rearExtension: { singleStoreyMaxDepthM: 0, singleStoreyMaxHeightM: 0, twoStoreyMaxDepthM: 0, twoStoreyMinDistFromBoundaryM: 0, priorApprovalMaxDepthM: 0, permitted: false, notes: ["Listed building: all external changes require listed building consent"] },
      sideExtension: { maxWidthPercentOfOriginal: 0, singleStoreyOnly: true, maxHeightM: 0, minDistFromBoundaryM: 0, permitted: false, notes: ["Listed building: not permitted"] },
      loftConversion: { maxAdditionalVolumeM3: 0, dormerAllowed: false, frontDormerAllowed: false, sideWindowObscuredGlazed: true, permitted: false, notes: ["Listed building: not permitted"] },
      outbuilding: { maxCoveragePercent: 0, maxHeightNearBoundaryM: 0, maxHeightElsewhereM: 0, permitted: false, notes: ["Listed building: not permitted"] },
      conservationAreaRestrictions: [],
      listedBuildingRestrictions: ["All external alterations require Listed Building Consent", "Internal alterations may also require consent depending on grade", "Replacement windows, doors, and roof materials all need approval"],
      overallPDRSummary: "This is a listed building. No permitted development rights apply. All changes require Listed Building Consent and likely planning permission.",
    };
  }

  // Flats have very limited PDR
  if (isFlat) {
    return {
      propertyCategory: "flat",
      rearExtension: { singleStoreyMaxDepthM: 0, singleStoreyMaxHeightM: 0, twoStoreyMaxDepthM: 0, twoStoreyMinDistFromBoundaryM: 0, priorApprovalMaxDepthM: 0, permitted: false, notes: ["Flats: no extension rights under PDR"] },
      sideExtension: { maxWidthPercentOfOriginal: 0, singleStoreyOnly: true, maxHeightM: 0, minDistFromBoundaryM: 0, permitted: false, notes: ["Flats: not permitted"] },
      loftConversion: { maxAdditionalVolumeM3: 0, dormerAllowed: false, frontDormerAllowed: false, sideWindowObscuredGlazed: true, permitted: false, notes: ["Flats: not permitted under PDR"] },
      outbuilding: { maxCoveragePercent: 0, maxHeightNearBoundaryM: 0, maxHeightElsewhereM: 0, permitted: false, notes: ["Flats: not permitted"] },
      conservationAreaRestrictions: isConservationArea ? ["Flats in conservation areas have no extension PDR rights"] : [],
      listedBuildingRestrictions: [],
      overallPDRSummary: "Flats and maisonettes have very limited permitted development rights. Most changes require planning permission from your local authority.",
    };
  }

  const isDetached = propertyType === "detached";
  const isTerraced = propertyType === "terraced";
  const isBungalow = propertyType === "bungalow";

  // Rear extension limits
  const rearSingleDepth = isDetached || isBungalow ? 4 : 3;
  const priorApprovalDepth = isDetached || isBungalow ? 8 : 6;
  const rearNotes: string[] = [];
  if (isConservationArea) {
    rearNotes.push("Conservation area: single storey rear only, max 1 storey, materials must match");
  }
  if (input.previouslyExtended) {
    rearNotes.push("Previously extended: total extension depth includes prior extensions");
  }

  // Side extension limits
  const sidePermitted = !isTerraced;
  const sideNotes: string[] = [];
  if (isConservationArea) {
    sideNotes.push("Conservation area: side extensions NOT permitted under PDR");
  }

  // Loft limits
  const loftVolume = isTerraced ? 40 : 50;
  const loftNotes: string[] = [];
  if (isConservationArea) {
    loftNotes.push("Conservation area: no dormer on any roof slope facing a highway");
    loftNotes.push("Conservation area: no cladding of external walls");
  }
  if (isBungalow) {
    loftNotes.push("Bungalow: loft conversion may change the character significantly; additional scrutiny likely");
  }

  const conservationRestrictions = isConservationArea ? [
    "No side extensions permitted under PDR",
    "No cladding of external walls",
    "Rear extensions limited to single storey",
    "No dormers on roof slopes facing a highway",
    "Materials must match existing in appearance",
  ] : [];

  return {
    propertyCategory: propertyType,
    rearExtension: {
      singleStoreyMaxDepthM: rearSingleDepth,
      singleStoreyMaxHeightM: 4,
      twoStoreyMaxDepthM: isConservationArea ? 0 : 3,
      twoStoreyMinDistFromBoundaryM: 7,
      priorApprovalMaxDepthM: isConservationArea ? rearSingleDepth : priorApprovalDepth,
      permitted: true,
      notes: rearNotes,
    },
    sideExtension: {
      maxWidthPercentOfOriginal: sidePermitted ? 50 : 0,
      singleStoreyOnly: true,
      maxHeightM: 4,
      minDistFromBoundaryM: 1,
      permitted: sidePermitted && !isConservationArea,
      notes: sideNotes,
    },
    loftConversion: {
      maxAdditionalVolumeM3: loftVolume,
      dormerAllowed: true,
      frontDormerAllowed: false,
      sideWindowObscuredGlazed: true,
      permitted: !isBungalow || input.stories >= 1,
      notes: loftNotes,
    },
    outbuilding: {
      maxCoveragePercent: 50,
      maxHeightNearBoundaryM: 2.5,
      maxHeightElsewhereM: isBungalow ? 3 : 4,
      permitted: true,
      notes: isConservationArea ? ["Must not be forward of the principal elevation facing a highway"] : [],
    },
    conservationAreaRestrictions: conservationRestrictions,
    listedBuildingRestrictions: [],
    overallPDRSummary: buildPDRSummary(propertyType, isConservationArea, rearSingleDepth, loftVolume, sidePermitted),
  };
}

function buildPDRSummary(
  type: string, isConservation: boolean, rearDepth: number, loftVol: number, sideOk: boolean,
): string {
  const parts = [`As a ${type.replace("_", "-")} property`];
  if (isConservation) parts.push("in a conservation area");
  parts.push(`you can extend up to ${rearDepth}m to the rear (single storey) under PDR`);
  if (sideOk && !isConservation) parts.push("add a single-storey side extension up to 50% of original width");
  parts.push(`and convert the loft adding up to ${loftVol}m\u00B3`);
  return parts.join(", ") + ". Two-storey rear extensions up to 3m are also possible (not in conservation areas).";
}

// ─── Extension Options Generation ───────────────────────────

export function generateExtensionOptions(
  pdr: PDRAssessment,
  epcData: EPCData | null,
  realApprovals: RealApprovalData | null,
  orientation: string | null,
): ExtensionOption[] {
  const floorArea = epcData?.totalFloorArea ?? 80; // default 80 sqm if unknown
  const options: ExtensionOption[] = [];

  // --- Option 1: PDR-Compliant Only ---
  const pdrExtensions: ExtensionDetail[] = [];

  if (pdr.rearExtension.permitted) {
    const depth = pdr.rearExtension.singleStoreyMaxDepthM;
    const width = Math.min(floorArea / (pdr.propertyCategory === "terraced" ? 2 : 2.5), 6);
    pdrExtensions.push({
      type: "rear_single_storey",
      description: `Single-storey rear extension (${depth}m deep)`,
      additionalSqM: Math.round(depth * width),
      depthM: depth,
      widthM: Math.round(width * 10) / 10,
      heightM: 3,
    });
  }

  if (pdr.loftConversion.permitted && pdr.loftConversion.maxAdditionalVolumeM3 > 0) {
    const loftSqM = Math.round(pdr.loftConversion.maxAdditionalVolumeM3 / 2.4); // approx ceiling height
    pdrExtensions.push({
      type: "loft",
      description: `Loft conversion with rear dormer (${pdr.loftConversion.maxAdditionalVolumeM3}m\u00B3 max)`,
      additionalSqM: loftSqM,
    });
  }

  const pdrTotalSqM = pdrExtensions.reduce((s, e) => s + e.additionalSqM, 0);

  options.push({
    tier: "pdr_only",
    label: "PDR-Compliant Only",
    description: "Extensions permitted without planning permission under current Permitted Development Rights. Fastest route with no planning risk.",
    requiresPlanningPermission: false,
    extensions: pdrExtensions,
    totalAdditionalSqM: pdrTotalSqM,
    estimatedCostGBP: { low: 0, mid: 0, high: 0 }, // filled by estimateCosts
    approvalLikelihood: "very_high",
    planningNotes: [
      "No planning application required",
      "Building regulations approval still needed",
      "Party wall notices may be required for shared boundaries",
      "Must comply with all PDR conditions (height, depth, materials)",
    ],
    partyWallRequired: pdr.propertyCategory !== "detached",
    buildingRegsRequired: true,
    timelineWeeks: { min: 8, max: 16 },
  });

  // --- Option 2: Moderate Planning (Full planning, high approval chance) ---
  const modExtensions: ExtensionDetail[] = [];

  // Larger rear - use prior approval depth or slightly beyond PDR
  if (pdr.rearExtension.permitted) {
    const depth = Math.min(pdr.rearExtension.priorApprovalMaxDepthM, 6);
    const width = Math.min(floorArea / 2, 7);
    modExtensions.push({
      type: "rear_single_storey",
      description: `Single-storey rear extension (${depth}m deep, larger via planning)`,
      additionalSqM: Math.round(depth * width),
      depthM: depth,
      widthM: Math.round(width * 10) / 10,
      heightM: 3.5,
    });
  }

  // Side extension if possible
  if (pdr.sideExtension.permitted || pdr.propertyCategory === "detached" || pdr.propertyCategory === "semi_detached") {
    const sideWidth = 3;
    const sideDepth = Math.min(floorArea / 10, 5);
    modExtensions.push({
      type: "side",
      description: `Single-storey side extension (${sideWidth}m wide)`,
      additionalSqM: Math.round(sideWidth * sideDepth),
      widthM: sideWidth,
      depthM: sideDepth,
      heightM: 3,
    });
  }

  // Loft
  if (pdr.loftConversion.permitted) {
    modExtensions.push({
      type: "loft",
      description: "Loft conversion with dormer windows",
      additionalSqM: Math.round((pdr.loftConversion.maxAdditionalVolumeM3 + 10) / 2.4),
    });
  }

  const modTotalSqM = modExtensions.reduce((s, e) => s + e.additionalSqM, 0);

  // Derive approval notes from real data if available
  const modPlanningNotes = ["Full planning application required", "Building regulations approval required"];
  if (realApprovals?.commonExtensionTypes?.length) {
    modPlanningNotes.push(`Common approvals in area: ${realApprovals.commonExtensionTypes.join(", ")}`);
  }

  options.push({
    tier: "moderate_planning",
    label: "Full Planning (Moderate)",
    description: "Extends beyond PDR limits with a full planning application. Based on similar approvals in your area, these extensions have a good chance of approval.",
    requiresPlanningPermission: true,
    extensions: modExtensions,
    totalAdditionalSqM: modTotalSqM,
    estimatedCostGBP: { low: 0, mid: 0, high: 0 },
    approvalLikelihood: "high",
    planningNotes: modPlanningNotes,
    partyWallRequired: pdr.propertyCategory !== "detached",
    buildingRegsRequired: true,
    timelineWeeks: { min: 16, max: 30 },
  });

  // --- Option 3: Maximum Extension (Ambitious) ---
  const maxExtensions: ExtensionDetail[] = [];

  // Two-storey rear
  if (pdr.propertyCategory !== "flat") {
    const depth = 4;
    const width = Math.min(floorArea / 2, 7);
    maxExtensions.push({
      type: "rear_two_storey",
      description: "Two-storey rear extension (4m deep)",
      additionalSqM: Math.round(depth * width * 2), // two floors
      depthM: depth,
      widthM: Math.round(width * 10) / 10,
      heightM: 6,
    });
  }

  // Wraparound if detached or semi
  if (pdr.propertyCategory === "detached" || pdr.propertyCategory === "semi_detached") {
    const wrapSqM = Math.round(floorArea * 0.25);
    maxExtensions.push({
      type: "wraparound",
      description: "Wraparound (rear + side) ground floor extension",
      additionalSqM: wrapSqM,
    });
  }

  // Loft with dormer
  if (pdr.propertyCategory !== "flat") {
    maxExtensions.push({
      type: "loft",
      description: "Full loft conversion with large rear dormer and Juliet balcony",
      additionalSqM: Math.round(floorArea * 0.6),
    });
  }

  const maxTotalSqM = maxExtensions.reduce((s, e) => s + e.additionalSqM, 0);

  const maxNotes = [
    "Full planning application required",
    "Architect drawings recommended",
    "May require structural engineer involvement",
    "Higher scrutiny from planning officers expected",
  ];
  if (realApprovals?.knownRestrictions?.length) {
    maxNotes.push(`Known local restrictions: ${realApprovals.knownRestrictions.join("; ")}`);
  }

  options.push({
    tier: "maximum_extension",
    label: "Maximum Extension",
    description: "The largest feasible extension combining rear, side/wraparound, and loft. Ambitious scope that pushes planning boundaries based on what has been approved locally.",
    requiresPlanningPermission: true,
    extensions: maxExtensions,
    totalAdditionalSqM: maxTotalSqM,
    estimatedCostGBP: { low: 0, mid: 0, high: 0 },
    approvalLikelihood: "moderate",
    planningNotes: maxNotes,
    partyWallRequired: true,
    buildingRegsRequired: true,
    timelineWeeks: { min: 24, max: 52 },
  });

  return options;
}

// ─── Cost Estimation ────────────────────────────────────────

export function estimateCosts(options: ExtensionOption[], postcode: string): ExtensionOption[] {
  const { region, multiplier } = getRegionInfo(postcode);

  return options.map((opt) => {
    let totalLow = 0;
    let totalMid = 0;
    let totalHigh = 0;

    for (const ext of opt.extensions) {
      const base = COST_PER_SQM[ext.type] ?? COST_PER_SQM.rear_single_storey;
      const sqm = ext.additionalSqM;
      totalLow += Math.round(sqm * base.low * multiplier);
      totalMid += Math.round(sqm * base.mid * multiplier);
      totalHigh += Math.round(sqm * base.high * multiplier);
    }

    // Add planning application fee for options that need planning
    if (opt.requiresPlanningPermission) {
      totalLow += 250;
      totalMid += 500;
      totalHigh += 750;
    }

    return {
      ...opt,
      estimatedCostGBP: { low: totalLow, mid: totalMid, high: totalHigh },
    };
  });
}

// ─── Party Wall Assessment ──────────────────────────────────

export function assessPartyWall(
  propertyType: string,
  extensions: ExtensionDetail[],
): PartyWallAssessment {
  const isDetached = propertyType === "detached";
  if (isDetached) {
    return {
      required: false,
      affectedBoundaries: [],
      totalEstimatedCostGBP: 0,
      notes: ["Detached property: Party Wall Act unlikely to apply unless digging near boundary"],
    };
  }

  const boundaries: PartyWallAssessment["affectedBoundaries"] = [];
  const isSemi = propertyType === "semi_detached" || propertyType === "semi-detached";

  for (const ext of extensions) {
    if (ext.type === "rear_single_storey" || ext.type === "rear_two_storey" || ext.type === "wraparound") {
      if (isSemi) {
        boundaries.push({
          side: "left",
          reason: `${ext.description} — extends along shared party wall`,
          noticeRequired: true,
          estimatedSurveyorCostGBP: 1200,
        });
      } else {
        // Terraced — both sides
        boundaries.push({
          side: "left",
          reason: `${ext.description} — extends along shared boundary (left)`,
          noticeRequired: true,
          estimatedSurveyorCostGBP: 1200,
        });
        boundaries.push({
          side: "right",
          reason: `${ext.description} — extends along shared boundary (right)`,
          noticeRequired: true,
          estimatedSurveyorCostGBP: 1200,
        });
      }
    }

    if (ext.type === "side") {
      boundaries.push({
        side: isSemi ? "left" : "right",
        reason: `Side extension near boundary`,
        noticeRequired: true,
        estimatedSurveyorCostGBP: 1000,
      });
    }

    if (ext.type === "loft") {
      if (!isDetached) {
        boundaries.push({
          side: "left",
          reason: "Loft conversion may affect shared party wall at roof level",
          noticeRequired: true,
          estimatedSurveyorCostGBP: 800,
        });
      }
    }
  }

  // Deduplicate boundaries by side
  const uniqueBoundaries = Array.from(
    new Map(boundaries.map((b) => [b.side, b])).values()
  );

  const total = uniqueBoundaries.reduce((s, b) => s + b.estimatedSurveyorCostGBP, 0);

  return {
    required: uniqueBoundaries.length > 0,
    affectedBoundaries: uniqueBoundaries,
    totalEstimatedCostGBP: total,
    notes: uniqueBoundaries.length > 0
      ? [
          "Party Wall notices must be served at least 2 months before work begins",
          "Each adjoining owner can appoint their own surveyor at your expense",
          "Costs shown are estimates per boundary — actual costs vary",
        ]
      : ["No party wall notices likely required"],
  };
}

// ─── Neighbour Impact Assessment ────────────────────────────

export function assessNeighbourImpact(
  propertyType: string,
  extensions: ExtensionDetail[],
  orientation: string | null,
): NeighbourImpactAnalysis {
  const hasRearTwoStorey = extensions.some((e) => e.type === "rear_two_storey");
  const hasSide = extensions.some((e) => e.type === "side");
  const hasLoft = extensions.some((e) => e.type === "loft");
  const maxDepth = Math.max(...extensions.filter((e) => e.depthM).map((e) => e.depthM!), 0);
  const isAttached = propertyType !== "detached";

  // 45-degree rule
  const fortyFiveFailed = hasRearTwoStorey && maxDepth > 3;
  const affectedNeighbours: string[] = [];
  if (fortyFiveFailed && isAttached) affectedNeighbours.push("Adjoining neighbour(s)");
  if (hasSide) affectedNeighbours.push("Side neighbour");

  // Overshadowing
  let shadowSeverity: NeighbourImpactAnalysis["overshadowing"]["severity"] = "none";
  let shadowDirection = "";
  if (hasRearTwoStorey) {
    shadowSeverity = maxDepth > 4 ? "moderate" : "minor";
    if (orientation) {
      const northFacing = ["N", "NE", "NW"].some((d) => orientation.toUpperCase().startsWith(d));
      shadowDirection = northFacing ? "South (rear garden)" : "North-facing rear neighbours";
      if (northFacing) shadowSeverity = "minor"; // north-facing rear = less neighbour impact
    }
  }
  if (hasSide) {
    shadowSeverity = shadowSeverity === "none" ? "minor" : shadowSeverity;
  }

  // Overlooking
  let overlookRisk: NeighbourImpactAnalysis["overlooking"]["risk"] = "none";
  const mitigations: string[] = [];
  if (hasRearTwoStorey || hasLoft) {
    overlookRisk = isAttached ? "moderate" : "low";
    mitigations.push("Use obscured glazing on side-facing windows");
    mitigations.push("Position windows to face own garden rather than neighbours");
    if (hasLoft) mitigations.push("Roof windows (Velux) have less overlooking impact than dormers");
  }

  // Overall risk
  let overallRisk: NeighbourImpactAnalysis["overallRisk"] = "low";
  if (fortyFiveFailed || shadowSeverity === "moderate" || overlookRisk === "moderate") overallRisk = "moderate";
  if (shadowSeverity === "significant" || overlookRisk === "high") overallRisk = "high";

  const recommendations: string[] = [];
  if (overallRisk !== "low") {
    recommendations.push("Consider discussing plans with affected neighbours before submitting");
    recommendations.push("Pre-application advice from your local council is recommended");
  }
  if (fortyFiveFailed) {
    recommendations.push("Reducing the two-storey depth to 3m or less would pass the 45-degree rule");
  }

  return {
    fortyFiveDegreeRule: {
      passed: !fortyFiveFailed,
      affectedNeighbours,
      notes: fortyFiveFailed
        ? `Two-storey extension at ${maxDepth}m depth may breach the 45-degree line drawn from the nearest ground-floor habitable window of the adjoining property.`
        : "Extension depth is within acceptable limits under the 45-degree rule.",
    },
    overshadowing: {
      severity: shadowSeverity,
      affectedDirection: shadowDirection,
      notes: shadowSeverity === "none"
        ? "Minimal overshadowing expected."
        : `${shadowSeverity.charAt(0).toUpperCase() + shadowSeverity.slice(1)} overshadowing possible. Planning officers will assess impact on neighbouring amenity.`,
    },
    overlooking: {
      risk: overlookRisk,
      mitigations,
    },
    overallRisk,
    recommendations,
  };
}

// ─── Convenience: Build PDR input from EPC data ─────────────

export function buildPDRInputFromEPC(
  epcData: EPCData,
  isConservationArea: boolean,
  isListedBuilding: boolean,
): PDRInput {
  const builtForm = mapEPCBuiltForm(epcData.builtForm);
  const stories = epcData.propertyType?.toLowerCase().includes("bungalow") ? 1 : 2;

  return {
    propertyType: builtForm,
    totalFloorAreaSqM: epcData.totalFloorArea,
    stories,
    isConservationArea,
    isListedBuilding,
    previouslyExtended: false, // Cannot determine from EPC alone
  };
}
