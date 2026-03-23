import { useEffect } from "react";
import { Viewer } from "@pascal-app/viewer";
import { DrawingInteraction } from "@/components/viewer/DrawingInteraction";
import { EditOverlay } from "@/components/viewer/EditOverlay";
import { initPascalSelectionSync } from "@/stores/use-viewer";

interface FloorplanCanvasProps {
  className?: string;
}

export function FloorplanCanvas({ className = "" }: FloorplanCanvasProps) {
  // Bidirectional selection sync: Pascal -> Our Store
  useEffect(() => {
    const unsub = initPascalSelectionSync();
    return unsub;
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Viewer selectionManager="default" perf={false}>
        <DrawingInteraction />
        <EditOverlay />
      </Viewer>

      <div className="absolute top-4 left-4 text-xs text-white/60 backdrop-blur-md bg-black/30 px-3 py-2 rounded-lg pointer-events-none">
        <p>Drag to rotate &middot; Scroll to zoom &middot; Right-click to pan</p>
      </div>
    </div>
  );
}
