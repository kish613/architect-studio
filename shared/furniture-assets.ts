import type {
  AssetProvenance,
  BimReference,
  CatalogMaterialSlot,
} from "./material-library.js";

export type FurnitureAssetCategory =
  | "living"
  | "bedroom"
  | "kitchen"
  | "bathroom"
  | "office"
  | "utility"
  | "decor"
  | "outdoor"
  | "garage";

export type FurnitureAssetQualityTier = "placeholder" | "draft" | "production";
export type FurnitureAssetStyleTier = "realistic" | "stylized";

export interface FurnitureAssetOrigin {
  x: number;
  y: number;
  z: number;
}

export interface FurnitureAssetManifestEntry {
  id: string;
  name: string;
  category: FurnitureAssetCategory;
  modelUrl: string;
  previewUrl: string | null;
  dimensions: { x: number; y: number; z: number };
  bounds: { x: number; y: number; z: number };
  origin: FurnitureAssetOrigin;
  qualityTier: FurnitureAssetQualityTier;
  styleTier: FurnitureAssetStyleTier;
  materialSlots: CatalogMaterialSlot[];
  provenance: AssetProvenance;
  bimRef?: BimReference;
  performanceBudgetKb: number;
  keywords: string[];
}

export function getDefaultFurniturePreviewUrl(id: string): string {
  return `/assets/furniture/previews/${id}.png`;
}
