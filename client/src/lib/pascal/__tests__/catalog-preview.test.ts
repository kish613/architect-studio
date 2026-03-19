import { resolveCatalogPreview } from "../catalog-preview";

const catalogItem = {
  id: "armchair-01",
  name: "Armchair",
  category: "living",
  modelUrl: "/assets/furniture/armchair-01.glb",
  thumbnailUrl: "/assets/furniture/armchair-01.webp",
  dimensions: { x: 0.9, y: 0.85, z: 0.9 },
  keywords: ["armchair"],
} as const;

describe("resolveCatalogPreview", () => {
  it("uses a manifest preview when one exists", () => {
    const preview = resolveCatalogPreview(catalogItem, {
      previewById: { "armchair-01": "/assets/furniture/armchair-01.png" },
      modelById: { "armchair-01": "/assets/furniture/armchair-01.glb" },
    });

    expect(preview.thumbnailUrl).toBe("/assets/furniture/armchair-01.png");
    expect(preview.fallbackLabel).toBe("Armchair");
  });

  it("returns a meaningful fallback when no preview image exists", () => {
    const preview = resolveCatalogPreview(catalogItem, {
      previewById: {},
      modelById: { "armchair-01": "/assets/furniture/armchair-01.glb" },
    });

    expect(preview.thumbnailUrl).toBeNull();
    expect(preview.fallbackLabel).toBe("Armchair");
    expect(preview.badge).toBe("living");
  });
});
