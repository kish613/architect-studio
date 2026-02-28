import type { ExtensionType } from "@/lib/api";

export type RoofType = "flat" | "pitched" | "hipped";
export type WallSide = "front" | "left" | "right" | "rear";
export type AttachmentSide = "rear" | "left" | "right";

export interface WindowParams {
  widthM: number;
  heightM: number;
  sillHeightM: number;
  positionAlongWall: number; // 0-1 fraction along the wall
  wall: WallSide;
}

export interface DoorParams {
  widthM: number;
  heightM: number;
  positionAlongWall: number; // 0-1 fraction along the wall
  wall: WallSide;
  type: "standard" | "bifold" | "sliding";
}

export interface CADExtensionParams {
  type: ExtensionType;
  depthM: number;
  widthM: number;
  heightM: number;
  wallThicknessM: number;
  roofType: RoofType;
  roofPitchDeg: number;
  attachmentSide: AttachmentSide;
  offsetFromEdgeM: number;
  windows: WindowParams[];
  doors: DoorParams[];
}

export interface PropertyBaseParams {
  widthM: number;
  depthM: number;
  heightM: number;
  stories: number;
}

export interface CADSceneParams {
  property: PropertyBaseParams;
  extensions: CADExtensionParams[];
  showDimensions: boolean;
  showWireframe: boolean;
}

export interface PDRSliderBounds {
  maxDepthM: number;
  maxHeightM: number;
  maxWidthM?: number;
  pdrDepthLimit: number; // depth where PDR ends and planning permission begins
}
