/**
 * Pascal node types — matches the shapes produced by pascal-bridge.ts.
 */

export type AnyNodeId = string & { __brand?: "AnyNodeId" };

interface PascalBaseNode {
  object: "node";
  id: AnyNodeId;
  type: string;
  name: string;
  parentId: string | null;
  visible: boolean;
  metadata: Record<string, unknown>;
}

export interface PascalSiteNode extends PascalBaseNode {
  type: "site";
  children: string[];
  polygon: { points: [number, number][] };
}

export interface PascalBuildingNode extends PascalBaseNode {
  type: "building";
  children: string[];
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface PascalLevelNode extends PascalBaseNode {
  type: "level";
  children: string[];
  level: number;
}

export interface PascalWallNode extends PascalBaseNode {
  type: "wall";
  children: string[];
  start: [number, number];
  end: [number, number];
  thickness: number;
  height: number;
  frontSide: string;
  backSide: string;
}

export interface PascalDoorNode extends PascalBaseNode {
  type: "door";
  position: [number, number, number];
  rotation: [number, number, number];
  wallId?: string;
  width: number;
  height: number;
  hingesSide: string;
}

export interface PascalWindowNode extends PascalBaseNode {
  type: "window";
  position: [number, number, number];
  rotation: [number, number, number];
  wallId?: string;
  width: number;
  height: number;
}

export interface PascalZoneNode extends PascalBaseNode {
  type: "zone";
  polygon: [number, number][];
  color: string;
}

export interface PascalCeilingNode extends PascalBaseNode {
  type: "ceiling";
  children: string[];
  polygon: [number, number][];
  holes: [number, number][][];
  height: number;
}

export interface PascalSlabNode extends PascalBaseNode {
  type: "slab";
  polygon: [number, number][];
  holes: [number, number][][];
  elevation: number;
}

export interface PascalRoofNode extends PascalBaseNode {
  type: "roof";
  position: [number, number, number];
  rotation: number;
  children: string[];
}

export interface PascalItemNode extends PascalBaseNode {
  type: "item";
  children: string[];
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  asset: {
    id: string;
    category: string;
    name: string;
    thumbnail: string;
    src: string;
    dimensions: [number, number, number];
  };
}

export interface PascalScanNode extends PascalBaseNode {
  type: "scan";
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  opacity: number;
}

export interface PascalGuideNode extends PascalBaseNode {
  type: "guide";
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  opacity: number;
}

export type AnyNode =
  | PascalSiteNode
  | PascalBuildingNode
  | PascalLevelNode
  | PascalWallNode
  | PascalDoorNode
  | PascalWindowNode
  | PascalZoneNode
  | PascalCeilingNode
  | PascalSlabNode
  | PascalRoofNode
  | PascalItemNode
  | PascalScanNode
  | PascalGuideNode;
