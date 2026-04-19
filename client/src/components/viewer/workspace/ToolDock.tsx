import type { ToolId } from "./tools";
import { TOOLS, UNDO_ICON, REDO_ICON } from "./tools";

interface ToolDockProps {
  tool: ToolId;
  onTool: (t: ToolId) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function ToolDock({ tool, onTool, onUndo, onRedo }: ToolDockProps) {
  return (
    <div className="sb-island sb-dock">
      {TOOLS.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            className={`sb-tool ${tool === t.id ? "active" : ""}`}
            onClick={() => onTool(t.id)}
          >
            <Icon style={{ width: 18, height: 18 }} />
            <span className="sb-tool-tip">
              {t.label}
              <kbd>{t.k}</kbd>
            </span>
          </button>
        );
      })}
      <div className="sb-dock-div" />
      <button className="sb-tool" onClick={onUndo}>
        <UNDO_ICON style={{ width: 18, height: 18 }} />
        <span className="sb-tool-tip">
          Undo<kbd>⌘Z</kbd>
        </span>
      </button>
      <button className="sb-tool" onClick={onRedo}>
        <REDO_ICON style={{ width: 18, height: 18 }} />
        <span className="sb-tool-tip">
          Redo<kbd>⌘⇧Z</kbd>
        </span>
      </button>
    </div>
  );
}
