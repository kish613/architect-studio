import { useViewer } from "@/stores/use-viewer";
import { useScene } from "@/stores/use-scene";
import { WallDragHandles } from "@/components/viewer/WallDragHandles";
import { ItemDragHandles } from "@/components/viewer/ItemDragHandles";
import type { WallNode, ItemNode } from "@/lib/pascal/schemas";

/**
 * Renders interactive editing handles (drag, rotate) for selected nodes.
 * Must be placed as a child of Pascal's <Viewer> (inside the R3F Canvas).
 */
export function EditOverlay() {
  const selectedIds = useViewer((s) => s.selectedIds);
  const nodes = useScene((s) => s.nodes);

  if (selectedIds.length === 0) return null;

  return (
    <>
      {selectedIds.map((id) => {
        const node = nodes[id];
        if (!node) return null;

        if (node.type === "wall") {
          return <WallDragHandles key={id} wall={node as WallNode} />;
        }
        if (node.type === "item") {
          return <ItemDragHandles key={id} item={node as ItemNode} />;
        }

        return null;
      })}
    </>
  );
}
