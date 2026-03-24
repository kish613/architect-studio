import { useState, useCallback } from "react";
import { PascalCanvas } from "./PascalCanvas";
import { R3FCanvas } from "./R3FCanvas";
import { PascalRenderBoundary } from "@/components/pascal/PascalRenderBoundary";
import { ViewerToolbar } from "./ViewerToolbar";
import { getPreferredRenderer, setPreferredRenderer, type RendererType } from "./RendererHealthCheck";

interface FloorplanCanvasProps {
  className?: string;
  showToolbar?: boolean;
}

export function FloorplanCanvas({ className = "", showToolbar = false }: FloorplanCanvasProps) {
  const [renderer, setRenderer] = useState<RendererType>(getPreferredRenderer);

  const switchToR3F = useCallback(() => {
    setPreferredRenderer("r3f");
    setRenderer("r3f");
  }, []);

  const handlePascalFailed = useCallback(() => {
    console.warn("[FloorplanCanvas] Pascal failed, switching to R3F immediately");
    setPreferredRenderer("r3f");
    setRenderer("r3f");
  }, []);

  const toggleRenderer = useCallback(() => {
    const next = renderer === "pascal" ? "r3f" : "pascal";
    setPreferredRenderer(next);
    setRenderer(next);
  }, [renderer]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {renderer === "pascal" ? (
        <PascalRenderBoundary
          title="Pascal renderer crashed"
          description="Automatically switching to standard renderer."
          onReset={switchToR3F}
          resetKeys={[renderer]}
        >
          <PascalCanvas onFailed={handlePascalFailed} />
        </PascalRenderBoundary>
      ) : (
        <R3FCanvas />
      )}
      {showToolbar && <ViewerToolbar onToggleRenderer={toggleRenderer} activeRenderer={renderer} />}
    </div>
  );
}
