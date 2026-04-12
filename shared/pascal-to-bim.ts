/**
 * One-way migration: Pascal SceneData → CanonicalBim for legacy floorplans
 * that only have sceneData until the user saves from the BIM editor.
 */

import type { AnyNode, SceneData } from "./pascal-scene.js";
import {
  canonicalBimSchema,
  createEmptyCanonicalBim,
  type CanonicalBim,
  type Ceiling,
  type Column,
  type Door,
  type DoorFamily,
  type Fixture,
  type Furniture,
  type Level,
  type Roof,
  type Room,
  type Slab,
  type Stair,
  type Wall,
  type Window,
  type WindowFamily,
} from "./bim/canonical-schema.js";

function mapDoorFamily(
  t: string): DoorFamily {
  switch (t) {
    case "double":
    case "single":
    case "sliding":
    case "french":
    case "bifold":
      return t;
    default:
      return "single";
  }
}

function mapWindowFamily(t: string): WindowFamily {
  switch (t) {
    case "fixed":
    case "casement":
    case "sash":
    case "sliding":
    case "bay":
    case "skylight":
      return t;
    default:
      return "casement";
  }
}

export function pascalSceneDataToCanonicalBim(scene: SceneData): CanonicalBim {
  const nodes = scene.nodes as Record<string, AnyNode>;
  const empty = createEmptyCanonicalBim({
    sourceType: "manual",
    scaleConfidence: 0.5,
    extractionNotes: ["Imported from legacy Pascal sceneData."],
  });

  const levels: Level[] = [];
  const walls: Wall[] = [];
  const doors: Door[] = [];
  const windows: Window[] = [];
  const slabs: Slab[] = [];
  const ceilings: Ceiling[] = [];
  const roofs: Roof[] = [];
  const rooms: Room[] = [];
  const stairs: Stair[] = [];
  const columns: Column[] = [];
  const furniture: Furniture[] = [];
  const fixtures: Fixture[] = [];

  for (const node of Object.values(nodes)) {
    if (node.type === "level") {
      levels.push({
        id: node.id,
        name: node.name,
        index: node.index ?? 0,
        elevation: node.elevation ?? 0,
        height: node.height ?? 2.7,
        tags: [],
      });
    }
  }

  if (levels.length === 0) {
    levels.push(...empty.levels);
  }

  const levelIds = new Set(levels.map((l) => l.id));

  for (const node of Object.values(nodes)) {
    if (node.type === "wall") {
      const levelId = node.parentId && levelIds.has(node.parentId) ? node.parentId : levels[0]!.id;
      walls.push({
        id: node.id,
        kind: "wall",
        start: { x: node.start.x, z: node.start.z },
        end: { x: node.end.x, z: node.end.z },
        height: node.height ?? 2.7,
        thickness: node.thickness ?? 0.15,
        isExterior: false,
        isLoadBearing: false,
        levelId,
        tags: [],
      });
    }
  }

  for (const node of Object.values(nodes)) {
    if (node.type === "door") {
      const levelId =
        node.parentId && levelIds.has(node.parentId)
          ? node.parentId
          : walls.find((w) => w.id === node.wallId)?.levelId ?? levels[0]!.id;
      doors.push({
        id: node.id,
        kind: "door",
        hostWallId: node.wallId,
        position: node.position ?? 0.5,
        width: node.width ?? 0.9,
        height: node.height ?? 2.1,
        family: mapDoorFamily(node.doorType ?? "single"),
        swing: node.swing ?? "left",
        levelId,
        tags: [],
      });
    }
    if (node.type === "window") {
      const levelId =
        node.parentId && levelIds.has(node.parentId)
          ? node.parentId
          : walls.find((w) => w.id === node.wallId)?.levelId ?? levels[0]!.id;
      windows.push({
        id: node.id,
        kind: "window",
        hostWallId: node.wallId,
        position: node.position ?? 0.5,
        width: node.width ?? 1.2,
        height: node.height ?? 1.2,
        sillHeight: node.sillHeight ?? 0.9,
        family: mapWindowFamily(node.windowType ?? "casement"),
        levelId,
        tags: [],
      });
    }
    if (node.type === "slab") {
      const levelId = node.parentId && levelIds.has(node.parentId) ? node.parentId : levels[0]!.id;
      const outline = (node.points ?? []).map((p) => ({ x: p.x, z: p.z }));
      if (outline.length >= 3) {
        slabs.push({
          id: node.id,
          kind: "slab",
          outline,
          thickness: node.thickness ?? 0.3,
          levelId,
          tags: [],
        });
      }
    }
    if (node.type === "ceiling") {
      const levelId = node.parentId && levelIds.has(node.parentId) ? node.parentId : levels[0]!.id;
      const outline = (node.points ?? []).map((p) => ({ x: p.x, z: p.z }));
      if (outline.length >= 3) {
        ceilings.push({
          id: node.id,
          kind: "ceiling",
          outline,
          thickness: node.height ?? 0.1,
          levelId,
          tags: [],
        });
      }
    }
    if (node.type === "roof") {
      const levelId = node.parentId && levelIds.has(node.parentId) ? node.parentId : undefined;
      const outline = (node.points ?? []).map((p) => ({ x: p.x, z: p.z }));
      if (outline.length >= 3) {
        roofs.push({
          id: node.id,
          kind: "roof",
          outline,
          roofType: node.roofType ?? "gable",
          pitchDeg: node.pitch ?? 35,
          overhang: node.overhang ?? 0.3,
          levelId,
          tags: [],
        });
      }
    }
    if (node.type === "zone") {
      const levelId = node.parentId && levelIds.has(node.parentId) ? node.parentId : levels[0]!.id;
      const outline = (node.points ?? []).map((p) => ({ x: p.x, z: p.z }));
      if (outline.length >= 3) {
        const zt = node.zoneType;
        rooms.push({
          id: node.id,
          kind: "room",
          label: node.label ?? "",
          roomType:
            zt === "hallway" ||
            zt === "bathroom" ||
            zt === "kitchen" ||
            zt === "bedroom" ||
            zt === "living" ||
            zt === "garage" ||
            zt === "utility" ||
            zt === "other" ||
            zt === "room"
              ? zt
              : "room",
          outline,
          color: node.color,
          levelId,
          tags: [],
        });
      }
    }
    if (node.type === "item") {
      const levelId = node.parentId && levelIds.has(node.parentId) ? node.parentId : levels[0]!.id;
      const pos = node.transform?.position ?? { x: 0, y: 0, z: 0 };
      const rotY = node.transform?.rotation?.y ?? 0;
      const catalogId = node.catalogId ?? "sofa-01";
      const asset = {
        catalogId,
        glbUrl: node.modelUrl,
        dimensions: node.dimensions ?? { x: 1, y: 1, z: 1 },
        keywords: [] as string[],
        materialSlots: [],
      };
      if (node.itemType === "fixture" || node.itemType === "appliance") {
        fixtures.push({
          id: node.id,
          kind: "fixture",
          position: { x: pos.x, y: pos.y, z: pos.z },
          rotationY: rotY,
          category: "other",
          asset,
          levelId,
          tags: [],
        });
      } else {
        furniture.push({
          id: node.id,
          kind: "furniture",
          position: { x: pos.x, y: pos.y, z: pos.z },
          rotationY: rotY,
          category: "other",
          asset,
          levelId,
          tags: [],
        });
      }
    }
  }

  return canonicalBimSchema.parse({
    metadata: {
      ...empty.metadata,
      updatedAt: new Date().toISOString(),
      extractionNotes: ["Imported from legacy Pascal sceneData."],
    },
    levels,
    walls,
    doors,
    windows,
    slabs,
    ceilings,
    roofs,
    rooms,
    stairs,
    columns,
    furniture,
    fixtures,
    materials: {},
  });
}
