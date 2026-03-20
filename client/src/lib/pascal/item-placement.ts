import { createNode, type ItemNode } from "@/lib/pascal/schemas";
import type { CatalogItem } from "@/lib/pascal/furniture-catalog";

export interface PlacementPoint {
  x: number;
  z: number;
}

export function createCatalogPlacementNode(
  catalogItem: CatalogItem,
  activeLevelId: string | null,
  point: PlacementPoint
): ItemNode {
  if (!activeLevelId) {
    throw new Error(`Cannot place "${catalogItem.name}" without an active level.`);
  }

  return createNode("item", {
    name: catalogItem.name,
    parentId: activeLevelId,
    itemType: "furniture",
    catalogId: catalogItem.id,
    modelUrl: catalogItem.modelUrl,
    dimensions: catalogItem.dimensions,
    finishId: catalogItem.materialSlots[0]?.finishId,
    finishVariantId: catalogItem.materialSlots[0]?.finishVariantId,
    materialSlots: catalogItem.materialSlots,
    assetQualityTier: catalogItem.qualityTier,
    assetStyleTier: catalogItem.styleTier,
    bimRef: catalogItem.bimRef,
    transform: {
      position: { x: point.x, y: 0, z: point.z },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
  } as Partial<ItemNode>);
}
