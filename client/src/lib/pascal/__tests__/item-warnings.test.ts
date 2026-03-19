import { createNode } from "@/lib/pascal/schemas";
import { getItemQualityWarnings } from "../item-warnings";

describe("getItemQualityWarnings", () => {
  it("warns when the item is still using fallback geometry", () => {
    const item = createNode("item", {
      name: "Custom Object",
      itemType: "custom",
      modelUrl: undefined,
    });

    expect(getItemQualityWarnings(item)).toContain("This item is still using fallback box geometry.");
  });

  it("is quiet for a catalog-backed item with a model URL", () => {
    const item = createNode("item", {
      name: "Sofa",
      itemType: "furniture",
      catalogId: "sofa-01",
      modelUrl: "/assets/furniture/sofa-01.glb",
      dimensions: { x: 2.2, y: 0.85, z: 0.9 },
    });

    expect(getItemQualityWarnings(item)).toEqual([]);
  });
});
