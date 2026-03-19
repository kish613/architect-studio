import { useState } from "react";
import { FURNITURE_CATALOG, type CatalogItem } from "@/lib/pascal/furniture-catalog";
import { useScene } from "@/stores/use-scene";
import { useViewer } from "@/stores/use-viewer";
import { createNode } from "@/lib/pascal/schemas";
import { Package } from "lucide-react";

const CATEGORIES = ["all", "living", "bedroom", "kitchen", "bathroom", "office", "utility", "decor", "outdoor", "garage"] as const;

export function FurnitureCatalogPanel() {
  const [category, setCategory] = useState<string>("all");
  const addNode = useScene((s) => s.addNode);
  const activeLevelId = useViewer((s) => s.activeLevelId);

  const filtered = category === "all"
    ? FURNITURE_CATALOG
    : FURNITURE_CATALOG.filter((item) => item.category === category);

  const placeItem = (catalogItem: CatalogItem) => {
    const itemNode = createNode("item", {
      name: catalogItem.name,
      parentId: activeLevelId ?? undefined,
      itemType: "furniture",
      catalogId: catalogItem.id,
      modelUrl: catalogItem.modelUrl,
      dimensions: catalogItem.dimensions,
      transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    });
    addNode(itemNode);
  };

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
            onClick={() => placeItem(item)}
            className="flex flex-col items-center p-2 rounded-lg bg-black/20 border border-white/5 hover:bg-white/10 hover:border-amber-500/30 transition-all group"
          >
            <div className="w-full aspect-square bg-black/30 rounded-md mb-1.5 flex items-center justify-center text-white/20 group-hover:text-amber-400 transition-colors">
              <Package className="w-6 h-6" />
            </div>
            <span className="text-[10px] text-white/60 group-hover:text-white text-center leading-tight">
              {item.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
