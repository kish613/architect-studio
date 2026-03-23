import { useEffect } from "react";
import { Viewer } from "@pascal-app/viewer";
import { DrawingInteraction } from "./DrawingInteraction";
import { EditOverlay } from "./EditOverlay";
import { ViewerToolbar } from "./ViewerToolbar";
import { initPascalSelectionSync } from "@/stores/use-viewer";

interface FloorplanCanvasProps {
  className?: string;
  showToolbar?: boolean;
}

export function FloorplanCanvas({ className = "", showToolbar = false }: FloorplanCanvasProps) {
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
      {showToolbar && <ViewerToolbar />}
    </div>
  );
}
