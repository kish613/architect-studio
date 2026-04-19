import type { ComponentType, CSSProperties } from "react";
import { Rail } from "./Rail";
import { SceneTreePanel } from "./SceneTreePanel";
import { CanvasSurface } from "./CanvasSurface";
import { HoverTag } from "./HoverTag";
import { FloorSwitcher } from "./FloorSwitcher";
import { Inspector } from "./Inspector";
import { SectionCut } from "./SectionCut";
import { HUD } from "./HUD";
import {
  STUDIO_PRESETS,
  toStorePreset,
  type PresetId,
} from "./camera-presets";
import {
  Box as IBox,
  Square,
  Columns2,
  Scan,
  Footprints,
  Lock,
  MoreHorizontal,
} from "lucide-react";
import { useViewer } from "@/stores/use-viewer";
import type { StageProps } from "./stage-props";

const PRESET_ICON: Record<PresetId, ComponentType<{ style?: CSSProperties }>> = {
  iso: IBox,
  front: Square,
  side: Columns2,
  top: Scan,
  walk: Footprints,
};

function CanvasViewBar() {
  const cameraPreset = useViewer((s) => s.cameraPreset);
  const setCameraPreset = useViewer((s) => s.setCameraPreset);
  return (
    <div className="sb-island sb-viewbar">
      {STUDIO_PRESETS.map((p) => {
        const Icon = PRESET_ICON[p.id];
        const active = cameraPreset === toStorePreset(p.id);
        return (
          <button
            key={p.id}
            className={`sb-seg ${active ? "active" : ""}`}
            onClick={() => setCameraPreset(toStorePreset(p.id))}
          >
            <Icon style={{ width: 12, height: 12 }} />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

function InspectorPanel() {
  return (
    <aside className="sb-panel">
      <div className="sb-panel-head">
        <div className="sb-panel-title">Inspector</div>
        <div style={{ display: "flex", gap: 2 }}>
          <button className="sb-icon-btn" style={{ width: 22, height: 22 }}>
            <Lock style={{ width: 12, height: 12 }} />
          </button>
          <button className="sb-icon-btn" style={{ width: 22, height: 22 }}>
            <MoreHorizontal style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>
      <div className="sb-panel-body">
        <Inspector />
      </div>
    </aside>
  );
}

export function PrecisionStage(p: StageProps) {
  const canvasClass = `sb-canvas ${p.mode === "2d" ? "is-2d" : "is-3d"}`;
  return (
    <section className="sb-stage">
      <Rail
        tool={p.tool}
        onTool={p.onTool}
        onUndo={p.onUndo}
        onRedo={p.onRedo}
      />
      <SceneTreePanel />
      <div className={canvasClass}>
        <CanvasSurface
          mode={p.mode}
          hasPascal={p.hasPascal}
          modelUrl={p.modelUrl}
          isometricUrl={p.isometricUrl}
          onGenerate={p.onGenerate}
        />
        <HoverTag hover={p.hover} />
        <FloorSwitcher />
        <CanvasViewBar />
        {p.mode === "3d" && <SectionCut cutY={p.cutY} onChange={p.onCutY} />}
        <HUD mode={p.mode} />
      </div>
      <InspectorPanel />
    </section>
  );
}
