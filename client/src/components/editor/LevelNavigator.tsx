import { useMemo } from "react";
import { useScene } from "@/stores/use-scene";
import { useViewer } from "@/stores/use-viewer";
import { createNode } from "@/lib/pascal/schemas";
import type { LevelNode } from "@/lib/pascal/schemas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Layers } from "lucide-react";

export function LevelNavigator() {
  const nodes = useScene((s) => s.nodes);
  const addNode = useScene((s) => s.addNode);
  const activeBuildingId = useViewer((s) => s.activeBuildingId);
  const activeLevelId = useViewer((s) => s.activeLevelId);
  const setActiveLevel = useViewer((s) => s.setActiveLevel);
  const levelMode = useViewer((s) => s.levelMode);
  const setLevelMode = useViewer((s) => s.setLevelMode);

  const levels = useMemo(
    () => Object.values(nodes)
      .filter((n): n is LevelNode => n.type === "level" && (activeBuildingId ? n.parentId === activeBuildingId : true))
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
    [nodes, activeBuildingId]
  );

  const handleAddLevel = () => {
    const nextIndex = levels.length;
    const nextElevation = levels.reduce((sum, l) => sum + (l.height ?? 2.7), 0);
    const newLevel = createNode("level", {
      name: nextIndex === 0 ? "Ground Floor" : `Floor ${nextIndex}`,
      index: nextIndex,
      elevation: nextElevation,
      parentId: activeBuildingId ?? undefined,
    });
    addNode(newLevel, activeBuildingId ?? undefined);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Levels</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-white/60 hover:text-white" onClick={handleAddLevel}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      {/* Display mode */}
      <div className="flex gap-1">
        {(["stacked", "exploded", "solo"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setLevelMode(mode)}
            className={cn(
              "flex-1 text-xs py-1 px-2 rounded transition-colors",
              levelMode === mode ? "bg-primary text-primary-foreground" : "text-white/50 hover:text-white hover:bg-white/10"
            )}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Level list */}
      <div className="space-y-1">
        {levels.length === 0 && (
          <p className="text-xs text-white/30 text-center py-2">No levels — click + to add</p>
        )}
        {levels.map((level) => (
          <div
            key={level.id}
            onClick={() => setActiveLevel(level.id)}
            className={cn(
              "flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors",
              activeLevelId === level.id ? "bg-primary/20 border border-primary/40" : "hover:bg-white/5"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Layers className="w-3 h-3 text-white/40 shrink-0" />
              <span className="text-sm text-white truncate">{level.name}</span>
            </div>
            <span className="text-xs text-white/30 shrink-0 ml-1">+{(level.elevation ?? 0).toFixed(1)}m</span>
          </div>
        ))}
      </div>
    </div>
  );
}
