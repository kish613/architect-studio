import { Suspense, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Html, useProgress } from "@react-three/drei";
import { useCADStore } from "@/hooks/use-cad-params";
import { ExtensionMesh } from "./ExtensionMesh";
import { PropertyBaseMesh } from "./PropertyBaseMesh";
import { DimensionAnnotations } from "./DimensionAnnotations";
import * as THREE from "three";

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
  const { sceneParams } = useCADStore();
  const { property, extensions, showDimensions } = sceneParams;

  return (
    <>
      {/* Existing property outline */}
      <PropertyBaseMesh params={property} />

      {/* Extension models */}
      {extensions.map((ext, i) => (
        <ExtensionMesh key={`${ext.type}-${i}`} params={ext} propertyBase={property} />
      ))}

      {/* Dimension annotations */}
      <DimensionAnnotations
        extensions={extensions}
        property={property}
        visible={showDimensions}
      />

      {/* Ground grid: 1m cells, 5m sections */}
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
    </>
  );
}

interface CADViewerProps {
  className?: string;
  sceneRef?: React.MutableRefObject<THREE.Group | null>;
}

export function CADViewer({ className = "", sceneRef }: CADViewerProps) {
  const groupRef = useRef<THREE.Group>(null!);

  const handleCreated = useCallback(
    ({ scene }: { scene: THREE.Scene }) => {
      if (sceneRef) {
        // Find the group in the scene for STL export
        const group = scene.children.find((c) => c.type === "Group") as THREE.Group;
        if (group) sceneRef.current = group;
      }
    },
    [sceneRef]
  );

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [15, 12, 15], fov: 45 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        shadows
        onCreated={handleCreated}
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
          <group ref={groupRef}>
            <SceneContent />
          </group>
          <Environment preset="apartment" />
        </Suspense>

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={3}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>

      {/* Help text */}
      <div className="absolute top-4 left-4 text-xs text-white/60 backdrop-blur-md bg-black/30 px-3 py-2 rounded-lg pointer-events-none">
        <p>Drag to rotate &bull; Scroll to zoom &bull; Right-click to pan</p>
      </div>
    </div>
  );
}
