import { createCatalogPlacementNode } from "../item-placement";

const catalogItem = {
  id: "sofa-01",
  name: "Sofa",
  category: "living",
  modelUrl: "/assets/furniture/sofa-01.glb",
  thumbnailUrl: "/assets/furniture/sofa-01.webp",
  dimensions: { x: 2.2, y: 0.85, z: 0.9 },
  keywords: ["sofa"],
} as const;

const activeLevelId = crypto.randomUUID();

describe("createCatalogPlacementNode", () => {
  it("creates an item node on the selected level at the snapped point", () => {
    const node = createCatalogPlacementNode(catalogItem, activeLevelId, { x: 4.5, z: -2 });

    expect(node.type).toBe("item");
    expect(node.parentId).toBe(activeLevelId);
    expect(node.catalogId).toBe("sofa-01");
    expect(node.modelUrl).toBe("/assets/furniture/sofa-01.glb");
    expect(node.transform.position).toEqual({ x: 4.5, y: 0, z: -2 });
    expect(node.dimensions).toEqual({ x: 2.2, y: 0.85, z: 0.9 });
  });

  it("throws when there is no active level", () => {
    expect(() =>
      createCatalogPlacementNode(catalogItem, null, { x: 0, z: 0 })
    ).toThrow(/active level/i);
  });
});
