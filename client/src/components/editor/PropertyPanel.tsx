import { useViewer } from "@/stores/use-viewer";
import { useScene } from "@/stores/use-scene";
import type { AnyNode, WallNode, DoorNode, WindowNode, LevelNode } from "@/lib/pascal/schemas";

function safeParseFloat(value: string, fallback: number): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
}

function WallProperties({ node }: { node: WallNode }) {
  const updateNode = useScene((s) => s.updateNode);
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider">Wall</h4>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-white/50 block mb-1">Height (m)</label>
          <input
            type="number"
            value={node.height ?? 2.7}
            step={0.1}
            min={0.5}
            onChange={(e) => updateNode(node.id, { height: safeParseFloat(e.target.value, 2.7) })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Thickness (m)</label>
          <input
            type="number"
            value={node.thickness ?? 0.15}
            step={0.01}
            min={0.05}
            onChange={(e) => updateNode(node.id, { thickness: safeParseFloat(e.target.value, 0.15) })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Material</label>
          <select
            value={node.material ?? "plaster"}
            onChange={(e) => updateNode(node.id, { material: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
          >
            {["plaster", "brick", "concrete", "glass", "wood", "stone"].map((m) => (
              <option key={m} value={m} className="bg-[#1a1a1a]">{m}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function DoorProperties({ node }: { node: DoorNode }) {
  const updateNode = useScene((s) => s.updateNode);
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider">Door</h4>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-white/50 block mb-1">Width (m)</label>
          <input type="number" value={node.width ?? 0.9} step={0.05} min={0.6} max={2.4}
            onChange={(e) => updateNode(node.id, { width: safeParseFloat(e.target.value, 0.9) })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Height (m)</label>
          <input type="number" value={node.height ?? 2.1} step={0.1} min={1.8} max={3}
            onChange={(e) => updateNode(node.id, { height: safeParseFloat(e.target.value, 2.1) })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Type</label>
          <select value={node.doorType ?? "single"}
            onChange={(e) => updateNode(node.id, { doorType: e.target.value as DoorNode["doorType"] })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white">
            {["single", "double", "sliding", "french", "bifold"].map((t) => (
              <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function WindowProperties({ node }: { node: WindowNode }) {
  const updateNode = useScene((s) => s.updateNode);
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider">Window</h4>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-white/50 block mb-1">Width (m)</label>
          <input type="number" value={node.width ?? 1.2} step={0.1} min={0.3}
            onChange={(e) => updateNode(node.id, { width: safeParseFloat(e.target.value, 1.2) })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Height (m)</label>
          <input type="number" value={node.height ?? 1.2} step={0.1} min={0.3}
            onChange={(e) => updateNode(node.id, { height: safeParseFloat(e.target.value, 1.2) })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Sill Height (m)</label>
          <input type="number" value={node.sillHeight ?? 0.9} step={0.1} min={0}
            onChange={(e) => updateNode(node.id, { sillHeight: safeParseFloat(e.target.value, 0.9) })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white" />
        </div>
      </div>
    </div>
  );
}

function LevelProperties({ node }: { node: LevelNode }) {
  const updateNode = useScene((s) => s.updateNode);
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider">Level</h4>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-white/50 block mb-1">Name</label>
          <input type="text" value={node.name}
            onChange={(e) => updateNode(node.id, { name: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Height (m)</label>
          <input type="number" value={node.height ?? 2.7} step={0.1} min={2}
            onChange={(e) => updateNode(node.id, { height: safeParseFloat(e.target.value, 2.7) })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white" />
        </div>
      </div>
    </div>
  );
}

function NodeName({ node }: { node: AnyNode }) {
  const updateNode = useScene((s) => s.updateNode);
  return (
    <div>
      <label className="text-xs text-white/50 block mb-1">Name</label>
      <input type="text" value={node.name}
        onChange={(e) => updateNode(node.id, { name: e.target.value })}
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white" />
    </div>
  );
}

export function PropertyPanel() {
  const selectedIds = useViewer((s) => s.selectedIds);
  const nodes = useScene((s) => s.nodes);

  if (selectedIds.length === 0) {
    return (
      <div className="p-4">
        <p className="text-xs text-white/40 text-center">Select an element to edit its properties</p>
      </div>
    );
  }

  const node = nodes[selectedIds[0]];
  if (!node) return null;

  return (
    <div className="p-4 space-y-4">
      <NodeName node={node} />
      <div className="border-t border-white/10 pt-4">
        {node.type === "wall" && <WallProperties node={node} />}
        {node.type === "door" && <DoorProperties node={node} />}
        {node.type === "window" && <WindowProperties node={node} />}
        {node.type === "level" && <LevelProperties node={node} />}
        {node.type !== "wall" && node.type !== "door" && node.type !== "window" && node.type !== "level" && (
          <p className="text-xs text-white/40">Type: {node.type}</p>
        )}
      </div>
    </div>
  );
}
