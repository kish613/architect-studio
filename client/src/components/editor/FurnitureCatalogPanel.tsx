import { useEffect, useState } from "react";
import { type CatalogItem } from "@/lib/pascal/furniture-catalog";
import { resolveCatalogPreview } from "@/lib/pascal/catalog-preview";
import { useEditor } from "@/stores/use-editor";
import {
  useFurnitureCatalog,
  polyHavenToCatalogItem,
  type CatalogSource,
} from "@/stores/use-furniture-catalog";
import type { PolyHavenModel } from "@/lib/bim/polyhaven-service";
import { Package, Cuboid, Search, Loader2, Globe, HardDrive } from "lucide-react";

const CATEGORIES = [
  "all",
  "living",
  "bedroom",
  "kitchen",
  "bathroom",
  "office",
  "utility",
  "decor",
  "outdoor",
  "garage",
] as const;

const SOURCE_OPTIONS: { value: CatalogSource; label: string; icon: typeof HardDrive }[] = [
  { value: "local", label: "Local", icon: HardDrive },
  { value: "polyhaven", label: "Poly Haven", icon: Globe },
  { value: "all", label: "All", icon: Package },
];

export function FurnitureCatalogPanel() {
  const beginPlacement = useEditor((s) => s.beginPlacement);
  const placingCatalogItem = useEditor((s) => s.placingCatalogItem);

  const source = useFurnitureCatalog((s) => s.source);
  const setSource = useFurnitureCatalog((s) => s.setSource);
  const searchQuery = useFurnitureCatalog((s) => s.searchQuery);
  const setSearchQuery = useFurnitureCatalog((s) => s.setSearchQuery);
  const activeCategory = useFurnitureCatalog((s) => s.activeCategory);
  const setActiveCategory = useFurnitureCatalog((s) => s.setActiveCategory);
  const isLoadingPolyHaven = useFurnitureCatalog((s) => s.isLoadingPolyHaven);
  const polyHavenError = useFurnitureCatalog((s) => s.polyHavenError);
  const loadPolyHavenCatalog = useFurnitureCatalog((s) => s.loadPolyHavenCatalog);
  const getFilteredLocalItems = useFurnitureCatalog((s) => s.getFilteredLocalItems);
  const getFilteredPolyHavenModels = useFurnitureCatalog((s) => s.getFilteredPolyHavenModels);

  // Load Poly Haven models when the panel mounts or when the source changes to include them
  useEffect(() => {
    if (source === "polyhaven" || source === "all") {
      loadPolyHavenCatalog();
    }
  }, [source, loadPolyHavenCatalog]);

  const showLocal = source === "local" || source === "all";
  const showPolyHaven = source === "polyhaven" || source === "all";

  const localItems = showLocal ? getFilteredLocalItems() : [];
  const polyHavenItems = showPolyHaven ? getFilteredPolyHavenModels() : [];

  const handlePlacePolyHaven = (model: PolyHavenModel) => {
    const catalogItem = polyHavenToCatalogItem(model);
    beginPlacement(catalogItem);
  };

  return (
    <div className="bg-[#111] rounded-2xl border border-white/5 p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-semibold text-white uppercase tracking-wider">
          Furniture
        </span>
      </div>

      {/* Source toggle */}
      <div className="flex gap-1 mb-2">
        {SOURCE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              onClick={() => setSource(opt.value)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-all ${
                source === opt.value
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-black/20 text-white/40 border border-transparent hover:bg-white/5"
              }`}
            >
              <Icon className="w-3 h-3" />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Search input */}
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search furniture..."
          className="w-full pl-7 pr-2 py-1.5 rounded-md bg-black/30 border border-white/5 text-[11px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-amber-500/30"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-1 mb-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2 py-1 rounded-md text-[10px] capitalize transition-all ${
              activeCategory === cat
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-black/20 text-white/40 border border-transparent hover:bg-white/5"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {/* Local items */}
        {localItems.map((item) => (
          <button
            key={item.id}
            onClick={() => beginPlacement(item)}
            className={`flex flex-col items-stretch p-2 rounded-lg bg-black/20 border transition-all group text-left ${
              placingCatalogItem?.id === item.id
                ? "border-amber-500/60 bg-amber-500/10"
                : "border-white/5 hover:bg-white/10 hover:border-amber-500/30"
            }`}
          >
            <CatalogPreviewTile item={item} />
            <span className="text-[10px] text-white/70 group-hover:text-white leading-tight mt-1">
              {item.name}
            </span>
          </button>
        ))}

        {/* Poly Haven items */}
        {polyHavenItems.map((model) => {
          const adaptedId = `ph:${model.id}`;
          return (
            <button
              key={adaptedId}
              onClick={() => handlePlacePolyHaven(model)}
              className={`flex flex-col items-stretch p-2 rounded-lg bg-black/20 border transition-all group text-left ${
                placingCatalogItem?.id === adaptedId
                  ? "border-amber-500/60 bg-amber-500/10"
                  : "border-white/5 hover:bg-white/10 hover:border-amber-500/30"
              }`}
            >
              <PolyHavenPreviewTile model={model} />
              <span className="text-[10px] text-white/70 group-hover:text-white leading-tight mt-1">
                {model.name}
              </span>
            </button>
          );
        })}

        {/* Loading state */}
        {showPolyHaven && isLoadingPolyHaven && (
          <div className="col-span-2 flex items-center justify-center py-4 gap-2">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            <span className="text-[10px] text-white/40">
              Loading Poly Haven models...
            </span>
          </div>
        )}

        {/* Error state */}
        {showPolyHaven && polyHavenError && !isLoadingPolyHaven && (
          <div className="col-span-2 text-center py-3">
            <span className="text-[10px] text-red-400/60">{polyHavenError}</span>
          </div>
        )}

        {/* Empty state */}
        {localItems.length === 0 &&
          polyHavenItems.length === 0 &&
          !isLoadingPolyHaven && (
            <div className="col-span-2 text-center py-4">
              <span className="text-[10px] text-white/30">
                No items match your filters
              </span>
            </div>
          )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Local catalog tile (unchanged logic)
// ─────────────────────────────────────────────────────────────

function CatalogPreviewTile({ item }: { item: CatalogItem }) {
  const preview = resolveCatalogPreview(item);

  if (preview.thumbnailUrl) {
    return (
      <div className="w-full aspect-square bg-black/30 rounded-md mb-1.5 overflow-hidden relative">
        <img
          src={preview.thumbnailUrl}
          alt={item.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full bg-black/60 text-white/80 backdrop-blur-sm uppercase">
          {preview.badge}
        </div>
      </div>
    );
  }

  const accentClass = {
    living: "from-amber-500/30 to-orange-500/20",
    bedroom: "from-sky-500/30 to-indigo-500/20",
    kitchen: "from-emerald-500/30 to-teal-500/20",
    bathroom: "from-cyan-500/30 to-blue-500/20",
    office: "from-fuchsia-500/30 to-violet-500/20",
    utility: "from-stone-500/30 to-zinc-500/20",
    decor: "from-rose-500/30 to-pink-500/20",
    outdoor: "from-lime-500/30 to-green-500/20",
    garage: "from-slate-500/30 to-gray-500/20",
  }[preview.badge];

  return (
    <div
      className={`w-full aspect-square rounded-md mb-1.5 bg-gradient-to-br ${accentClass} border border-white/10 relative overflow-hidden`}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
        <Cuboid className="w-8 h-8 text-white/80 mb-1" />
        <span className="text-[10px] leading-tight text-white/90 font-medium">
          {preview.fallbackLabel}
        </span>
        <span className="text-[9px] text-white/50 mt-1">{preview.sublabel}</span>
      </div>
      <div className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full bg-black/35 text-white/70 uppercase tracking-wide">
        {preview.badge}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Poly Haven tile
// ─────────────────────────────────────────────────────────────

function PolyHavenPreviewTile({ model }: { model: PolyHavenModel }) {
  const [imgError, setImgError] = useState(false);

  if (!imgError && model.thumbnailUrl) {
    return (
      <div className="w-full aspect-square bg-black/30 rounded-md mb-1.5 overflow-hidden relative">
        <img
          src={model.thumbnailUrl}
          alt={model.name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
        <div className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-900/70 text-emerald-300 backdrop-blur-sm uppercase">
          polyhaven
        </div>
      </div>
    );
  }

  return (
    <div className="w-full aspect-square rounded-md mb-1.5 bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border border-white/10 relative overflow-hidden">
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
        <Globe className="w-8 h-8 text-white/80 mb-1" />
        <span className="text-[10px] leading-tight text-white/90 font-medium">
          {model.name}
        </span>
        <span className="text-[9px] text-white/50 mt-1">CC0</span>
      </div>
      <div className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-900/70 text-emerald-300 uppercase tracking-wide">
        polyhaven
      </div>
    </div>
  );
}
