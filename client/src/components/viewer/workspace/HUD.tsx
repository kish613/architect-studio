interface HUDProps {
  mode: "2d" | "3d" | "split";
  rot?: number;
}

export function HUD({ mode, rot = 0 }: HUDProps) {
  return (
    <>
      <div className="sb-hud-coords">
        <span>{mode.toUpperCase()}</span>
        <div className="dot" />
        <span>
          x <b style={{ color: "var(--fg-1)" }}>0.00</b>
        </span>
        <span>
          y <b style={{ color: "var(--fg-1)" }}>0.00</b>
        </span>
        {mode === "3d" && (
          <>
            <div className="dot" />
            <span>
              rot <b style={{ color: "var(--fg-1)" }}>{rot}°</b>
            </span>
          </>
        )}
      </div>
      <div className="sb-hud-scale">
        <span>1:50</span>
        <div className="sb-hud-scale-bar" />
        <span>1m</span>
      </div>
    </>
  );
}
