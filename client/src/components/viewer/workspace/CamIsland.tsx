import {
  Box as IBox,
  Square,
  Columns2,
  Scan,
  Footprints,
  Sun,
  Maximize2,
} from "lucide-react";
import type { CSSProperties, ComponentType } from "react";
import { STUDIO_PRESETS, toStorePreset, type PresetId } from "./camera-presets";
import { useViewer } from "@/stores/use-viewer";

const PRESET_ICON: Record<PresetId, ComponentType<{ style?: CSSProperties }>> = {
  iso: IBox,
  front: Square,
  side: Columns2,
  top: Scan,
  walk: Footprints,
};

interface CamIslandProps {
  onFrame?: () => void;
  onSun?: () => void;
}

export function CamIsland({ onFrame, onSun }: CamIslandProps) {
  const cameraPreset = useViewer((s) => s.cameraPreset);
  const setCameraPreset = useViewer((s) => s.setCameraPreset);

  return (
    <div className="sb-island sb-cam">
      {STUDIO_PRESETS.map((p) => {
        const Icon = PRESET_ICON[p.id];
        const active = cameraPreset === toStorePreset(p.id);
        return (
          <button
            key={p.id}
            className={active ? "active" : ""}
            onClick={() => setCameraPreset(toStorePreset(p.id))}
            title={p.label}
          >
            <Icon style={{ width: 15, height: 15 }} />
          </button>
        );
      })}
      <div className="sb-cam-div" />
      <button title="Sun" onClick={onSun}>
        <Sun style={{ width: 15, height: 15 }} />
      </button>
      <button title="Frame" onClick={onFrame}>
        <Maximize2 style={{ width: 15, height: 15 }} />
      </button>
    </div>
  );
}
