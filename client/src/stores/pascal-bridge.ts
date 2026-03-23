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
import { useViewer as pascalUseViewer } from "@pascal-app/viewer";

// Re-export Pascal's useScene and sceneRegistry directly so consumers can use it
export { useScene as pascalUseScene, sceneRegistry as pascalSceneRegistry } from "@pascal-app/core";

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
      // Site must have children (building IDs) for the SiteRenderer to traverse the tree,
      // and a polygon so the renderer doesn't early-return.
      const mappedChildIds = node.childIds
        .map((cid) => allNodes[cid])
        .filter(Boolean)
        .map((child) => toPascalId(child.id, child.type));
      // Compute a bounding polygon from all walls in the scene for the site ground plane
      const allWalls = Object.values(allNodes).filter((n) => n.type === "wall");
      const xs = allWalls.flatMap((w) => [w.start?.x ?? 0, w.end?.x ?? 0]);
      const zs = allWalls.flatMap((w) => [w.start?.z ?? 0, w.end?.z ?? 0]);
      const padding = 2;
      const minX = xs.length > 0 ? Math.min(...xs) - padding : -10;
      const maxX = xs.length > 0 ? Math.max(...xs) + padding : 10;
      const minZ = zs.length > 0 ? Math.min(...zs) - padding : -10;
      const maxZ = zs.length > 0 ? Math.max(...zs) + padding : 10;
      return {
        ...base,
        type: "site",
        children: mappedChildIds,
        polygon: {
          points: [
            [minX, minZ],
            [maxX, minZ],
            [maxX, maxZ],
            [minX, maxZ],
          ] as [number, number][],
        },
      } as unknown as PascalAnyNode;
    }

    case "building": {
      const mappedChildIds = node.childIds
        .map((cid) => allNodes[cid])
        .filter(Boolean)
        .map((child) => toPascalId(child.id, child.type));
      // Buildings only accept level children
      const children = mappedChildIds.filter((id) => id.startsWith("level_"));
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
      const mappedChildIds = node.childIds
        .map((cid) => allNodes[cid])
        .filter(Boolean)
        .map((child) => toPascalId(child.id, child.type));
      // Levels only accept these child types; doors/windows attach via wallId,
      // items reference levels via parentId but don't appear in children
      const validLevelChildPrefixes = ["wall_", "zone_", "slab_", "ceiling_", "roof_", "scan_", "guide_"];
      const children = mappedChildIds.filter((id) =>
        validLevelChildPrefixes.some((prefix) => id.startsWith(prefix)),
      );
      return {
        ...base,
        type: "level",
        children,
        level: node.index ?? 0,
      } as unknown as PascalAnyNode;
    }

    case "wall": {
      const mappedChildIds = node.childIds
        .map((cid) => allNodes[cid])
        .filter(Boolean)
        .map((child) => toPascalId(child.id, child.type));
      // Walls only accept item children; doors/windows attach via their own wallId field
      const children = mappedChildIds.filter((id) => id.startsWith("item_"));
      return {
        ...base,
        type: "wall",
        children,
        start: [node.start.x, node.start.z] as [number, number],
        end: [node.end.x, node.end.z] as [number, number],
        thickness: node.thickness,
        height: node.height,
        frontSide: "interior" as const,
        backSide: "exterior" as const,
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

// ---------- Per-mutation syncing ----------

/**
 * Sync a single node from our store into Pascal's store.
 * If Pascal already has this node (by mapped ID), update it; otherwise create it.
 */
export function syncNodeToPascal(
  node: OurAnyNode,
  allNodes: Record<string, OurAnyNode>,
): void {
  const store = pascalUseScene.getState();
  const existingPascalId = ourToPascalId.get(node.id);

  // Ensure parent ID mapping exists before converting this node
  if (node.parentId && allNodes[node.parentId]) {
    const parent = allNodes[node.parentId];
    toPascalId(parent.id, parent.type);
  }

  const pascalNode = convertOurNodeToPascal(node, allNodes);

  if (existingPascalId && store.nodes[existingPascalId as AnyNodeId]) {
    // Node already exists in Pascal — update it
    store.updateNode(existingPascalId as AnyNodeId, pascalNode);
  } else {
    // New node — create it in Pascal
    const parentPascalId = node.parentId
      ? ourToPascalId.get(node.parentId)
      : undefined;
    store.createNode(
      pascalNode,
      parentPascalId as AnyNodeId | undefined,
    );
  }
}

/**
 * Delete a node (by our ID) from Pascal's store.
 */
export function deleteNodeFromPascal(nodeId: string): void {
  const pascalId = ourToPascalId.get(nodeId);
  if (!pascalId) return;

  const store = pascalUseScene.getState();
  if (store.nodes[pascalId as AnyNodeId]) {
    store.deleteNode(pascalId as AnyNodeId);
  }

  // Clean up ID mappings
  ourToPascalId.delete(nodeId);
  pascalToOurId.delete(pascalId);
}

/**
 * Sync a partial update for a node into Pascal's store.
 * Re-converts the full node (with changes applied) so that field
 * format differences (e.g. {x,y,z} vs [x,z] tuples) are handled.
 */
export function syncNodeUpdateToPascal(
  nodeId: string,
  changes: Partial<OurAnyNode>,
  allNodes: Record<string, OurAnyNode>,
): void {
  const pascalId = ourToPascalId.get(nodeId);
  if (!pascalId) return;

  const store = pascalUseScene.getState();
  if (!store.nodes[pascalId as AnyNodeId]) return;

  // The node in allNodes should already have the changes merged by the caller.
  const updatedNode = allNodes[nodeId];
  if (!updatedNode) return;

  const pascalNode = convertOurNodeToPascal(updatedNode, allNodes);
  store.updateNode(pascalId as AnyNodeId, pascalNode);
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

  // Debug: log scene summary before loading
  if (import.meta.env.DEV) {
    const typeCounts: Record<string, number> = {};
    for (const node of Object.values(pascalNodes)) {
      typeCounts[node.type] = (typeCounts[node.type] || 0) + 1;
    }
    console.log("[pascal-bridge] Loading scene into Pascal:", {
      totalNodes: Object.keys(pascalNodes).length,
      rootNodeIds: pascalRootIds,
      typeCounts,
    });
  }

  // Load into Pascal's store
  const store = pascalUseScene.getState();
  store.setScene(
    pascalNodes as Record<AnyNodeId, PascalAnyNode>,
    pascalRootIds as AnyNodeId[],
  );

  // Auto-set active building and level so Pascal's Viewer knows what to render
  const buildingNode = Object.values(pascalNodes).find(n => n.type === "building");
  const levelNode = Object.values(pascalNodes).find(n => n.type === "level");
  if (buildingNode) {
    pascalUseViewer.getState().setSelection({
      buildingId: buildingNode.id as any,
      levelId: levelNode?.id as any ?? null,
    });
  }
}
