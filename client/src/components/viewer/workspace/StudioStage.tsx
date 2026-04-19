import { CanvasSurface } from "./CanvasSurface";
import { HoverTag } from "./HoverTag";
import { FloorSwitcher } from "./FloorSwitcher";
import { LayersIsland } from "./LayersIsland";
import { Inspector } from "./Inspector";
import { ToolDock } from "./ToolDock";
import { CamIsland } from "./CamIsland";
import { SectionCut } from "./SectionCut";
import { HUD } from "./HUD";
import type { StageProps } from "./stage-props";

export function StudioStage(p: StageProps) {
  const canvasClass = `sb-canvas ${p.mode === "2d" ? "is-2d" : "is-3d"}`;
  return (
    <section className="sb-stage">
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
        <LayersIsland />
        <div className="sb-island sb-props-island">
          <Inspector />
        </div>
        <ToolDock
          tool={p.tool}
          onTool={p.onTool}
          onUndo={p.onUndo}
          onRedo={p.onRedo}
        />
        {p.mode !== "2d" && <CamIsland />}
        {p.mode === "3d" && <SectionCut cutY={p.cutY} onChange={p.onCutY} />}
        <HUD mode={p.mode} />
      </div>
    </section>
  );
}
