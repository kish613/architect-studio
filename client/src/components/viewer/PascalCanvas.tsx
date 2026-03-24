import React, { useEffect, useState } from "react";
import { Viewer } from "@pascal-app/viewer";
import { DrawingInteraction } from "./DrawingInteraction";
import { EditOverlay } from "./EditOverlay";
import { initPascalSelectionSync } from "@/stores/use-viewer";
import { isPascalSceneReady } from "@/stores/pascal-bridge";

class PascalErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) {
    console.error("[PascalCanvas] Render error:", error);
    this.props.onError?.();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

interface PascalCanvasProps {
  className?: string;
  onFailed?: () => void;
}

export function PascalCanvas({ className = "", onFailed }: PascalCanvasProps) {
  const [ready, setReady] = useState(() => isPascalSceneReady());

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    const start = Date.now();
    const interval = setInterval(() => {
      if (isPascalSceneReady()) {
        setReady(true);
        clearInterval(interval);
        return;
      }
      if (Date.now() - start > 5000) {
        clearInterval(interval);
        if (!cancelled) {
          console.warn("[PascalCanvas] Scene not ready after 5s, failing");
          onFailed?.();
        }
      }
    }, 100);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [ready, onFailed]);

  useEffect(() => {
    const unsub = initPascalSelectionSync();
    return unsub;
  }, []);

  if (!ready) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <div className="text-muted-foreground text-sm animate-pulse">Loading Pascal renderer...</div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <PascalErrorBoundary onError={onFailed}>
        <Viewer selectionManager="default" perf={false}>
          <DrawingInteraction />
          <EditOverlay />
        </Viewer>
      </PascalErrorBoundary>
    </div>
  );
}
