import { useState, useEffect, useCallback } from "react";
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

  const toggleRenderer = useCallback(() => {
    const next = renderer === "pascal" ? "r3f" : "pascal";
    setPreferredRenderer(next);
    setRenderer(next);
  }, [renderer]);

  // 3-second timeout for Pascal health check
  useEffect(() => {
    if (renderer !== "pascal") return;
    const timer = setTimeout(() => {
      const canvas = document.querySelector("canvas[data-engine]");
      if (!canvas) {
        console.warn("[FloorplanCanvas] Pascal did not render within 3s, switching to R3F");
        switchToR3F();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [renderer, switchToR3F]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {renderer === "pascal" ? (
        <PascalRenderBoundary
          title="Pascal renderer crashed"
          description="Automatically switching to standard renderer."
          onReset={switchToR3F}
          resetKeys={[renderer]}
        >
          <PascalCanvas />
        </PascalRenderBoundary>
      ) : (
        <R3FCanvas />
      )}
      {showToolbar && <ViewerToolbar onToggleRenderer={toggleRenderer} activeRenderer={renderer} />}
    </div>
  );
}
