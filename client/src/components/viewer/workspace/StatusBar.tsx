import {
  CheckCircle2,
  Ruler,
  Square,
  Cpu,
  Gauge,
  Layers,
  GitBranch,
} from "lucide-react";

export interface StatusBarProps {
  saved?: boolean;
  savedLabel?: string;
  dims?: string;
  area?: string;
  roomCount?: number;
  triCount?: number;
  fps?: number;
  layerCount?: number;
  layerMax?: number;
  version?: string;
}

export function StatusBar({
  saved = true,
  savedLabel = "Saved · just now",
  dims,
  area,
  roomCount,
  triCount = 0,
  fps = 60,
  layerCount,
  layerMax = 8,
  version,
}: StatusBarProps) {
  const iconStyle = { width: 11, height: 11 };
  return (
    <footer className="sb-statusbar">
      <div className="sb-stat-group">
        {saved && (
          <div className="sb-stat ok">
            <CheckCircle2 style={iconStyle} />
            {savedLabel}
          </div>
        )}
        {dims && (
          <div className="sb-stat">
            <Ruler style={iconStyle} />
            <b>{dims}</b>
          </div>
        )}
        {area && (
          <div className="sb-stat">
            <Square style={iconStyle} />
            <b>{area}</b>
            {typeof roomCount === "number" && <> · {roomCount} rooms</>}
          </div>
        )}
      </div>
      <div className="sb-stat-group">
        <div className="sb-stat">
          <Cpu style={iconStyle} />
          Mesh <b>{formatTris(triCount)}</b> tris
        </div>
        <div className="sb-stat">
          <Gauge style={iconStyle} />
          FPS <b>{fps}</b>
        </div>
        {typeof layerCount === "number" && (
          <div className="sb-stat">
            <Layers style={iconStyle} />
            Layer <b>{layerCount}</b>/{layerMax}
          </div>
        )}
        {version && (
          <div className="sb-stat">
            <GitBranch style={iconStyle} />
            {version}
          </div>
        )}
      </div>
    </footer>
  );
}

function formatTris(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
