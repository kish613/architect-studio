import { Settings } from "lucide-react";
import type { ToolId } from "./tools";
import { TOOLS, UNDO_ICON, REDO_ICON } from "./tools";

interface RailProps {
  tool: ToolId;
  onTool: (t: ToolId) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSettings?: () => void;
}

export function Rail({ tool, onTool, onUndo, onRedo, onSettings }: RailProps) {
  return (
    <aside className="sb-rail">
      {TOOLS.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            className={`sb-tool ${tool === t.id ? "active" : ""}`}
            onClick={() => onTool(t.id)}
            title={t.label}
          >
            <Icon style={{ width: 18, height: 18 }} />
            <kbd>{t.k}</kbd>
          </button>
        );
      })}
      <div className="sb-rail-div" />
      <button className="sb-tool" onClick={onUndo} title="Undo">
        <UNDO_ICON style={{ width: 18, height: 18 }} />
      </button>
      <button className="sb-tool" onClick={onRedo} title="Redo">
        <REDO_ICON style={{ width: 18, height: 18 }} />
      </button>
      <div style={{ flex: 1 }} />
      <button className="sb-tool" onClick={onSettings} title="Settings">
        <Settings style={{ width: 18, height: 18 }} />
      </button>
    </aside>
  );
}
