import { cn } from "@/lib/utils";
import { useEditor } from "@/stores/use-editor";
import type { EditorTool } from "@/stores/use-editor";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MousePointer2, Minus, DoorOpen, Square, Layers,
  Triangle, Home, Box, Ruler, ScanLine, Pencil,
  Eraser, AppWindow,
} from "lucide-react";

const TOOLS: Array<{ tool: EditorTool; icon: React.ComponentType<{ className?: string }>; label: string }> = [
  { tool: "select", icon: MousePointer2, label: "Select" },
  { tool: "wall", icon: Minus, label: "Draw Wall" },
  { tool: "door", icon: DoorOpen, label: "Place Door" },
  { tool: "window", icon: AppWindow, label: "Place Window" },
  { tool: "slab", icon: Square, label: "Draw Slab" },
  { tool: "ceiling", icon: Layers, label: "Draw Ceiling" },
  { tool: "roof", icon: Home, label: "Draw Roof" },
  { tool: "zone", icon: Triangle, label: "Draw Zone" },
  { tool: "item", icon: Box, label: "Place Item" },
  { tool: "guide", icon: Pencil, label: "Draw Guide" },
  { tool: "scan", icon: ScanLine, label: "Place Scan" },
  { tool: "measure", icon: Ruler, label: "Measure" },
  { tool: "eraser", icon: Eraser, label: "Eraser" },
];

export function EditorToolbar() {
  const activeTool = useEditor((s) => s.activeTool);
  const setTool = useEditor((s) => s.setTool);

  return (
    <div className="flex flex-col gap-1 p-2 bg-white/5 border border-white/10 rounded-lg w-10">
      {TOOLS.map(({ tool, icon: Icon, label }) => (
        <Tooltip key={tool}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setTool(tool)}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
                activeTool === tool
                  ? "bg-primary text-primary-foreground"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
              aria-label={label}
            >
              <Icon className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
