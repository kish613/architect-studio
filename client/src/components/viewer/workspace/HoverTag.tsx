export interface HoverInfo {
  label: string;
  meta: string;
}

interface HoverTagProps {
  hover: HoverInfo | null;
}

export function HoverTag({ hover }: HoverTagProps) {
  if (!hover) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 20,
        transform: "translateX(-50%)",
        background: "rgba(17,17,17,.92)",
        backdropFilter: "blur(16px)",
        border: "1px solid var(--line-2)",
        borderRadius: 8,
        padding: "6px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        pointerEvents: "none",
        fontSize: 12,
        zIndex: 15,
        boxShadow: "0 8px 24px rgba(0,0,0,.4)",
        animation: "fadeUp .18s ease-out",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--primary)",
          boxShadow: "0 0 8px var(--primary)",
        }}
      />
      <span style={{ color: "var(--fg-1)", fontWeight: 500 }}>{hover.label}</span>
      <span style={{ color: "var(--fg-3)", fontFamily: "var(--font-mono)", fontSize: 10.5 }}>
        {hover.meta}
      </span>
    </div>
  );
}
