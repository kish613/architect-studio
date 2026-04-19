export interface MaterialDef {
  id: string;       // production id or workspace fallback
  hex: string;      // display color for chip
  name: string;     // display name
  glass?: boolean;
}

export const WORKSPACE_MATERIALS: readonly MaterialDef[] = [
  { id: "plaster",   hex: "#EDE7D8", name: "Plaster · matte" },
  { id: "wood",      hex: "#B58C5F", name: "Oak · natural" },
  { id: "walnut",    hex: "#4A4038", name: "Walnut · dark" },
  { id: "charcoal",  hex: "#2A2520", name: "Charcoal oak" },
  { id: "limestone", hex: "#F0EAD6", name: "Limestone" },
  { id: "concrete",  hex: "#9CA3A8", name: "Concrete · smooth" },
  { id: "steel",     hex: "#1f2937", name: "Steel · brushed" },
  { id: "glass",     hex: "#00AEEF", name: "Glass · low-iron", glass: true },
  { id: "sage",      hex: "#6B7F62", name: "Sage · painted" },
  { id: "carpet",    hex: "#D9D5CC", name: "Wool carpet" },
  { id: "tile",      hex: "#7a8a94", name: "Tile" },
];

export function findMaterial(id: string | undefined): MaterialDef | undefined {
  if (!id) return undefined;
  return WORKSPACE_MATERIALS.find((m) => m.id === id);
}
