import { useEffect } from "react";
import { Viewer } from "@pascal-app/viewer";
import { DrawingInteraction } from "./DrawingInteraction";
import { EditOverlay } from "./EditOverlay";
import { initPascalSelectionSync } from "@/stores/use-viewer";

interface PascalCanvasProps {
  className?: string;
}

export function PascalCanvas({ className = "" }: PascalCanvasProps) {
  useEffect(() => {
    const unsub = initPascalSelectionSync();
    return unsub;
  }, []);

  return (
    <div className={`w-full h-full ${className}`}>
      <Viewer selectionManager="default" perf={false}>
        <DrawingInteraction />
        <EditOverlay />
      </Viewer>
    </div>
  );
}
