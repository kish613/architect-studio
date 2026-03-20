import type { AnyNode, ItemNode, SceneData, WallNode } from "@/lib/pascal/schemas";
import { findAssemblyDefinition, type AssemblyDefinition } from "@shared/material-library";

export interface RoomStylePreset {
  id: "warm-minimal" | "contemporary-stone" | "nordic-oak";
  label: string;
  description: string;
}

export const ROOM_STYLE_PRESETS: RoomStylePreset[] = [
  {
    id: "warm-minimal",
    label: "Warm Minimal",
    description: "Soft plaster walls, honey oak floors, and natural oak furniture.",
  },
  {
    id: "contemporary-stone",
    label: "Contemporary Stone",
    description: "Graphite stone walls, polished concrete, and travertine accents.",
  },
  {
    id: "nordic-oak",
    label: "Nordic Oak",
    description: "Cool plaster, natural oak flooring, and crisp blue-slate roofing.",
  },
];

export type NodeUpdateMap = Record<string, Partial<AnyNode>>;

function collectDescendantIds(sceneData: SceneData, nodeId: string): string[] {
  const queue = [nodeId];
  const visited = new Set<string>();
  const descendants: string[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const current = sceneData.nodes[currentId];
    if (!current || visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);
    descendants.push(currentId);
    queue.push(...current.childIds);
  }

  return descendants;
}

function pointInPolygon(
  point: { x: number; z: number },
  polygon: Array<{ x: number; z: number }>
): boolean {
  if (polygon.length < 3) {
    return false;
  }

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const zi = polygon[i].z;
    const xj = polygon[j].x;
    const zj = polygon[j].z;

    const intersects =
      zi > point.z !== zj > point.z &&
      point.x < ((xj - xi) * (point.z - zi)) / ((zj - zi) || Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function wallMidpoint(wall: WallNode) {
  return {
    x: (wall.start.x + wall.end.x) / 2,
    z: (wall.start.z + wall.end.z) / 2,
  };
}

function itemFloorPoint(item: ItemNode) {
  const position = item.transform?.position ?? { x: 0, y: 0, z: 0 };
  return { x: position.x, z: position.z };
}

function patchNode(node: AnyNode, assembly: AssemblyDefinition, assemblyId: string) {
  switch (node.type) {
    case "wall":
      return { finishId: assembly.wallFinishId, finishVariantId: assembly.wallFinishVariantId, assemblyId };
    case "slab":
      return { finishId: assembly.slabFinishId, finishVariantId: assembly.slabFinishVariantId, assemblyId };
    case "ceiling":
      return { finishId: assembly.ceilingFinishId, finishVariantId: assembly.ceilingFinishVariantId, assemblyId };
    case "roof":
      return { finishId: assembly.roofFinishId, finishVariantId: assembly.roofFinishVariantId, assemblyId };
    case "item":
      return { finishId: assembly.itemFinishId, finishVariantId: assembly.itemFinishVariantId, assemblyId };
    case "level":
    case "zone":
      return { assemblyId };
    default:
      return null;
  }
}

export function buildStylePresetUpdates(
  sceneData: SceneData,
  targetNodeId: string,
  presetId: RoomStylePreset["id"]
): NodeUpdateMap {
  const target = sceneData.nodes[targetNodeId];
  const assembly = findAssemblyDefinition(presetId);
  if (!target || !assembly) {
    return {};
  }

  const updates: NodeUpdateMap = {};

  if (target.type === "level") {
    for (const id of collectDescendantIds(sceneData, target.id)) {
      const node = sceneData.nodes[id];
      if (!node) {
        continue;
      }

      const patch = patchNode(node, assembly, presetId);
      if (patch) {
        updates[id] = patch as Partial<AnyNode>;
      }
    }

    return updates;
  }

  if (target.type === "zone") {
    updates[target.id] = { assemblyId: presetId };
    const polygon = target.points.map((point) => ({ x: point.x, z: point.z }));
    const levelId = target.parentId;

    if (!levelId) {
      return updates;
    }

    for (const node of Object.values(sceneData.nodes)) {
      if (node.parentId !== levelId) {
        continue;
      }

      if (node.type === "item" && pointInPolygon(itemFloorPoint(node), polygon)) {
        updates[node.id] = {
          finishId: assembly.itemFinishId,
          finishVariantId: assembly.itemFinishVariantId,
          assemblyId: presetId,
        };
      }

      if (node.type === "wall" && pointInPolygon(wallMidpoint(node), polygon)) {
        updates[node.id] = {
          finishId: assembly.wallFinishId,
          finishVariantId: assembly.wallFinishVariantId,
          assemblyId: presetId,
        };
      }
    }
  }

  return updates;
}
