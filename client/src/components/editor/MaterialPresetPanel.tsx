import { useMemo } from "react";
import { Palette } from "lucide-react";
import { useViewer } from "@/stores/use-viewer";
import { useBimScene } from "@/stores/use-bim-scene";
import {
  MATERIAL_LIBRARY,
  findMaterialDefinition,
  findMaterialVariant,
  type MaterialDefinition,
  type MaterialSurfaceCategory,
} from "@shared/material-library";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

type BimElementKind = "wall" | "door" | "window" | "slab" | "ceiling" | "roof" | "stair" | "column";

/** Map a BIM element kind to the material surface category used for filtering. */
function kindToCategory(kind: BimElementKind): MaterialSurfaceCategory | null {
  switch (kind) {
    case "wall":    return "wall";
    case "slab":    return "slab";
    case "ceiling": return "ceiling";
    case "roof":    return "roof";
    case "door":
    case "window":
    case "stair":
    case "column":  return "item";
    default:        return null;
  }
}

function kindLabel(kind: BimElementKind): string {
  switch (kind) {
    case "wall":    return "walls";
    case "slab":    return "floors";
    case "ceiling": return "ceilings";
    case "roof":    return "roofs";
    case "door":    return "doors";
    case "window":  return "windows";
    case "stair":   return "stairs";
    case "column":  return "columns";
    default:        return kind;
  }
}

/** Resolve a selected BIM element by ID and return its kind + materialId. */
function findBimElement(
  bim: ReturnType<typeof useBimScene.getState>["bim"],
  id: string,
): { kind: BimElementKind; materialId?: string } | null {
  for (const w of bim.walls)    if (w.id === id) return { kind: "wall",    materialId: w.materialId };
  for (const d of bim.doors)    if (d.id === id) return { kind: "door",    materialId: d.materialId };
  for (const w of bim.windows)  if (w.id === id) return { kind: "window",  materialId: w.materialId };
  for (const s of bim.slabs)    if (s.id === id) return { kind: "slab",    materialId: s.materialId };
  for (const c of bim.ceilings) if (c.id === id) return { kind: "ceiling", materialId: c.materialId };
  for (const r of bim.roofs)    if (r.id === id) return { kind: "roof",    materialId: r.materialId };
  for (const s of bim.stairs)   if (s.id === id) return { kind: "stair",   materialId: s.materialId };
  for (const c of bim.columns)  if (c.id === id) return { kind: "column",  materialId: c.materialId };
  return null;
}

// ─────────────────────────────────────────────────────────────
// Material swatch
// ─────────────────────────────────────────────────────────────

function MaterialSwatch({
  definition,
  isActive,
  onClick,
}: {
  definition: MaterialDefinition;
  isActive: boolean;
  onClick: () => void;
}) {
  const defaultVariant = findMaterialVariant(definition.id, definition.defaultVariantId);
  const color = defaultVariant?.color ?? "#888";

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left transition-all ${
        isActive
          ? "bg-amber-500/20 border border-amber-500/40"
          : "bg-black/20 border border-transparent hover:bg-white/5 hover:border-white/10"
      }`}
    >
      <div
        className="w-5 h-5 rounded-sm border border-white/15 flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0">
        <div className={`text-[11px] truncate ${isActive ? "text-amber-200" : "text-white/70"}`}>
          {definition.label}
        </div>
        <div className="text-[9px] text-white/35 capitalize">
          {definition.wearStyle} / {definition.costTier}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Variant picker (appears when a material is selected)
// ─────────────────────────────────────────────────────────────

function VariantRow({
  definition,
  currentVariantId,
  onSelectVariant,
}: {
  definition: MaterialDefinition;
  currentVariantId: string | undefined;
  onSelectVariant: (variantId: string) => void;
}) {
  const activeVariant = currentVariantId ?? definition.defaultVariantId;

  return (
    <div className="flex gap-1 mt-1">
      {definition.variants.map((v) => (
        <button
          key={v.id}
          onClick={() => onSelectVariant(v.id)}
          className={`w-6 h-6 rounded-sm border transition-all ${
            v.id === activeVariant
              ? "border-amber-400 ring-1 ring-amber-400/40"
              : "border-white/15 hover:border-white/30"
          }`}
          style={{ backgroundColor: v.color }}
          title={v.label}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main panel
// ─────────────────────────────────────────────────────────────

export function MaterialPresetPanel() {
  const selectedIds = useViewer((s) => s.selectedIds);
  const bim = useBimScene((s) => s.bim);
  const setElementMaterial = useBimScene((s) => s.setElementMaterial);
  const setAllMaterialsByKind = useBimScene((s) => s.setAllMaterialsByKind);

  // Resolve the first selected element
  const selectedElement = useMemo(() => {
    if (selectedIds.length === 0) return null;
    return findBimElement(bim, selectedIds[0]);
  }, [selectedIds, bim]);

  // Determine which category of materials to show
  const category = selectedElement ? kindToCategory(selectedElement.kind) : null;

  // Group materials by category for display
  const materialsByCategory = useMemo(() => {
    const groups = new Map<MaterialSurfaceCategory, MaterialDefinition[]>();
    for (const def of MATERIAL_LIBRARY) {
      const existing = groups.get(def.category) ?? [];
      existing.push(def);
      groups.set(def.category, existing);
    }
    return groups;
  }, []);

  // Filtered materials when an element is selected
  const filteredMaterials = useMemo(() => {
    if (!category) return null;
    // Include glass for any surface type, plus matching category
    return MATERIAL_LIBRARY.filter(
      (d) => d.category === category || d.category === "glass",
    );
  }, [category]);

  const handleSelectMaterial = (materialId: string) => {
    if (selectedIds.length === 0) return;
    setElementMaterial(selectedIds[0], materialId);
  };

  const handleApplyToAll = (materialId: string) => {
    if (!selectedElement) return;
    setAllMaterialsByKind(selectedElement.kind, materialId);
  };

  // ── No selection ───────────────────────────────────────────
  if (!selectedElement) {
    return (
      <div className="bg-[#111] rounded-2xl border border-white/5 p-3">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">
            Materials
          </span>
        </div>
        <p className="text-[11px] text-white/30 text-center py-4">
          Select an element to change its material
        </p>

        {/* Browse all materials */}
        <div className="space-y-3 mt-2 max-h-72 overflow-y-auto">
          {Array.from(materialsByCategory.entries()).map(([cat, defs]) => (
            <div key={cat}>
              <h5 className="text-[10px] uppercase tracking-wider text-white/30 mb-1 capitalize">
                {cat}
              </h5>
              <div className="space-y-0.5">
                {defs.map((d) => (
                  <MaterialSwatch key={d.id} definition={d} isActive={false} onClick={() => {}} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Element selected ───────────────────────────────────────
  const currentMaterialDef = findMaterialDefinition(selectedElement.materialId);

  return (
    <div className="bg-[#111] rounded-2xl border border-white/5 p-3">
      <div className="flex items-center gap-2 mb-3">
        <Palette className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-semibold text-white uppercase tracking-wider">
          Materials
        </span>
      </div>

      {/* Current material */}
      <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 mb-3">
        <h5 className="text-[10px] uppercase tracking-wider text-white/35 mb-1">
          Current ({selectedElement.kind})
        </h5>
        <div className="flex items-center gap-2">
          {currentMaterialDef ? (
            <>
              <div
                className="w-6 h-6 rounded-sm border border-white/15"
                style={{
                  backgroundColor:
                    findMaterialVariant(currentMaterialDef.id, currentMaterialDef.defaultVariantId)
                      ?.color ?? "#888",
                }}
              />
              <span className="text-[11px] text-white/70">{currentMaterialDef.label}</span>
            </>
          ) : (
            <span className="text-[11px] text-white/40 italic">Default material</span>
          )}
        </div>
      </div>

      {/* Available materials for this element category */}
      <div className="space-y-0.5 max-h-48 overflow-y-auto">
        {(filteredMaterials ?? []).map((def) => {
          const isActive = selectedElement.materialId === def.id;
          return (
            <div key={def.id}>
              <MaterialSwatch
                definition={def}
                isActive={isActive}
                onClick={() => handleSelectMaterial(def.id)}
              />
              {isActive && (
                <VariantRow
                  definition={def}
                  currentVariantId={undefined}
                  onSelectVariant={() => {
                    // Variant selection is cosmetic in this context; the materialId
                    // already identifies the definition, and the renderer picks the
                    // variant from the definition's defaultVariantId.
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Apply to all button */}
      {selectedElement.materialId && (
        <button
          onClick={() => handleApplyToAll(selectedElement.materialId!)}
          className="w-full mt-3 px-3 py-1.5 rounded-md bg-amber-500/15 border border-amber-500/25 text-[11px] text-amber-300 hover:bg-amber-500/25 transition-all"
        >
          Apply to all {kindLabel(selectedElement.kind)}
        </button>
      )}
    </div>
  );
}
