import { useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { SceneRenderer } from "./SceneRenderer";
import { CameraController } from "./CameraController";
import { DrawingInteraction } from "./DrawingInteraction";
import { EditOverlay } from "./EditOverlay";
import { ViewerToolbar } from "./ViewerToolbar";
import { useViewer } from "@/stores/use-viewer";
import { useSelectionClick } from "./SelectionManager";
import * as THREE from "three";

interface FloorplanCanvasProps {
  className?: string;
  showToolbar?: boolean;
}

/** Thin wrapper inside Canvas that wires up pointer-based selection */
function CanvasSelectionHandler({ children }: { children?: React.ReactNode }) {
  const { handlePointerDown } = useSelectionClick();
  return <group onPointerDown={handlePointerDown as any}>{children}</group>;
}

export function FloorplanCanvas({ className = "", showToolbar = false }: FloorplanCanvasProps) {
  const theme = useViewer((s) => s.theme);
  const showGrid = useViewer((s) => s.showGrid);

  const bgColor = theme === "dark" ? "#1a1a2e" : "#f0f0f0";

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        shadows
        camera={{ position: [15, 12, 15], fov: 50, near: 0.1, far: 200 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        style={{ background: bgColor }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <hemisphereLight
          args={[theme === "dark" ? "#1a1a3e" : "#b1e1ff", theme === "dark" ? "#111122" : "#b97a20", 0.3]}
        />

        {/* Grid */}
        {showGrid && (
          <gridHelper
            args={[40, 40, theme === "dark" ? "#333355" : "#cccccc", theme === "dark" ? "#222244" : "#e0e0e0"]}
          />
        )}

        {/* Camera controls */}
        <CameraController />

        {/* Scene content */}
        <SceneRenderer />
        <DrawingInteraction />
        <EditOverlay />
      </Canvas>
      {showToolbar && <ViewerToolbar />}
    </div>
  );
}
