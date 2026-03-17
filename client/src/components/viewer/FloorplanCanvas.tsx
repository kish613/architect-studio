import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Grid, Html, useProgress } from "@react-three/drei";
import { SceneRenderer } from "./SceneRenderer";
import { CameraController } from "./CameraController";
import { useViewer } from "@/stores/use-viewer";

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white text-sm">{progress.toFixed(0)}%</p>
      </div>
    </Html>
  );
}

function SceneContent() {
  const { showGrid } = useViewer();
  return (
    <>
      <SceneRenderer />
      <CameraController />
      {showGrid && (
        <Grid
          infiniteGrid
          fadeDistance={40}
          fadeStrength={3}
          cellSize={1}
          sectionSize={5}
          cellColor="#2a2a2a"
          sectionColor="#444444"
          position={[0, -0.01, 0]}
        />
      )}
    </>
  );
}

interface FloorplanCanvasProps {
  className?: string;
}

export function FloorplanCanvas({ className = "" }: FloorplanCanvasProps) {
  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [15, 12, 15], fov: 45 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        shadows
      >
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-5, 10, -5]} intensity={0.3} />

        <Suspense fallback={<Loader />}>
          <SceneContent />
          <Environment preset="apartment" />
        </Suspense>
      </Canvas>

      <div className="absolute top-4 left-4 text-xs text-white/60 backdrop-blur-md bg-black/30 px-3 py-2 rounded-lg pointer-events-none">
        <p>Drag to rotate &middot; Scroll to zoom &middot; Right-click to pan</p>
      </div>
    </div>
  );
}
