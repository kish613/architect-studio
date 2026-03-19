import type { ItemNode } from "@/lib/pascal/schemas";

export function getItemQualityWarnings(item: ItemNode): string[] {
  const warnings: string[] = [];

  if (!item.modelUrl) {
    warnings.push("This item is still using fallback box geometry.");
  }

  if (item.modelUrl && !item.catalogId) {
    warnings.push("Imported model dimensions should be reviewed after normalization.");
  }

  if (item.material === "glass" && item.itemType !== "light") {
    warnings.push("Glass finishes render best with physically based materials on imported GLBs.");
  }

  return warnings;
}
