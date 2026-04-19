import type { ViewerMode } from "./ModeSwitcher";
import type { ToolId } from "./tools";

export interface StageProps {
  mode: ViewerMode;
  tool: ToolId;
  onTool: (t: ToolId) => void;

  hasPascal: boolean;
  modelUrl: string | null | undefined;
  isometricUrl?: string | null;

  cutY: number;
  onCutY: (y: number) => void;

  onGenerate: () => void;
  onUndo?: () => void;
  onRedo?: () => void;

  hover: { label: string; meta: string } | null;
}
