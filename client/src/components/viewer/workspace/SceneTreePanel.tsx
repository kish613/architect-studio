import { useScene } from "@/stores/use-scene";
import { useViewer } from "@/stores/use-viewer";
import { WORKSPACE_LAYERS, countLayers, type LayerId } from "./layer-stats";
import { Eye, EyeOff, Plus, Circle } from "lucide-react";

type VisKey =
  | "showWalls"
  | "showWindows"
  | "showItems"
  | "showZones"
  | "showGrid"
  | "showDimensions";

const VIS_FOR_LAYER: Record<LayerId, VisKey | null> = {
  walls: "showWalls",
  doors: "showWalls",
  windows: "showWindows",
  furn: "showItems",
  soft: "showZones",
  light: null,
  dims: "showDimensions",
  grid: "showGrid",
};

export function SceneTreePanel() {
  const nodes = useScene((s) => s.nodes);
  const selectedIds = useViewer((s) => s.selectedIds);
  const select = useViewer((s) => s.select);

  const showWalls = useViewer((s) => s.showWalls);
  const showWindows = useViewer((s) => s.showWindows);
  const showItems = useViewer((s) => s.showItems);
  const showZones = useViewer((s) => s.showZones);
  const showGrid = useViewer((s) => s.showGrid);
  const showDimensions = useViewer((s) => s.showDimensions);
  const toggleVisibility = useViewer((s) => s.toggleVisibility);

  const visibility: Record<VisKey, boolean> = {
    showWalls,
    showWindows,
    showItems,
    showZones,
    showGrid,
    showDimensions,
  };

  const counts = countLayers(nodes as Record<string, { type?: string }>);
  const zones = Object.values(nodes).filter(
    (n: any) => n?.type === "zone",
  ) as Array<any>;

  return (
    <aside className="sb-panel">
      <div className="sb-panel-head">
        <div className="sb-panel-title">Scene</div>
        <button className="sb-icon-btn" style={{ width: 22, height: 22 }}>
          <Plus style={{ width: 12, height: 12 }} />
        </button>
      </div>
      <div className="sb-panel-body">
        <div className="sb-layers" style={{ marginBottom: 14 }}>
          {WORKSPACE_LAYERS.map((layer) => {
            const key = VIS_FOR_LAYER[layer.id];
            const on = key ? Boolean(visibility[key]) : true;
            const EyeIcon = on ? Eye : EyeOff;
            return (
              <div
                key={layer.id}
                className={`sb-layer ${on ? "" : "hidden"}`}
                onClick={() => {
                  if (key) toggleVisibility(key);
                }}
              >
                <EyeIcon className="eye" style={{ width: 14, height: 14 }} />
                <div
                  className="sb-layer-swatch"
                  style={{ background: layer.swatch }}
                />
                <span className="sb-layer-name">{layer.name}</span>
                <span className="sb-layer-count">{counts[layer.id]}</span>
              </div>
            );
          })}
        </div>

        <div className="sb-panel-title" style={{ padding: "8px 0" }}>
          Rooms
        </div>
        <div className="sb-layers">
          {zones.length === 0 && (
            <div
              style={{
                fontSize: 11,
                color: "var(--fg-3)",
                padding: "6px 8px",
              }}
            >
              No rooms defined yet.
            </div>
          )}
          {zones.map((z) => (
            <div
              key={z.id}
              className={`sb-layer ${selectedIds.includes(z.id) ? "active" : ""}`}
              onClick={() => select([z.id])}
            >
              <Circle
                className="eye"
                style={{ width: 14, height: 14, color: "var(--fg-3)" }}
              />
              <span className="sb-layer-name">{z.label || "Zone"}</span>
              <span className="sb-layer-count">
                {z.points?.length || 0} pts
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
