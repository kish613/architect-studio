import { LayoutGrid, Columns2, Box } from "lucide-react";

export type ViewerMode = "2d" | "split" | "3d";

interface Props {
  mode: ViewerMode;
  onChange: (m: ViewerMode) => void;
}

export function ModeSwitcher({ mode, onChange }: Props) {
  return (
    <div className="sb-top-c">
      <button
        className={`sb-mode-btn ${mode === "2d" ? "active" : ""}`}
        onClick={() => onChange("2d")}
      >
        <LayoutGrid style={{ width: 13, height: 13 }} />
        Plan
        <kbd>2</kbd>
      </button>
      <button
        className={`sb-mode-btn ${mode === "split" ? "active" : ""}`}
        onClick={() => onChange("split")}
      >
        <Columns2 style={{ width: 13, height: 13 }} />
        Split
        <kbd>\</kbd>
      </button>
      <button
        className={`sb-mode-btn ${mode === "3d" ? "active" : ""}`}
        onClick={() => onChange("3d")}
      >
        <Box style={{ width: 13, height: 13 }} />
        Model
        <kbd>3</kbd>
      </button>
    </div>
  );
}
