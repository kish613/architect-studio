export type LayerId = "walls" | "doors" | "windows" | "furn" | "soft" | "light" | "dims" | "grid";

export const WORKSPACE_LAYERS: Array<{ id: LayerId; name: string; swatch: string; kinds: string[] }> = [
  { id: "walls",   name: "Walls & Structure", swatch: "#F97316",   kinds: ["wall", "slab", "roof"] },
  { id: "doors",   name: "Doors & Openings",  swatch: "#00AEEF",   kinds: ["door"] },
  { id: "windows", name: "Windows & Glazing", swatch: "#06B6D4",   kinds: ["window"] },
  { id: "furn",    name: "Furniture",         swatch: "#B58C5F",   kinds: ["item"] },
  { id: "soft",    name: "Soft Furnishings",  swatch: "#7A6957",   kinds: ["zone"] },
  { id: "light",   name: "Lighting",          swatch: "#FDE68A",   kinds: ["light"] },
  { id: "dims",    name: "Dimensions",        swatch: "#ffffff33", kinds: [] },
  { id: "grid",    name: "Grid & Guides",     swatch: "#ffffff22", kinds: [] },
];

export function countLayers(
  nodes: Record<string, { kind?: string } | undefined | null> | undefined | null,
): Record<LayerId, number> {
  const result = Object.fromEntries(WORKSPACE_LAYERS.map(l => [l.id, 0])) as Record<LayerId, number>;
  if (!nodes) return result;
  for (const node of Object.values(nodes)) {
    if (!node?.kind) continue;
    for (const layer of WORKSPACE_LAYERS) {
      if (layer.kinds.includes(node.kind)) {
        result[layer.id]++;
        break;
      }
    }
  }
  return result;
}
