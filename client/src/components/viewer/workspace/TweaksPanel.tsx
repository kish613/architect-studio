import { Settings2 } from "lucide-react";
import { useState } from "react";
import type { WorkspaceLayout } from "./WorkspaceRoot";

interface TweaksPanelProps {
  layout: WorkspaceLayout;
  onLayout: (l: WorkspaceLayout) => void;
}

export function TweaksPanel({ layout, onLayout }: TweaksPanelProps) {
  const [open, setOpen] = useState(false);
  if (!import.meta.env.DEV) return null;

  return (
    <>
      <button
        aria-label="Dev tweaks"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          right: 20,
          bottom: 60,
          zIndex: 99,
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "rgba(17,17,17,.92)",
          backdropFilter: "blur(16px)",
          border: "1px solid var(--line-2)",
          color: "var(--fg-3)",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Settings2 style={{ width: 16, height: 16 }} />
      </button>
      <div className={`tweaks ${open ? "open" : ""}`}>
        <h4>Tweaks</h4>
        <div className="tweaks-row">
          <label>Layout</label>
          <div className="tweaks-opts">
            <button
              className={layout === "studio" ? "active" : ""}
              onClick={() => onLayout("studio")}
            >
              Studio
            </button>
            <button
              className={layout === "precision" ? "active" : ""}
              onClick={() => onLayout("precision")}
            >
              Precision
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
