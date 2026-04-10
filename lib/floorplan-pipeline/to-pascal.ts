/**
 * Legacy adapter: canonical BIM → Pascal SceneData.
 *
 * The Pascal editor is kept around as a compatibility layer during the
 * BIM-first migration. This adapter derives a Pascal SceneData graph from
 * the canonical BIM model so the existing editor UI (PascalCanvas, the
 * drag handles, the property panels) can still work against the same data.
 *
 * This is explicitly *downstream* from the canonical BIM. The inverse
 * direction (Pascal → BIM) should only be used for ad-hoc migrations.
 *
 * IMPORTANT: This module is the *only* place Pascal node types should be
 * constructed inside the pipeline. Do not let Pascal shapes leak back into
 * the extractor / validator stages.
 */

import type { CanonicalBim } from "../../shared/bim/canonical-schema.js";
import {
  CURRENT_SCENE_SCHEMA_VERSION,
  type BuildingNode,
  type DoorNode,
  type ItemNode,
  type LevelNode,
  type SceneData,
  type SiteNode,
  type WallNode,
  type WindowNode,
  type ZoneNode,
} from "../../shared/pascal-scene.js";

const defaultTransform = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
} as const;

const zoneDefaultColors: Record<ZoneNode["zoneType"], string> = {
  room: "#4A90D9",
  hallway: "#B0B0B0",
  bathroom: "#5DADE2",
  kitchen: "#F4D03F",
  bedroom: "#82E0AA",
  living: "#AF7AC5",
  garage: "#AAB7B8",
  utility: "#F0B27A",
  other: "#D5DBDB",
};

function uuid(): string {
  return crypto.randomUUID();
}

function mapRoomType(roomType: string): ZoneNode["zoneType"] {
  switch (roomType) {
    case "hallway":
    case "bathroom":
    case "kitchen":
    case "bedroom":
    case "living":
    case "garage":
    case "utility":
    case "other":
    case "room":
      return roomType;
    // Pascal zone enum is narrower than the BIM one — collapse missing kinds.
    case "dining":
    case "office":
      return "room";
    case "closet":
      return "utility";
    case "stairwell":
      return "hallway";
    default:
      return "room";
  }
}

function mapItemType(kind: "furniture" | "fixture"): ItemNode["itemType"] {
  return kind === "fixture" ? "fixture" : "furniture";
}

/**
 * Build a Pascal SceneData graph from a canonical BIM model.
 *
 * The returned SceneData is suitable for persistence in the legacy
 * `scene_data` column and for loading into the existing FloorplanEditor
 * without modification.
 */
export function canonicalBimToPascalScene(bim: CanonicalBim): SceneData {
  const nodes: SceneData["nodes"] = {};

  const site: SiteNode = {
    id: uuid(),
    parentId: null,
    childIds: [],
    name: "Site",
    visible: true,
    locked: false,
    type: "site",
    transform: { ...defaultTransform },
  };

  const building: BuildingNode = {
    id: uuid(),
    parentId: site.id,
    childIds: [],
    name: "Building 1",
    visible: true,
    locked: false,
    type: "building",
    transform: { ...defaultTransform },
  };

  site.childIds = [building.id];
  nodes[site.id] = site;
  nodes[building.id] = building;

  // Map BIM level id → Pascal level node id so downstream elements can
  // resolve their parent.
  const pascalLevelIdByBimLevelId = new Map<string, string>();

  for (const bimLevel of bim.levels) {
    const levelNode: LevelNode = {
      id: uuid(),
      parentId: building.id,
      childIds: [],
      name: bimLevel.name ?? `Level ${bimLevel.index}`,
      visible: true,
      locked: false,
      type: "level",
      elevation: bimLevel.elevation,
      height: bimLevel.height,
      index: bimLevel.index,
      transform: { ...defaultTransform },
    };
    building.childIds.push(levelNode.id);
    nodes[levelNode.id] = levelNode;
    pascalLevelIdByBimLevelId.set(bimLevel.id, levelNode.id);
  }

  if (building.childIds.length === 0) {
    // BIM had no levels (shouldn't happen after validate) — add a default.
    const fallbackLevel: LevelNode = {
      id: uuid(),
      parentId: building.id,
      childIds: [],
      name: "Ground Floor",
      visible: true,
      locked: false,
      type: "level",
      elevation: 0,
      height: 2.7,
      index: 0,
      transform: { ...defaultTransform },
    };
    building.childIds.push(fallbackLevel.id);
    nodes[fallbackLevel.id] = fallbackLevel;
    for (const lvl of bim.levels) {
      pascalLevelIdByBimLevelId.set(lvl.id, fallbackLevel.id);
    }
    if (bim.levels.length === 0) {
      // Nothing in the BIM — just keep the fallback in the map under a
      // synthetic id so we can still resolve orphan elements.
      pascalLevelIdByBimLevelId.set("__fallback__", fallbackLevel.id);
    }
  }

  const fallbackLevelId =
    pascalLevelIdByBimLevelId.get("__fallback__") ??
    building.childIds[0] ??
    (() => {
      const lvl: LevelNode = {
        id: uuid(),
        parentId: building.id,
        childIds: [],
        name: "Ground Floor",
        visible: true,
        locked: false,
        type: "level",
        elevation: 0,
        height: 2.7,
        index: 0,
        transform: { ...defaultTransform },
      };
      building.childIds.push(lvl.id);
      nodes[lvl.id] = lvl;
      return lvl.id;
    })();

  const resolveLevel = (bimLevelId?: string): string => {
    if (bimLevelId) {
      const pid = pascalLevelIdByBimLevelId.get(bimLevelId);
      if (pid) return pid;
    }
    return fallbackLevelId;
  };

  // Walls — keep a BIM-id → Pascal-id map so openings can attach.
  const pascalWallIdByBimWallId = new Map<string, string>();
  for (const wall of bim.walls) {
    const levelPascalId = resolveLevel(wall.levelId);
    const wallNode: WallNode = {
      id: uuid(),
      parentId: levelPascalId,
      childIds: [],
      name: wall.name ?? `wall`,
      visible: true,
      locked: false,
      type: "wall",
      start: { x: wall.start.x, y: 0, z: wall.start.z },
      end: { x: wall.end.x, y: 0, z: wall.end.z },
      height: wall.height,
      thickness: wall.thickness,
      material: "plaster",
      transform: { ...defaultTransform },
    };
    nodes[wallNode.id] = wallNode;
    (nodes[levelPascalId] as LevelNode).childIds.push(wallNode.id);
    pascalWallIdByBimWallId.set(wall.id, wallNode.id);
  }

  // Doors
  for (const door of bim.doors) {
    const hostPascalId = pascalWallIdByBimWallId.get(door.hostWallId);
    if (!hostPascalId) continue;
    const pascalDoorFamily = ((): DoorNode["doorType"] => {
      switch (door.family) {
        case "double":
        case "sliding":
        case "french":
        case "bifold":
          return door.family;
        default:
          return "single"; // pocket/garage collapse to single for Pascal.
      }
    })();
    const doorNode: DoorNode = {
      id: uuid(),
      parentId: hostPascalId,
      childIds: [],
      name: door.name ?? "door",
      visible: true,
      locked: false,
      type: "door",
      wallId: hostPascalId,
      position: door.position,
      width: door.width,
      height: door.height,
      doorType: pascalDoorFamily,
      swing: door.swing,
      transform: { ...defaultTransform },
    };
    nodes[doorNode.id] = doorNode;
    (nodes[hostPascalId] as WallNode).childIds.push(doorNode.id);
  }

  // Windows
  for (const win of bim.windows) {
    const hostPascalId = pascalWallIdByBimWallId.get(win.hostWallId);
    if (!hostPascalId) continue;
    const pascalWindowFamily = ((): WindowNode["windowType"] => {
      switch (win.family) {
        case "fixed":
        case "casement":
        case "sash":
        case "sliding":
        case "bay":
        case "skylight":
          return win.family;
        case "awning":
        case "picture":
          return "casement";
        default:
          return "casement";
      }
    })();
    const winNode: WindowNode = {
      id: uuid(),
      parentId: hostPascalId,
      childIds: [],
      name: win.name ?? "window",
      visible: true,
      locked: false,
      type: "window",
      wallId: hostPascalId,
      position: win.position,
      width: win.width,
      height: win.height,
      sillHeight: win.sillHeight,
      windowType: pascalWindowFamily,
      transform: { ...defaultTransform },
    };
    nodes[winNode.id] = winNode;
    (nodes[hostPascalId] as WallNode).childIds.push(winNode.id);
  }

  // Rooms / zones
  for (const room of bim.rooms) {
    const levelPascalId = resolveLevel(room.levelId);
    const zoneType = mapRoomType(room.roomType);
    const zoneNode: ZoneNode = {
      id: uuid(),
      parentId: levelPascalId,
      childIds: [],
      name: room.label || room.name || "Room",
      visible: true,
      locked: false,
      type: "zone",
      zoneType,
      label: room.label || room.name || "",
      color: room.color ?? zoneDefaultColors[zoneType],
      points: room.outline.map((p) => ({ x: p.x, y: 0, z: p.z })),
      transform: { ...defaultTransform },
    };
    nodes[zoneNode.id] = zoneNode;
    (nodes[levelPascalId] as LevelNode).childIds.push(zoneNode.id);
  }

  // Furniture & fixtures — mapped to Pascal "item" nodes.
  const placedItems = [
    ...bim.furniture.map((f) => ({ bim: f, kind: "furniture" as const })),
    ...bim.fixtures.map((f) => ({ bim: f, kind: "fixture" as const })),
  ];

  for (const { bim: item, kind } of placedItems) {
    const levelPascalId = resolveLevel(item.levelId);
    const itemNode: ItemNode = {
      id: uuid(),
      parentId: levelPascalId,
      childIds: [],
      name: item.name ?? kind,
      visible: true,
      locked: false,
      type: "item",
      itemType: mapItemType(kind),
      catalogId: item.asset.catalogId,
      dimensions: item.asset.dimensions,
      material: "wood",
      modelUrl: item.asset.glbUrl,
      materialSlots: [],
      assetQualityTier: "placeholder",
      assetStyleTier: "realistic",
      transform: {
        position: item.position,
        rotation: { x: 0, y: item.rotationY, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
    };
    nodes[itemNode.id] = itemNode;
    (nodes[levelPascalId] as LevelNode).childIds.push(itemNode.id);
  }

  return {
    schemaVersion: CURRENT_SCENE_SCHEMA_VERSION,
    nodes,
    rootNodeIds: [site.id],
  };
}
