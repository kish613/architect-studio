import { FloorplanCanvas } from "@/components/viewer/FloorplanCanvas";
import { Model3DViewer } from "@/components/viewer/Model3DViewer";
import { R3FCanvas } from "@/components/viewer/R3FCanvas";
import { Box } from "lucide-react";
import type { ViewerMode } from "./ModeSwitcher";

interface CanvasSurfaceProps {
  mode: ViewerMode;
  hasPascal: boolean;
  modelUrl: string | null | undefined;
  isometricUrl?: string | null;
  onGenerate: () => void;
}

function ThreeDSurface({ hasPascal, modelUrl, isometricUrl, onGenerate }: Omit<CanvasSurfaceProps, "mode">) {
  if (hasPascal) return <R3FCanvas />;
  if (modelUrl) return <Model3DViewer modelUrl={modelUrl} isometricUrl={isometricUrl || undefined} />;
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <div style={{
        padding: "28px 32px", borderRadius: 16, maxWidth: 420, textAlign: "center",
        background: "rgba(17,17,17,.72)", backdropFilter: "blur(20px)",
        border: "1px solid var(--line-2)", boxShadow: "var(--shadow-glass-dark)",
      }}>
        <Box style={{ width: 40, height: 40, margin: "0 auto 12px", color: "var(--primary)" }} />
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--fg-1)", marginBottom: 6 }}>
          No 3D model yet
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 16 }}>
          Generate a Pascal BIM scene or a Meshy mesh to explore in 3D.
        </div>
        <button
          onClick={onGenerate}
          className="sb-btn sb-btn-primary"
          style={{ height: 36, padding: "0 16px" }}
        >
          Generate 3D
        </button>
      </div>
    </div>
  );
}

export function CanvasSurface(props: CanvasSurfaceProps) {
  const { mode, hasPascal, modelUrl, isometricUrl, onGenerate } = props;

  if (mode === "2d") {
    return <FloorplanCanvas />;
  }
  if (mode === "split") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1px 1fr" }}>
        <div style={{ position: "relative" }}>
          <FloorplanCanvas />
        </div>
        <div style={{ background: "var(--line-2)" }} />
        <div style={{ position: "relative" }}>
          <ThreeDSurface hasPascal={hasPascal} modelUrl={modelUrl} isometricUrl={isometricUrl} onGenerate={onGenerate} />
        </div>
      </div>
    );
  }
  return <ThreeDSurface hasPascal={hasPascal} modelUrl={modelUrl} isometricUrl={isometricUrl} onGenerate={onGenerate} />;
}
