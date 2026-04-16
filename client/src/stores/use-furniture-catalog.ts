/**
 * Zustand store for managing the unified furniture catalog.
 *
 * Merges the local catalog (always available) with Poly Haven's CC0 3D model
 * library (fetched on-demand).  The UI can filter by source, category, and
 * free-text search.
 */

import { create } from "zustand";
import {
  fetchPolyHavenModels,
  resolvePolyHavenCategory,
  type PolyHavenModel,
} from "@/lib/bim/polyhaven-service";
import {
  FURNITURE_CATALOG,
  type CatalogItem,
} from "@/lib/pascal/furniture-catalog";
import type { FurnitureAssetCategory } from "@shared/furniture-assets";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type CatalogSource = "local" | "polyhaven" | "all";

export interface FurnitureCatalogState {
  source: CatalogSource;
  polyHavenModels: PolyHavenModel[];
  isLoadingPolyHaven: boolean;
  polyHavenError: string | null;
  searchQuery: string;
  activeCategory: string; // "all" | FurnitureAssetCategory

  // ── Actions ──────────────────────────────────────────────
  loadPolyHavenCatalog: () => Promise<void>;
  setSource: (source: CatalogSource) => void;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: string) => void;

  // ── Computed-like selectors ──────────────────────────────
  getFilteredLocalItems: () => CatalogItem[];
  getFilteredPolyHavenModels: () => PolyHavenModel[];
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function matchesSearch(name: string, tags: string[], query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (name.toLowerCase().includes(q)) return true;
  return tags.some((t) => t.toLowerCase().includes(q));
}

function matchesCategory(
  itemCategory: string,
  activeCategory: string,
): boolean {
  if (activeCategory === "all") return true;
  return itemCategory === activeCategory;
}

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

export const useFurnitureCatalog = create<FurnitureCatalogState>()(
  (set, get) => ({
    source: "all",
    polyHavenModels: [],
    isLoadingPolyHaven: false,
    polyHavenError: null,
    searchQuery: "",
    activeCategory: "all",

    loadPolyHavenCatalog: async () => {
      const state = get();
      // Avoid duplicate fetches
      if (state.isLoadingPolyHaven || state.polyHavenModels.length > 0) return;

      set({ isLoadingPolyHaven: true, polyHavenError: null });
      try {
        const models = await fetchPolyHavenModels();
        set({ polyHavenModels: models, isLoadingPolyHaven: false });
      } catch (err) {
        console.warn("[FurnitureCatalog] Poly Haven load failed:", err);
        set({
          isLoadingPolyHaven: false,
          polyHavenError: "Failed to load Poly Haven models",
        });
      }
    },

    setSource: (source) => set({ source }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setActiveCategory: (category) => set({ activeCategory: category }),

    getFilteredLocalItems: () => {
      const { searchQuery, activeCategory } = get();
      return FURNITURE_CATALOG.filter((item) => {
        if (!matchesCategory(item.category, activeCategory)) return false;
        return matchesSearch(item.name, item.keywords ?? [], searchQuery);
      });
    },

    getFilteredPolyHavenModels: () => {
      const { polyHavenModels, searchQuery, activeCategory } = get();
      return polyHavenModels.filter((model) => {
        const modelCategory = resolvePolyHavenCategory(
          model.categories,
          model.tags,
        );
        if (!matchesCategory(modelCategory, activeCategory)) return false;
        return matchesSearch(model.name, model.tags, searchQuery);
      });
    },
  }),
);

// ─────────────────────────────────────────────────────────────
// Adapter: PolyHavenModel -> CatalogItem
// ─────────────────────────────────────────────────────────────

/**
 * Convert a Poly Haven model to a CatalogItem shape so it can be passed
 * directly to `beginPlacement` and `addFurnitureFromCatalog`.
 *
 * Since Poly Haven does not provide exact bounding-box dimensions we use a
 * 1m cube default — the actual model is normalized on load anyway.
 */
export function polyHavenToCatalogItem(model: PolyHavenModel): CatalogItem {
  const category = resolvePolyHavenCategory(
    model.categories,
    model.tags,
  ) as FurnitureAssetCategory;

  return {
    id: `ph:${model.id}`,
    name: model.name,
    category,
    modelUrl: "", // resolved lazily at render time
    previewUrl: model.thumbnailUrl,
    thumbnailUrl: model.thumbnailUrl,
    dimensions: { x: 1, y: 1, z: 1 },
    bounds: { x: 1, y: 1, z: 1 },
    origin: { x: 0.5, y: 0, z: 0.5 },
    qualityTier: "production",
    styleTier: "realistic",
    materialSlots: [],
    provenance: {
      source: "polyhaven",
      license: "CC0",
      url: `https://polyhaven.com/a/${model.id}`,
    },
    bimRef: {
      source: "catalog",
      externalId: model.id,
    },
    performanceBudgetKb: 2000,
    keywords: model.tags,
  };
}
