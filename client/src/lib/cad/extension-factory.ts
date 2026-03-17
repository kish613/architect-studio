import type { ExtensionDetail, ExtensionOption, PDRAssessment, EPCData } from "@/lib/api";
import type { CADExtensionParams, PropertyBaseParams, PDRSliderBounds } from "./types";
import {
  WALL_THICKNESS,
  DEFAULT_PROPERTY_WIDTH,
  DEFAULT_PROPERTY_DEPTH,
  DEFAULT_STOREY_HEIGHT,
  DEFAULT_BIFOLD_WIDTH,
  DEFAULT_DOOR_HEIGHT,
  DEFAULT_WINDOW_WIDTH,
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_SILL_HEIGHT,
} from "./constants";

// Infer default windows/doors based on extension type
function getDefaultOpenings(ext: ExtensionDetail, params: CADExtensionParams) {
  const windows = [];
  const doors = [];

  switch (ext.type) {
    case "rear_single_storey":
      // Bifold doors on rear wall
      doors.push({
        widthM: Math.min(DEFAULT_BIFOLD_WIDTH, (params.widthM - WALL_THICKNESS * 2) * 0.8),
        heightM: DEFAULT_DOOR_HEIGHT,
        positionAlongWall: 0.5,
        wall: "rear" as const,
        type: "bifold" as const,
      });
      // Side windows
      if (params.widthM > 3) {
        windows.push({
          widthM: DEFAULT_WINDOW_WIDTH,
          heightM: DEFAULT_WINDOW_HEIGHT,
          sillHeightM: DEFAULT_WINDOW_SILL_HEIGHT,
          positionAlongWall: 0.5,
          wall: "left" as const,
        });
        windows.push({
          widthM: DEFAULT_WINDOW_WIDTH,
          heightM: DEFAULT_WINDOW_HEIGHT,
          sillHeightM: DEFAULT_WINDOW_SILL_HEIGHT,
          positionAlongWall: 0.5,
          wall: "right" as const,
        });
      }
      break;

    case "rear_two_storey":
      // Ground floor: bifold doors
      doors.push({
        widthM: Math.min(DEFAULT_BIFOLD_WIDTH, (params.widthM - WALL_THICKNESS * 2) * 0.8),
        heightM: DEFAULT_DOOR_HEIGHT,
        positionAlongWall: 0.5,
        wall: "rear" as const,
        type: "bifold" as const,
      });
      // Rear windows (upper floor would be a separate storey in real life,
      // but for a simple box we add windows higher up)
      windows.push({
        widthM: DEFAULT_WINDOW_WIDTH,
        heightM: DEFAULT_WINDOW_HEIGHT,
        sillHeightM: params.heightM / 2 + DEFAULT_WINDOW_SILL_HEIGHT,
        positionAlongWall: 0.3,
        wall: "rear" as const,
      });
      windows.push({
        widthM: DEFAULT_WINDOW_WIDTH,
        heightM: DEFAULT_WINDOW_HEIGHT,
        sillHeightM: params.heightM / 2 + DEFAULT_WINDOW_SILL_HEIGHT,
        positionAlongWall: 0.7,
        wall: "rear" as const,
      });
      break;

    case "side":
      // Front window
      windows.push({
        widthM: DEFAULT_WINDOW_WIDTH,
        heightM: DEFAULT_WINDOW_HEIGHT,
        sillHeightM: DEFAULT_WINDOW_SILL_HEIGHT,
        positionAlongWall: 0.5,
        wall: "front" as const,
      });
      // Side window
      windows.push({
        widthM: DEFAULT_WINDOW_WIDTH,
        heightM: DEFAULT_WINDOW_HEIGHT,
        sillHeightM: DEFAULT_WINDOW_SILL_HEIGHT,
        positionAlongWall: 0.5,
        wall: "left" as const,
      });
      break;

    case "loft":
      // Dormer windows on rear
      windows.push({
        widthM: DEFAULT_WINDOW_WIDTH,
        heightM: DEFAULT_WINDOW_HEIGHT,
        sillHeightM: 0.3,
        positionAlongWall: 0.3,
        wall: "rear" as const,
      });
      windows.push({
        widthM: DEFAULT_WINDOW_WIDTH,
        heightM: DEFAULT_WINDOW_HEIGHT,
        sillHeightM: 0.3,
        positionAlongWall: 0.7,
        wall: "rear" as const,
      });
      break;

    case "outbuilding":
      // Simple door and window
      doors.push({
        widthM: 0.9,
        heightM: DEFAULT_DOOR_HEIGHT,
        positionAlongWall: 0.3,
        wall: "front" as const,
        type: "standard" as const,
      });
      windows.push({
        widthM: DEFAULT_WINDOW_WIDTH,
        heightM: DEFAULT_WINDOW_HEIGHT,
        sillHeightM: DEFAULT_WINDOW_SILL_HEIGHT,
        positionAlongWall: 0.7,
        wall: "front" as const,
      });
      break;

    default:
      // wraparound, basement - use rear defaults
      doors.push({
        widthM: DEFAULT_BIFOLD_WIDTH,
        heightM: DEFAULT_DOOR_HEIGHT,
        positionAlongWall: 0.5,
        wall: "rear" as const,
        type: "bifold" as const,
      });
      break;
  }

  return { windows, doors };
}

// Convert an ExtensionDetail from the planning system into CAD parameters
export function extensionDetailToCADParams(
  ext: ExtensionDetail,
  property: PropertyBaseParams
): CADExtensionParams {
  // Use provided dimensions or calculate from sqM
  const depthM = ext.depthM || Math.sqrt(ext.additionalSqM);
  const widthM = ext.widthM || (ext.additionalSqM / depthM);
  const heightM = ext.heightM || (ext.type === "rear_two_storey" ? DEFAULT_STOREY_HEIGHT * 2 : DEFAULT_STOREY_HEIGHT);

  // Determine attachment side
  let attachmentSide: "rear" | "left" | "right" = "rear";
  if (ext.type === "side") {
    attachmentSide = "left"; // default, user can change
  }

  // Determine roof type
  let roofType: "flat" | "pitched" | "hipped" = "flat";
  if (ext.type === "rear_two_storey" || ext.type === "loft") {
    roofType = "pitched";
  }

  const params: CADExtensionParams = {
    type: ext.type,
    depthM,
    widthM,
    heightM,
    wallThicknessM: WALL_THICKNESS,
    roofType,
    roofPitchDeg: 30,
    attachmentSide,
    offsetFromEdgeM: 0,
    windows: [],
    doors: [],
  };

  // Add default openings
  const { windows, doors } = getDefaultOpenings(ext, params);
  params.windows = windows;
  params.doors = doors;

  return params;
}

// Convert all extensions from a selected option tier
export function extensionOptionToCADParams(
  option: ExtensionOption,
  property: PropertyBaseParams
): CADExtensionParams[] {
  return option.extensions.map((ext) => extensionDetailToCADParams(ext, property));
}

// Build property base params from EPC data or defaults
export function buildPropertyBase(
  epcData?: EPCData | null,
  propertyAnalysis?: { stories?: number } | null
): PropertyBaseParams {
  if (epcData && epcData.totalFloorArea) {
    const stories = propertyAnalysis?.stories || 2;
    const footprint = epcData.totalFloorArea / stories;
    // Assume roughly rectangular, width:depth ratio of ~0.8
    const depth = Math.sqrt(footprint / 0.8);
    const width = footprint / depth;
    return {
      widthM: Math.round(width * 10) / 10,
      depthM: Math.round(depth * 10) / 10,
      heightM: DEFAULT_STOREY_HEIGHT,
      stories,
    };
  }

  return {
    widthM: DEFAULT_PROPERTY_WIDTH,
    depthM: DEFAULT_PROPERTY_DEPTH,
    heightM: DEFAULT_STOREY_HEIGHT,
    stories: propertyAnalysis?.stories || 2,
  };
}

// Calculate slider bounds from PDR assessment
export function getPDRSliderBounds(
  extType: string,
  pdr: PDRAssessment | null
): PDRSliderBounds {
  if (!pdr) {
    return {
      maxDepthM: 8,
      maxHeightM: 6,
      pdrDepthLimit: 4,
    };
  }

  switch (extType) {
    case "rear_single_storey":
      return {
        maxDepthM: pdr.rearSingleStorey.maxDepthM + 2,
        maxHeightM: pdr.rearSingleStorey.maxHeightM + 1,
        pdrDepthLimit: pdr.rearSingleStorey.maxDepthM,
      };
    case "rear_two_storey":
      return {
        maxDepthM: pdr.rearTwoStorey.maxDepthM + 2,
        maxHeightM: 7,
        pdrDepthLimit: pdr.rearTwoStorey.maxDepthM,
      };
    case "side":
      return {
        maxDepthM: 8,
        maxHeightM: pdr.side.maxHeightM + 1,
        maxWidthM: 6,
        pdrDepthLimit: 6,
      };
    case "loft":
      return {
        maxDepthM: 4,
        maxHeightM: pdr.loft.maxHeightM,
        pdrDepthLimit: 3,
      };
    case "outbuilding":
      return {
        maxDepthM: 8,
        maxHeightM: pdr.outbuilding.maxHeightM + 1,
        pdrDepthLimit: 6,
      };
    default:
      return {
        maxDepthM: 8,
        maxHeightM: 6,
        pdrDepthLimit: 4,
      };
  }
}
