import { createEmptyScene, createNode } from "@/lib/pascal/schemas";
import { deriveSceneContext } from "../scene-context";

describe("deriveSceneContext", () => {
  it("uses the first building and level in the loaded scene", () => {
    const scene = createEmptyScene();

    const context = deriveSceneContext(scene);

    const siteId = scene.rootNodeIds[0];
    const buildingId = scene.nodes[siteId].childIds[0];
    const levelId = scene.nodes[buildingId].childIds[0];

    expect(context.activeBuildingId).toBe(buildingId);
    expect(context.activeLevelId).toBe(levelId);
  });

  it("falls back to nulls when the scene does not contain a level hierarchy", () => {
    const scene = createEmptyScene();
    const siteId = scene.rootNodeIds[0];
    const buildingId = scene.nodes[siteId].childIds[0];

    scene.nodes[siteId].childIds = [];
    scene.nodes[buildingId].parentId = null;

    const context = deriveSceneContext({
      nodes: {
        [siteId]: scene.nodes[siteId],
        [buildingId]: scene.nodes[buildingId],
      },
      rootNodeIds: [siteId],
    });

    expect(context.activeBuildingId).toBeNull();
    expect(context.activeLevelId).toBeNull();
  });
});
