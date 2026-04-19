import { Scissors } from "lucide-react";

interface SectionCutProps {
  cutY: number; // 0..1
  onChange: (y: number) => void;
  visible?: boolean;
}

export function SectionCut({ cutY, onChange, visible = true }: SectionCutProps) {
  if (!visible) return null;
  return (
    <div className="sb-section-cut">
      <Scissors style={{ width: 13, height: 13, color: "var(--fg-3)" }} />
      <input
        type="range"
        min={0}
        max={100}
        value={cutY * 100}
        onChange={(e) => onChange(parseFloat(e.target.value) / 100)}
        style={{ writingMode: "vertical-lr" as any, direction: "rtl" }}
      />
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: "var(--fg-3)",
        }}
      >
        {(2.7 * (1 - cutY)).toFixed(1)}m
      </div>
    </div>
  );
}
