import { useViewer } from "@/stores/use-viewer";
import { useScene } from "@/stores/use-scene";
import type {
  AnyNode,
  WallNode,
  DoorNode,
  WindowNode,
  LevelNode,
  ItemNode,
  SlabNode,
  RoofNode,
  CeilingNode,
  ZoneNode,
} from "@/lib/pascal/schemas";
import { getItemQualityWarnings } from "@/lib/pascal/item-warnings";
import { buildStylePresetUpdates, ROOM_STYLE_PRESETS } from "@/lib/pascal/room-style-presets";
import { MATERIAL_LIBRARY, findMaterialDefinition } from "@shared/material-library";

function safeParseFloat(value: string, fallback: number): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
}

type FinishSurface = "wall" | "slab" | "ceiling" | "roof" | "item";
type FinishNode = WallNode | SlabNode | CeilingNode | RoofNode | ItemNode;

function SurfaceFinishControls({
  node,
  surface,
  allowUvScale = false,
}: {
  node: FinishNode;
  surface: FinishSurface;
  allowUvScale?: boolean;
}) {
  const updateNode = useScene((s) => s.updateNode);
  const finishOptions = MATERIAL_LIBRARY.filter((definition) => {
    if (surface === "wall" || surface === "item") {
      return definition.category === surface || definition.category === "glass";
    }

    return definition.category === surface;
  });
  const activeDefinition = findMaterialDefinition(node.finishId) ?? finishOptions[0] ?? null;
  const activeVariantId = node.finishVariantId ?? activeDefinition?.defaultVariantId ?? "";

  return (
    <div className="space-y-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
      <h5 className="text-[10px] uppercase tracking-wider text-white/35">Finish</h5>
      <div>
        <label className="text-xs text-white/50 block mb-1">Finish Library</label>
        <select
          value={node.finishId ?? activeDefinition?.id ?? ""}
          onChange={(e) => {
            const nextDefinition = findMaterialDefinition(e.target.value);
            updateNode(node.id, {
              finishId: e.target.value || undefined,
              finishVariantId: nextDefinition?.defaultVariantId,
            } as Partial<AnyNode>);
          }}
          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
        >
          {finishOptions.map((definition) => (
            <option key={definition.id} value={definition.id} className="bg-[#1a1a1a]">
              {definition.label}
            </option>
          ))}
        </select>
      </div>
      {activeDefinition && (
        <div>
          <label className="text-xs text-white/50 block mb-1">Variant</label>
          <select
            value={activeVariantId}
            onChange={(e) => updateNode(node.id, { finishVariantId: e.target.value } as Partial<AnyNode>)}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
          >
            {activeDefinition.variants.map((variant) => (
              <option key={variant.id} value={variant.id} className="bg-[#1a1a1a]">
                {variant.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {allowUvScale && "uvScale" in node && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[10px] text-white/45 uppercase tracking-wider block mb-1">UV X</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={node.uvScale?.x ?? 1}
              onChange={(e) =>
                updateNode(node.id, {
                  uvScale: {
                    x: safeParseFloat(e.target.value, node.uvScale?.x ?? 1),
                    y: node.uvScale?.y ?? 1,
                  },
                } as Partial<AnyNode>)
              }
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-white/45 uppercase tracking-wider block mb-1">UV Y</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={node.uvScale?.y ?? 1}
              onChange={(e) =>
                updateNode(node.id, {
                  uvScale: {
                    x: node.uvScale?.x ?? 1,
                    y: safeParseFloat(e.target.value, node.uvScale?.y ?? 1),
                  },
                } as Partial<AnyNode>)
              }
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function StylePresetControls({ nodeId, title }: { nodeId: string; title: string }) {
  const nodes = useScene((s) => s.nodes);
  const rootNodeIds = useScene((s) => s.rootNodeIds);
  const applyNodeUpdates = useScene((s) => s.applyNodeUpdates);

  return (
    <div className="space-y-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
      <h5 className="text-[10px] uppercase tracking-wider text-white/35">{title}</h5>
      <div className="grid gap-2">
        {ROOM_STYLE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyNodeUpdates(buildStylePresetUpdates({ nodes, rootNodeIds }, nodeId, preset.id))}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:bg-white/10 hover:border-white/20"
          >
            <div className="text-sm text-white">{preset.label}</div>
            <div className="text-[11px] text-white/50 leading-snug">{preset.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function WallProperties({ node }: { node: WallNode }) {
  const updateNode = useScene((s) => s.updateNode);
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider">Wall</h4>
      <SurfaceFinishControls node={node} surface="wall" allowUvScale />
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
      <StylePresetControls nodeId={node.id} title="Apply To Whole Level" />
    </div>
  );
}

function ItemProperties({ node }: { node: ItemNode }) {
  const updateNode = useScene((s) => s.updateNode);
  const warnings = getItemQualityWarnings(node);

  const updateTransform = (key: "position" | "rotation" | "scale", axis: "x" | "y" | "z", value: string) => {
    const parsed = safeParseFloat(value, node.transform[key][axis]);
    updateNode(node.id, {
      transform: {
        ...node.transform,
        [key]: {
          ...node.transform[key],
          [axis]: parsed,
        },
      },
    });
  };

  const updateDimensions = (axis: "x" | "y" | "z", value: string) => {
    updateNode(node.id, {
      dimensions: {
        ...node.dimensions,
        [axis]: safeParseFloat(value, node.dimensions[axis]),
      },
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider">Item</h4>
      <SurfaceFinishControls node={node} surface="item" />

      <div className="space-y-2">
        <div>
          <label className="text-xs text-white/50 block mb-1">Catalog ID</label>
          <input
            type="text"
            value={node.catalogId ?? ""}
            onChange={(e) => updateNode(node.id, { catalogId: e.target.value || undefined })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Model URL</label>
          <input
            type="text"
            value={node.modelUrl ?? ""}
            onChange={(e) => updateNode(node.id, { modelUrl: e.target.value || undefined })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Item Type</label>
          <select
            value={node.itemType}
            onChange={(e) => updateNode(node.id, { itemType: e.target.value as ItemNode["itemType"] })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
          >
            {["furniture", "appliance", "fixture", "light", "custom"].map((type) => (
              <option key={type} value={type} className="bg-[#1a1a1a]">{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Material</label>
          <input
            type="text"
            value={node.material ?? ""}
            onChange={(e) => updateNode(node.id, { material: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-white/50 block mb-1">Quality Tier</label>
            <input
              type="text"
              value={node.assetQualityTier ?? "placeholder"}
              readOnly
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white/70"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-1">Style Tier</label>
            <input
              type="text"
              value={node.assetStyleTier ?? "realistic"}
              readOnly
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white/70"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h5 className="text-[10px] uppercase tracking-wider text-white/35">Transform</h5>
        {(["position", "rotation", "scale"] as const).map((section) => (
          <div key={section} className="grid grid-cols-3 gap-2">
            {(["x", "y", "z"] as const).map((axis) => (
              <label key={`${section}-${axis}`} className="block">
                <span className="text-[10px] text-white/45 uppercase tracking-wider block mb-1">
                  {section} {axis}
                </span>
                <input
                  type="number"
                  step={section === "rotation" ? 1 : 0.01}
                  value={node.transform[section][axis]}
                  onChange={(e) => updateTransform(section, axis, e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
                />
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h5 className="text-[10px] uppercase tracking-wider text-white/35">Dimensions</h5>
        <div className="grid grid-cols-3 gap-2">
          {(["x", "y", "z"] as const).map((axis) => (
            <label key={axis} className="block">
              <span className="text-[10px] text-white/45 uppercase tracking-wider block mb-1">{axis}</span>
              <input
                type="number"
                step={0.01}
                value={node.dimensions[axis]}
                onChange={(e) => updateDimensions(axis, e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
              />
            </label>
          ))}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
          <h5 className="text-[10px] uppercase tracking-wider text-amber-200">Quality warnings</h5>
          <ul className="space-y-1 text-xs text-amber-50/85">
            {warnings.map((warning) => (
              <li key={warning}>- {warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SlabProperties({ node }: { node: SlabNode }) {
  const updateNode = useScene((s) => s.updateNode);

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider">Slab</h4>
      <SurfaceFinishControls node={node} surface="slab" allowUvScale />
      <div>
        <label className="text-xs text-white/50 block mb-1">Thickness (m)</label>
        <input
          type="number"
          value={node.thickness ?? 0.3}
          step={0.01}
          min={0.05}
          onChange={(e) => updateNode(node.id, { thickness: safeParseFloat(e.target.value, 0.3) })}
          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
        />
      </div>
    </div>
  );
}

function CeilingProperties({ node }: { node: CeilingNode }) {
  const updateNode = useScene((s) => s.updateNode);

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider">Ceiling</h4>
      <SurfaceFinishControls node={node} surface="ceiling" allowUvScale />
      <div>
        <label className="text-xs text-white/50 block mb-1">Thickness (m)</label>
        <input
          type="number"
          value={node.height ?? 0.2}
          step={0.01}
          min={0.02}
          onChange={(e) => updateNode(node.id, { height: safeParseFloat(e.target.value, 0.2) })}
          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
        />
      </div>
    </div>
  );
}

function RoofProperties({ node }: { node: RoofNode }) {
  const updateNode = useScene((s) => s.updateNode);

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider">Roof</h4>
      <SurfaceFinishControls node={node} surface="roof" allowUvScale />
      <div className="space-y-2">
        <div>
          <label className="text-xs text-white/50 block mb-1">Roof Type</label>
          <select
            value={node.roofType ?? "gable"}
            onChange={(e) => updateNode(node.id, { roofType: e.target.value as RoofNode["roofType"] })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
          >
            {["flat", "gable", "hip", "mansard", "shed"].map((type) => (
              <option key={type} value={type} className="bg-[#1a1a1a]">
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Pitch (deg)</label>
          <input
            type="number"
            value={node.pitch ?? 35}
            step={1}
            min={0}
            onChange={(e) => updateNode(node.id, { pitch: safeParseFloat(e.target.value, 35) })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
          />
        </div>
      </div>
    </div>
  );
}

function ZoneProperties({ node }: { node: ZoneNode }) {
  const updateNode = useScene((s) => s.updateNode);

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider">Zone</h4>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-white/50 block mb-1">Label</label>
          <input
            type="text"
            value={node.label}
            onChange={(e) => updateNode(node.id, { label: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Zone Type</label>
          <select
            value={node.zoneType}
            onChange={(e) => updateNode(node.id, { zoneType: e.target.value as ZoneNode["zoneType"] })}
            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
          >
            {["room", "hallway", "bathroom", "kitchen", "bedroom", "living", "garage", "utility", "other"].map((type) => (
              <option key={type} value={type} className="bg-[#1a1a1a]">
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>
      <StylePresetControls nodeId={node.id} title="Apply To This Room" />
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
        {node.type === "zone" && <ZoneProperties node={node} />}
        {node.type === "slab" && <SlabProperties node={node} />}
        {node.type === "ceiling" && <CeilingProperties node={node} />}
        {node.type === "roof" && <RoofProperties node={node} />}
        {node.type === "item" && <ItemProperties node={node} />}
        {node.type !== "wall" && node.type !== "door" && node.type !== "window" && node.type !== "level" && node.type !== "zone" && node.type !== "slab" && node.type !== "ceiling" && node.type !== "roof" && node.type !== "item" && (
          <p className="text-xs text-white/40">Type: {node.type}</p>
        )}
      </div>
    </div>
  );
}
