import { createEmptyScene, createNode } from "@/lib/pascal/schemas";
import { buildStylePresetUpdates, ROOM_STYLE_PRESETS } from "../room-style-presets";

describe("room-style-presets", () => {
  it("exposes the curated preset list", () => {
    expect(ROOM_STYLE_PRESETS.map((preset) => preset.id)).toEqual([
      "warm-minimal",
      "contemporary-stone",
      "nordic-oak",
    ]);
  });

  it("builds descendant finish updates for a level", () => {
    const scene = createEmptyScene();
    const siteId = scene.rootNodeIds[0];
    const buildingId = scene.nodes[siteId].childIds[0];
    const levelId = scene.nodes[buildingId].childIds[0];

    const wall = createNode("wall", {
      parentId: levelId,
      start: { x: 0, y: 0, z: 0 },
      end: { x: 4, y: 0, z: 0 },
    });
    const slab = createNode("slab", {
      parentId: levelId,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
        { x: 4, y: 0, z: 4 },
      ],
    });
    const roof = createNode("roof", {
      parentId: levelId,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
        { x: 4, y: 0, z: 4 },
      ],
    });
    const item = createNode("item", {
      parentId: levelId,
      itemType: "furniture",
      transform: {
        position: { x: 1, y: 0, z: 1 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
    });

    scene.nodes[wall.id] = wall;
    scene.nodes[slab.id] = slab;
    scene.nodes[roof.id] = roof;
    scene.nodes[item.id] = item;
    scene.nodes[levelId].childIds.push(wall.id, slab.id, roof.id, item.id);

    const updates = buildStylePresetUpdates(scene, levelId, "warm-minimal");

    expect(updates[levelId]).toMatchObject({ assemblyId: "warm-minimal" });
    expect(updates[wall.id]).toMatchObject({ finishId: "wall-plaster", finishVariantId: "warm" });
    expect(updates[slab.id]).toMatchObject({ finishId: "slab-oak", finishVariantId: "honey" });
    expect(updates[roof.id]).toMatchObject({ finishId: "roof-clay-tile", finishVariantId: "terracotta" });
    expect(updates[item.id]).toMatchObject({ finishId: "item-oak", finishVariantId: "natural" });
  });
});
