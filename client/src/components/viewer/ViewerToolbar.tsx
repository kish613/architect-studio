import { useViewer } from "@/stores/use-viewer";
import type { WallMode } from "@/stores/use-viewer";
import {
  Moon,
  Sun,
  Camera,
  Tag,
  BoxSelect,
  Layers,
  SeparatorHorizontal,
  Square,
  AppWindow,
  Sparkles,
  Box,
} from "lucide-react";

function ToolbarButton({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-2.5 rounded-xl transition-all duration-200 ${
        active
          ? "bg-amber-500/20 text-amber-400"
          : "text-white/60 hover:text-white hover:bg-white/10"
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-white/10" />;
}

export function ViewerToolbar({
  onToggleRenderer,
  activeRenderer,
}: {
  onToggleRenderer?: () => void;
  activeRenderer?: "pascal" | "r3f";
} = {}) {
  const theme = useViewer((s) => s.theme);
  const toggleTheme = useViewer((s) => s.toggleTheme);
  const cameraMode = useViewer((s) => s.cameraMode);
  const toggleCameraMode = useViewer((s) => s.toggleCameraMode);
  const levelMode = useViewer((s) => s.levelMode);
  const setLevelMode = useViewer((s) => s.setLevelMode);
  const wallMode = useViewer((s) => s.wallMode);
  const setWallMode = useViewer((s) => s.setWallMode);
  const showZones = useViewer((s) => s.showZones);
  const showWindows = useViewer((s) => s.showWindows);
  const toggleVisibility = useViewer((s) => s.toggleVisibility);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-[#1a1a2e]/90 backdrop-blur-xl border border-white/5 shadow-2xl">
        {/* Theme toggle */}
        <ToolbarButton
          icon={theme === "dark" ? Sun : Moon}
          label={theme === "dark" ? "Light mode" : "Dark mode"}
          onClick={toggleTheme}
        />
        {/* Camera mode */}
        <ToolbarButton
          icon={Camera}
          label={cameraMode === "perspective" ? "Switch to orthographic" : "Switch to perspective"}
          onClick={toggleCameraMode}
        />

        <ToolbarDivider />

        {/* Zone labels */}
        <ToolbarButton
          icon={Tag}
          label="Toggle zone labels"
          active={showZones}
          onClick={() => toggleVisibility("showZones")}
        />

        {/* Wall cutaway */}
        <ToolbarButton
          icon={BoxSelect}
          label={`Wall mode: ${wallMode}`}
          active={wallMode === "cutaway"}
          onClick={() => {
            const modes: WallMode[] = ["up", "cutaway", "down"];
            const idx = modes.indexOf(wallMode);
            setWallMode(modes[(idx + 1) % modes.length]);
          }}
        />

        {/* Window visibility */}
        <ToolbarButton
          icon={AppWindow}
          label="Toggle windows"
          active={showWindows}
          onClick={() => toggleVisibility("showWindows")}
        />

        <ToolbarDivider />

        {/* Level modes */}
        <ToolbarButton
          icon={Layers}
          label="Stacked view"
          active={levelMode === "stacked"}
          onClick={() => setLevelMode("stacked")}
        />
        <ToolbarButton
          icon={SeparatorHorizontal}
          label="Exploded view"
          active={levelMode === "exploded"}
          onClick={() => setLevelMode("exploded")}
        />
        <ToolbarButton
          icon={Square}
          label="Solo level"
          active={levelMode === "solo"}
          onClick={() => setLevelMode("solo")}
        />

        {onToggleRenderer && (
          <>
            <ToolbarDivider />
            <ToolbarButton
              icon={activeRenderer === "pascal" ? Sparkles : Box}
              label={activeRenderer === "pascal" ? "Pascal" : "Standard"}
              onClick={onToggleRenderer}
            />
          </>
        )}
      </div>
    </div>
  );
}
