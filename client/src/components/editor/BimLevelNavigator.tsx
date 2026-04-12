import { useMemo } from "react";
import { useBimScene } from "@/stores/use-bim-scene";
import { useViewer } from "@/stores/use-viewer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Layers } from "lucide-react";

export function BimLevelNavigator() {
  const bim = useBimScene((s) => s.bim);
  const addLevel = useBimScene((s) => s.addLevel);
  const activeLevelId = useViewer((s) => s.activeLevelId);
  const setActiveLevel = useViewer((s) => s.setActiveLevel);
  const levelMode = useViewer((s) => s.levelMode);
  const setLevelMode = useViewer((s) => s.setLevelMode);

  const levels = useMemo(
    () => [...bim.levels].sort((a, b) => a.index - b.index),
    [bim.levels],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Levels (BIM)</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-white/60 hover:text-white"
          type="button"
          onClick={() => {
            const id = addLevel();
            setActiveLevel(id);
          }}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex gap-1">
        {(["stacked", "exploded", "solo"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setLevelMode(mode)}
            className={cn(
              "flex-1 rounded px-2 py-1 text-xs transition-colors",
              levelMode === mode
                ? "bg-primary text-primary-foreground"
                : "text-white/50 hover:bg-white/10 hover:text-white",
            )}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {levels.length === 0 && (
          <p className="py-2 text-center text-xs text-white/30">No levels</p>
        )}
        {levels.map((level) => (
          <div
            key={level.id}
            role="button"
            tabIndex={0}
            onClick={() => setActiveLevel(level.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setActiveLevel(level.id);
            }}
            className={cn(
              "flex cursor-pointer items-center justify-between rounded px-2 py-1.5 transition-colors",
              activeLevelId === level.id
                ? "border border-primary/40 bg-primary/20"
                : "hover:bg-white/5",
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <Layers className="h-3 w-3 shrink-0 text-white/40" />
              <span className="truncate text-sm text-white">{level.name}</span>
            </div>
            <span className="text-[10px] text-white/40">{level.elevation.toFixed(1)}m</span>
          </div>
        ))}
      </div>
    </div>
  );
}
