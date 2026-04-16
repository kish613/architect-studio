import { Sun, Sunset, Cloud, Moon } from "lucide-react";
import { useViewer } from "@/stores/use-viewer";
import { ENVIRONMENT_PRESETS } from "@/lib/bim/environment-presets";
import type { FC, SVGAttributes } from "react";

const ICON_MAP: Record<string, FC<SVGAttributes<SVGSVGElement> & { size?: number }>> = {
  Sun,
  Sunset,
  Cloud,
  Moon,
};

export function EnvironmentPresetPicker() {
  const environmentPreset = useViewer((s) => s.environmentPreset);
  const setEnvironmentPreset = useViewer((s) => s.setEnvironmentPreset);

  return (
    <div className="flex gap-0.5 rounded-xl bg-white/5 p-0.5">
      {Object.values(ENVIRONMENT_PRESETS).map((preset) => {
        const Icon = ICON_MAP[preset.icon];
        const active = environmentPreset === preset.id;
        return (
          <button
            key={preset.id}
            onClick={() => setEnvironmentPreset(preset.id)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              active
                ? "bg-amber-500/20 text-amber-400"
                : "text-white/50 hover:text-white hover:bg-white/10"
            }`}
            title={preset.label}
          >
            {Icon && <Icon size={14} />}
          </button>
        );
      })}
    </div>
  );
}
