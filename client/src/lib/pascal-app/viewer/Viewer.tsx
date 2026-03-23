import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useViewer } from "./use-viewer";
import { PascalSceneRenderer } from "./PascalSceneRenderer";
import { CameraController } from "@/components/viewer/CameraController";

interface ViewerProps {
  children?: ReactNode;
  selectionManager?: "default" | "none";
  perf?: boolean;
}

function SceneLighting({ theme }: { theme: "dark" | "light" }) {
  return (
    <>
      <ambientLight intensity={theme === "dark" ? 0.3 : 0.5} />
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
        args={[
          theme === "dark" ? "#1a1a3e" : "#b1e1ff",
          theme === "dark" ? "#111122" : "#b97a20",
          0.3,
        ]}
      />
    </>
  );
}

function SceneGrid({ theme }: { theme: "dark" | "light" }) {
  const showGrid = useViewer((s) => s.showGrid);
  if (!showGrid) return null;
  return (
    <gridHelper
      args={[
        40,
        40,
        theme === "dark" ? "#333355" : "#cccccc",
        theme === "dark" ? "#222244" : "#e0e0e0",
      ]}
    />
  );
}

export function Viewer({ children, selectionManager: _sm, perf: _perf }: ViewerProps) {
  const theme = useViewer((s) => s.theme);
  const bgColor = theme === "dark" ? "#1a1a2e" : "#f0f0f0";

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas
        shadows
        camera={{ position: [15, 12, 15], fov: 50, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        style={{ background: bgColor }}
      >
        <SceneLighting theme={theme} />
        <SceneGrid theme={theme} />
        <CameraController />
        <PascalSceneRenderer />
        {children}
      </Canvas>
    </div>
  );
}
