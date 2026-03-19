import { FURNITURE_CATALOG, type CatalogItem } from "@/lib/pascal/furniture-catalog";

export interface CatalogPreviewManifest {
  previewById: Record<string, string>;
  modelById: Record<string, string>;
}

export interface CatalogPreview {
  thumbnailUrl: string | null;
  fallbackLabel: string;
  badge: CatalogItem["category"];
  sublabel: string;
}

const DEFAULT_MANIFEST: CatalogPreviewManifest = {
  previewById: Object.fromEntries(
    FURNITURE_CATALOG.filter((item) => item.previewUrl).map((item) => [item.id, item.previewUrl as string])
  ),
  modelById: Object.fromEntries(FURNITURE_CATALOG.map((item) => [item.id, item.modelUrl])),
};

export function resolveCatalogPreview(
  item: CatalogItem,
  manifest: CatalogPreviewManifest = DEFAULT_MANIFEST
): CatalogPreview {
  const thumbnailUrl =
    manifest.previewById[item.id] ??
    (manifest === DEFAULT_MANIFEST ? item.previewUrl ?? item.thumbnailUrl ?? null : null);
  const modelUrl = manifest.modelById[item.id] ?? item.modelUrl;

  return {
    thumbnailUrl,
    fallbackLabel: item.name,
    badge: item.category,
    sublabel: modelUrl ? modelUrl.split("/").pop() ?? item.id : item.id,
  };
}
