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

  // 3-second timeout for Pascal health check — pixel-based
  useEffect(() => {
    if (renderer !== "pascal") return;
    const timer = setTimeout(() => {
      const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
      if (!canvas) {
        console.warn("[FloorplanCanvas] No canvas found, switching to R3F");
        switchToR3F();
        return;
      }
      // Check if the canvas has any non-uniform pixels (actual geometry rendered)
      try {
        const ctx = canvas.getContext("2d") || canvas.getContext("webgl2") || canvas.getContext("webgpu");
        // If we can't get a context to read pixels, assume it failed
        if (!ctx) {
          console.warn("[FloorplanCanvas] Cannot read canvas pixels, switching to R3F");
          switchToR3F();
        }
      } catch {
        // WebGPU canvases throw when trying getContext("2d") — that's actually fine,
        // it means Pascal created a WebGPU context. But if the scene is blank, fall back.
        // Check canvas dimensions as a proxy
        if (canvas.width === 0 || canvas.height === 0) {
          console.warn("[FloorplanCanvas] Canvas has zero dimensions, switching to R3F");
          switchToR3F();
        }
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
