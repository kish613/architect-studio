import { useState } from "react";
import { FURNITURE_CATALOG, type CatalogItem } from "@/lib/pascal/furniture-catalog";
import { resolveCatalogPreview } from "@/lib/pascal/catalog-preview";
import { useEditor } from "@/stores/use-editor";
import { Package, Cuboid } from "lucide-react";

const CATEGORIES = ["all", "living", "bedroom", "kitchen", "bathroom", "office", "utility", "decor", "outdoor", "garage"] as const;

export function FurnitureCatalogPanel() {
  const [category, setCategory] = useState<string>("all");
  const beginPlacement = useEditor((s) => s.beginPlacement);
  const placingCatalogItem = useEditor((s) => s.placingCatalogItem);

  const filtered = category === "all"
    ? FURNITURE_CATALOG
    : FURNITURE_CATALOG.filter((item) => item.category === category);

  return (
    <div className="bg-[#111] rounded-2xl border border-white/5 p-3">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-semibold text-white uppercase tracking-wider">Furniture</span>
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-2 py-1 rounded-md text-[10px] capitalize transition-all ${
              category === cat
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-black/20 text-white/40 border border-transparent hover:bg-white/5"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {filtered.map((item) => (
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
      </div>
    </div>
  );
}

function CatalogPreviewTile({ item }: { item: CatalogItem }) {
  const preview = resolveCatalogPreview(item);

  if (preview.thumbnailUrl) {
    return (
      <div className="w-full aspect-square bg-black/30 rounded-md mb-1.5 overflow-hidden relative">
        <img src={preview.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" />
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
    <div className={`w-full aspect-square rounded-md mb-1.5 bg-gradient-to-br ${accentClass} border border-white/10 relative overflow-hidden`}>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
        <Cuboid className="w-8 h-8 text-white/80 mb-1" />
        <span className="text-[10px] leading-tight text-white/90 font-medium">{preview.fallbackLabel}</span>
        <span className="text-[9px] text-white/50 mt-1">{preview.sublabel}</span>
      </div>
      <div className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full bg-black/35 text-white/70 uppercase tracking-wide">
        {preview.badge}
      </div>
    </div>
  );
}
