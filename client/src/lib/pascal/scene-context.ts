import type { SceneData, AnyNode } from "@/lib/pascal/schemas";

export interface SceneContext {
  activeBuildingId: string | null;
  activeLevelId: string | null;
}

function findNodeByType(scene: SceneData, type: AnyNode["type"], parentId?: string | null): AnyNode | null {
  return (
    Object.values(scene.nodes).find((node) =>
      node.type === type && (parentId == null ? true : node.parentId === parentId)
    ) ?? null
  );
}

export function deriveSceneContext(scene: SceneData): SceneContext {
  const site = findNodeByType(scene, "site");
  if (!site) return { activeBuildingId: null, activeLevelId: null };

  const buildingId = site.childIds
    .map((id) => scene.nodes[id])
    .find((node) => node?.type === "building")?.id ?? null;

  if (!buildingId) return { activeBuildingId: null, activeLevelId: null };

  const building = scene.nodes[buildingId];
  const levelId = building.childIds
    .map((id) => scene.nodes[id])
    .find((node) => node?.type === "level")?.id ?? null;

  if (!levelId) return { activeBuildingId: null, activeLevelId: null };

  return { activeBuildingId: buildingId, activeLevelId: levelId };
}
