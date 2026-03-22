import { Viewer } from "@pascal-app/viewer";
import { DrawingInteraction } from "./DrawingInteraction";
import { Grid } from "@react-three/drei";
import { useViewer } from "@/stores/use-viewer";

export function FloorplanCanvas({ className = "" }: { className?: string }) {
  const showGrid = useViewer((s) => s.showGrid);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Viewer selectionManager="default" perf={false}>
        {showGrid && (
          <Grid
            infiniteGrid
            fadeDistance={40}
            fadeStrength={3}
            cellSize={1}
            sectionSize={5}
            cellColor="#3a3a3a"
            sectionColor="#555555"
            position={[0, -0.01, 0]}
          />
        )}
        <DrawingInteraction />
      </Viewer>

      <div className="absolute top-4 left-4 text-xs text-white/60 backdrop-blur-md bg-black/30 px-3 py-2 rounded-lg pointer-events-none">
        <p>Drag to rotate &middot; Scroll to zoom &middot; Right-click to pan</p>
      </div>
    </div>
  );
}
