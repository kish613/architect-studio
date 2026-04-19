import { useScene } from "@/stores/use-scene";
import { useViewer } from "@/stores/use-viewer";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { WORKSPACE_LAYERS, countLayers, type LayerId } from "./layer-stats";

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

export function LayersIsland() {
  const nodes = useScene((s) => s.nodes);
  const showWalls = useViewer((s) => s.showWalls);
  const showWindows = useViewer((s) => s.showWindows);
  const showItems = useViewer((s) => s.showItems);
  const showZones = useViewer((s) => s.showZones);
  const showGrid = useViewer((s) => s.showGrid);
  const showDimensions = useViewer((s) => s.showDimensions);
  const toggleVisibility = useViewer((s) => s.toggleVisibility);

  const [localOn, setLocalOn] = useState<Record<LayerId, boolean>>({
    walls: true,
    doors: true,
    windows: true,
    furn: true,
    soft: true,
    light: true,
    dims: false,
    grid: true,
  });

  const visibility: Record<VisKey, boolean> = {
    showWalls,
    showWindows,
    showItems,
    showZones,
    showGrid,
    showDimensions,
  };

  const counts = countLayers(nodes as Record<string, { type?: string }>);

  const isOn = (id: LayerId): boolean => {
    const key = VIS_FOR_LAYER[id];
    if (!key) return localOn[id];
    return Boolean(visibility[key]);
  };

  const toggle = (id: LayerId) => {
    const key = VIS_FOR_LAYER[id];
    if (!key) {
      setLocalOn((prev) => ({ ...prev, [id]: !prev[id] }));
      return;
    }
    toggleVisibility(key);
  };

  return (
    <div className="sb-island sb-layers-island">
      <div className="sb-panel-title" style={{ marginBottom: 8 }}>
        Layers
      </div>
      <div className="sb-layers">
        {WORKSPACE_LAYERS.map((layer) => {
          const on = isOn(layer.id);
          const EyeIcon = on ? Eye : EyeOff;
          return (
            <div
              key={layer.id}
              className={`sb-layer ${on ? "" : "hidden"}`}
              onClick={() => toggle(layer.id)}
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
    </div>
  );
}
