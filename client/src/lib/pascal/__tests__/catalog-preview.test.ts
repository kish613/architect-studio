import { resolveCatalogPreview } from "../catalog-preview";

const catalogItem = {
  id: "armchair-01",
  name: "Armchair",
  category: "living",
  modelUrl: "/assets/furniture/armchair-01.glb",
  previewUrl: "/assets/furniture/previews/armchair-01.png",
  thumbnailUrl: "/assets/furniture/armchair-01.webp",
  dimensions: { x: 0.9, y: 0.85, z: 0.9 },
  bounds: { x: 0.92, y: 0.9, z: 0.92 },
  origin: { x: 0.5, y: 0, z: 0.5 },
  qualityTier: "production",
  styleTier: "realistic",
  materialSlots: [{ slotId: "primary", label: "Primary finish", finishId: "item-oak", finishVariantId: "natural" }],
  provenance: { source: "poly-haven", license: "CC0" },
  bimRef: { source: "catalog", externalId: "armchair-01" },
  performanceBudgetKb: 500,
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
