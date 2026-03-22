/**
 * Pascal Bridge
 *
 * Converts our app's scene node format (shared/pascal-scene.ts) into
 * Pascal's own node format (@pascal-app/core schema) so that the
 * Pascal <Viewer> component can render our scenes.
 *
 * Key differences handled:
 * - IDs: ours use UUIDs, Pascal uses `{type}_{nanoid}` prefixes
 * - Children: ours use `childIds`, Pascal uses `children`
 * - Wall coords: ours use `{x, y, z}` objects, Pascal uses `[x, z]` tuples
 * - Door/Window position: ours use 0-1 t-value, Pascal uses `[x,y,z]` world position
 * - Polygons (zone, ceiling, slab): ours use `{x, y, z}[]`, Pascal uses `[x, z][]`
 * - Pascal has `object: "node"` and `metadata` fields we don't use
 */

import type { AnyNode as OurAnyNode, SceneData as OurSceneData } from "@/lib/pascal/schemas";
import type { AnyNode as PascalAnyNode, AnyNodeId } from "@pascal-app/core";
import { useScene as pascalUseScene } from "@pascal-app/core";

// Re-export Pascal's useScene directly so consumers can use it
export { useScene as pascalUseScene } from "@pascal-app/core";

// ---------- ID mapping ----------

// We maintain a bidirectional map between our UUIDs and Pascal-prefixed IDs
// so that we can translate back when saving to our DB format.
const ourToPascalId = new Map<string, string>();
const pascalToOurId = new Map<string, string>();

function toPascalId(ourId: string, type: string): string {
  const existing = ourToPascalId.get(ourId);
  if (existing) return existing;

  // Create a Pascal-style prefixed ID using our UUID (stripped of dashes for compactness)
  const suffix = ourId.replace(/-/g, "").slice(0, 16);
  const pascalId = `${type}_${suffix}`;
  ourToPascalId.set(ourId, pascalId);
  pascalToOurId.set(pascalId, ourId);
  return pascalId;
}

export function getOurIdFromPascal(pascalId: string): string | undefined {
  return pascalToOurId.get(pascalId);
}

export function getPascalIdFromOur(ourId: string): string | undefined {
  return ourToPascalId.get(ourId);
}

export function clearIdMappings(): void {
  ourToPascalId.clear();
  pascalToOurId.clear();
}

// ---------- Node conversion ----------

/**
 * Convert a single node from our format to Pascal's format.
 * Returns a plain object compatible with Pascal's AnyNode discriminated union.
 */
export function convertOurNodeToPascal(
  node: OurAnyNode,
  allNodes: Record<string, OurAnyNode>,
): PascalAnyNode {
  const pascalId = toPascalId(node.id, node.type);
  const parentPascalId = node.parentId ? toPascalId(node.parentId, allNodes[node.parentId]?.type ?? "node") : null;

  // Base fields shared by all Pascal nodes
  const base = {
    object: "node" as const,
    id: pascalId,
    type: node.type,
    name: node.name,
    parentId: parentPascalId,
    visible: node.visible ?? true,
    metadata: {},
  };

  switch (node.type) {
    case "site": {
      const children = node.childIds
        .map((cid) => allNodes[cid])
        .filter(Boolean)
        .map((child) => toPascalId(child.id, child.type));
      return {
        ...base,
        type: "site",
        children,
      } as unknown as PascalAnyNode;
    }

    case "building": {
      const children = node.childIds
        .map((cid) => allNodes[cid])
        .filter(Boolean)
        .map((child) => toPascalId(child.id, child.type));
      const pos = node.transform?.position ?? { x: 0, y: 0, z: 0 };
      const rot = node.transform?.rotation ?? { x: 0, y: 0, z: 0 };
      return {
        ...base,
        type: "building",
        children,
        position: [pos.x, pos.y, pos.z] as [number, number, number],
        rotation: [rot.x, rot.y, rot.z] as [number, number, number],
      } as unknown as PascalAnyNode;
    }

    case "level": {
      const children = node.childIds
        .map((cid) => allNodes[cid])
        .filter(Boolean)
        .map((child) => toPascalId(child.id, child.type));
      return {
        ...base,
        type: "level",
        children,
        level: node.index ?? 0,
      } as unknown as PascalAnyNode;
    }

    case "wall": {
      const children = node.childIds
        .map((cid) => allNodes[cid])
        .filter(Boolean)
        .map((child) => toPascalId(child.id, child.type));
      return {
        ...base,
        type: "wall",
        children,
        start: [node.start.x, node.start.z] as [number, number],
        end: [node.end.x, node.end.z] as [number, number],
        thickness: node.thickness,
        height: node.height,
      } as unknown as PascalAnyNode;
    }

    case "door": {
      // Pascal doors store world position as [x,y,z] tuple
      // Our doors store a 0-1 t-value along the wall.
      // We need to compute the world position from the wall.
      const wall = node.wallId ? allNodes[node.wallId] : null;
      let worldPos: [number, number, number] = [0, 0, 0];
      if (wall && wall.type === "wall") {
        const t = node.position ?? 0.5;
        const wx = wall.start.x + (wall.end.x - wall.start.x) * t;
        const wz = wall.start.z + (wall.end.z - wall.start.z) * t;
        worldPos = [wx, 0, wz];
      }
      return {
        ...base,
        type: "door",
        position: worldPos,
        rotation: [0, 0, 0] as [number, number, number],
        wallId: node.wallId ? toPascalId(node.wallId, "wall") : undefined,
        width: node.width,
        height: node.height,
        hingesSide: node.swing ?? "left",
      } as unknown as PascalAnyNode;
    }

    case "window": {
      const wall = node.wallId ? allNodes[node.wallId] : null;
      let worldPos: [number, number, number] = [0, 0, 0];
      if (wall && wall.type === "wall") {
        const t = node.position ?? 0.5;
        const wx = wall.start.x + (wall.end.x - wall.start.x) * t;
        const wz = wall.start.z + (wall.end.z - wall.start.z) * t;
        worldPos = [wx, node.sillHeight ?? 0.9, wz];
      }
      return {
        ...base,
        type: "window",
        position: worldPos,
        rotation: [0, 0, 0] as [number, number, number],
        wallId: node.wallId ? toPascalId(node.wallId, "wall") : undefined,
        width: node.width,
        height: node.height,
      } as unknown as PascalAnyNode;
    }

    case "zone": {
      const polygon = (node.points ?? []).map(
        (p) => [p.x, p.z] as [number, number],
      );
      return {
        ...base,
        type: "zone",
        name: node.name || node.label || "Zone",
        polygon,
        color: node.color ?? "#4A90D9",
      } as unknown as PascalAnyNode;
    }

    case "ceiling": {
      const polygon = (node.points ?? []).map(
        (p) => [p.x, p.z] as [number, number],
      );
      const children = node.childIds
        .map((cid) => allNodes[cid])
        .filter(Boolean)
        .map((child) => toPascalId(child.id, child.type));
      return {
        ...base,
        type: "ceiling",
        children,
        polygon,
        holes: [],
        height: node.height ?? 0.2,
      } as unknown as PascalAnyNode;
    }

    case "slab": {
      const polygon = (node.points ?? []).map(
        (p) => [p.x, p.z] as [number, number],
      );
      return {
        ...base,
        type: "slab",
        polygon,
        holes: [],
        elevation: 0,
      } as unknown as PascalAnyNode;
    }

    case "roof": {
      const pos = node.transform?.position ?? { x: 0, y: 0, z: 0 };
      return {
        ...base,
        type: "roof",
        position: [pos.x, pos.y, pos.z] as [number, number, number],
        rotation: 0,
        children: [],
      } as unknown as PascalAnyNode;
    }

    case "item": {
      const pos = node.transform?.position ?? { x: 0, y: 0, z: 0 };
      const rot = node.transform?.rotation ?? { x: 0, y: 0, z: 0 };
      const scl = node.transform?.scale ?? { x: 1, y: 1, z: 1 };
      const dim = node.dimensions ?? { x: 1, y: 1, z: 1 };
      const children = node.childIds
        .map((cid) => allNodes[cid])
        .filter(Boolean)
        .map((child) => toPascalId(child.id, child.type));
      return {
        ...base,
        type: "item",
        children,
        position: [pos.x, pos.y, pos.z] as [number, number, number],
        rotation: [rot.x, rot.y, rot.z] as [number, number, number],
        scale: [scl.x, scl.y, scl.z] as [number, number, number],
        asset: {
          id: node.catalogId ?? node.id,
          category: node.itemType ?? "furniture",
          name: node.name,
          thumbnail: "",
          src: node.modelUrl ?? "",
          dimensions: [dim.x, dim.y, dim.z] as [number, number, number],
        },
      } as unknown as PascalAnyNode;
    }

    case "scan": {
      const pos = node.transform?.position ?? { x: 0, y: 0, z: 0 };
      const rot = node.transform?.rotation ?? { x: 0, y: 0, z: 0 };
      return {
        ...base,
        type: "scan",
        url: node.imageUrl ?? "",
        position: [pos.x, pos.y, pos.z] as [number, number, number],
        rotation: [rot.x, rot.y, rot.z] as [number, number, number],
        scale: node.width ?? 10,
        opacity: node.opacity ?? 0.5,
      } as unknown as PascalAnyNode;
    }

    case "guide": {
      const pos = node.start ?? { x: 0, y: 0, z: 0 };
      const rot = node.transform?.rotation ?? { x: 0, y: 0, z: 0 };
      return {
        ...base,
        type: "guide",
        url: "",
        position: [pos.x, pos.y, pos.z] as [number, number, number],
        rotation: [rot.x, rot.y, rot.z] as [number, number, number],
        scale: 1,
        opacity: 1,
      } as unknown as PascalAnyNode;
    }

    default: {
      // Fallback: pass through as-is with minimal Pascal shape
      return {
        ...base,
      } as unknown as PascalAnyNode;
    }
  }
}

// ---------- Scene loading ----------

/**
 * Convert an entire scene from our format to Pascal's flat node dictionary,
 * then load it into Pascal's useScene store via `setScene`.
 */
export function loadSceneIntoPascal(sceneData: OurSceneData): void {
  // Clear previous ID mappings
  clearIdMappings();

  const pascalNodes: Record<string, PascalAnyNode> = {};
  const pascalRootIds: string[] = [];

  // First pass: create ID mappings for all nodes
  for (const node of Object.values(sceneData.nodes)) {
    toPascalId(node.id, node.type);
  }

  // Second pass: convert all nodes (now all IDs are mapped)
  for (const node of Object.values(sceneData.nodes)) {
    const pascalNode = convertOurNodeToPascal(node, sceneData.nodes);
    pascalNodes[pascalNode.id] = pascalNode;
  }

  // Map root node IDs
  for (const rootId of sceneData.rootNodeIds) {
    const mapped = ourToPascalId.get(rootId);
    if (mapped) pascalRootIds.push(mapped);
  }

  // Load into Pascal's store
  const store = pascalUseScene.getState();
  store.setScene(
    pascalNodes as Record<AnyNodeId, PascalAnyNode>,
    pascalRootIds as AnyNodeId[],
  );
}
