import { useScene } from "@/stores/use-scene";
import { FURNITURE_CATALOG } from "@shared/furniture-catalog";
import { MATERIAL_ASSEMBLIES } from "@shared/material-library";
import type { ZoneNode } from "@shared/pascal-scene";

interface AIAction {
  tool: string;
  args: Record<string, any>;
}

export function executeAIActions(actions: AIAction[]): { applied: number; skipped: number } {
  const { nodes, updateNode, addNode, deleteNode } = useScene.getState();
  let applied = 0;
  let skipped = 0;

  for (const action of actions) {
    try {
      switch (action.tool) {
        case "change_material": {
          const { nodeType, finishId, variantId } = action.args;
          const targets = Object.values(nodes).filter((n) => n.type === nodeType);
          for (const node of targets) {
            updateNode(node.id, { finishId, finishVariantId: variantId });
          }
          applied++;
          break;
        }
        case "add_furniture": {
          const { roomName, catalogId } = action.args;
          const catalog = FURNITURE_CATALOG.find((c) => c.id === catalogId);
          if (!catalog) { skipped++; break; }
          const zone = Object.values(nodes).find(
            (n) => n.type === "zone" && (n.name === roomName || (n as ZoneNode).label === roomName)
          ) as ZoneNode | undefined;
          const levelId = zone?.parentId ?? Object.values(nodes).find((n) => n.type === "level")?.id;
          if (!levelId) { skipped++; break; }
          const position = zone?.points?.length
            ? { x: zone.points.reduce((s, p) => s + p.x, 0) / zone.points.length, y: 0, z: zone.points.reduce((s, p) => s + p.z, 0) / zone.points.length }
            : { x: 0, y: 0, z: 0 };
          const item: any = {
            id: crypto.randomUUID(),
            type: "item",
            parentId: levelId,
            childIds: [],
            name: catalog.name,
            visible: true,
            locked: false,
            itemType: "furniture",
            catalogId: catalog.id,
            modelUrl: catalog.modelUrl,
            dimensions: catalog.dimensions,
            material: "wood",
            materialSlots: catalog.materialSlots,
            assetQualityTier: catalog.qualityTier,
            assetStyleTier: catalog.styleTier,
            transform: { position, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
          };
          addNode(item, levelId);
          applied++;
          break;
        }
        case "remove_furniture": {
          const { itemName } = action.args;
          const target = Object.values(nodes).find(
            (n) => n.type === "item" && n.name.toLowerCase().includes(itemName.toLowerCase())
          );
          if (target) { deleteNode(target.id); applied++; } else { skipped++; }
          break;
        }
        case "swap_furniture": {
          const { itemName, newCatalogId } = action.args;
          const oldItem = Object.values(nodes).find(
            (n) => n.type === "item" && n.name.toLowerCase().includes(itemName.toLowerCase())
          );
          const newCatalog = FURNITURE_CATALOG.find((c) => c.id === newCatalogId);
          if (!oldItem || !newCatalog) { skipped++; break; }
          updateNode(oldItem.id, {
            name: newCatalog.name,
            catalogId: newCatalog.id,
            modelUrl: newCatalog.modelUrl,
            dimensions: newCatalog.dimensions,
            materialSlots: newCatalog.materialSlots,
          });
          applied++;
          break;
        }
        case "change_assembly": {
          const assembly = MATERIAL_ASSEMBLIES.find((a) => a.id === action.args.assemblyId);
          if (!assembly) { skipped++; break; }
          for (const node of Object.values(nodes)) {
            if (node.type === "wall") {
              updateNode(node.id, { finishId: assembly.wallFinishId, finishVariantId: assembly.wallFinishVariantId });
            }
            if (node.type === "slab") {
              updateNode(node.id, { finishId: assembly.slabFinishId, finishVariantId: assembly.slabFinishVariantId });
            }
          }
          applied++;
          break;
        }
        default:
          skipped++;
      }
    } catch {
      skipped++;
    }
  }
  return { applied, skipped };
}
