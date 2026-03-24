import { useState, useCallback } from "react";
import { PascalCanvas } from "./PascalCanvas";
import { R3FCanvas } from "./R3FCanvas";
import { PascalRenderBoundary } from "@/components/pascal/PascalRenderBoundary";
import { ViewerToolbar } from "./ViewerToolbar";
import { type RendererType } from "./RendererHealthCheck";

interface FloorplanCanvasProps {
  className?: string;
  showToolbar?: boolean;
}

export function FloorplanCanvas({ className = "", showToolbar = false }: FloorplanCanvasProps) {
  // Always START with Pascal — don't read from localStorage.
  // If Pascal fails, fall back to R3F for THIS SESSION only.
  // Next page load will try Pascal fresh (no sticky localStorage).
  const [renderer, setRenderer] = useState<RendererType>("pascal");

  const switchToR3F = useCallback(() => {
    setRenderer("r3f");
  }, []);

  const handlePascalFailed = useCallback(() => {
    console.warn("[FloorplanCanvas] Pascal failed this session, switching to R3F");
    setRenderer("r3f");
  }, []);

  const toggleRenderer = useCallback(() => {
    const next = renderer === "pascal" ? "r3f" : "pascal";
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
