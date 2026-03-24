import { Suspense, useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, Grid, Html, useProgress, ContactShadows } from "@react-three/drei";
import { EffectComposer, N8AO, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { SceneRenderer } from "./SceneRenderer";
import { CameraController } from "./CameraController";
import { useViewer } from "@/stores/use-viewer";
import { useSelectionClick } from "./SelectionManager";
import { DrawingInteraction } from "./DrawingInteraction";
import { useEditor } from "@/stores/use-editor";
import { getViewerInteractionConfig } from "@/lib/viewer/interaction";

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

function SelectionHandler() {
  const { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } = useSelectionClick();
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerCancel);
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [gl, handlePointerCancel, handlePointerDown, handlePointerMove, handlePointerUp]);

  return null;
}

function CanvasInteractionBindings() {
  const { gl } = useThree();
  const activeTool = useEditor((s) => s.activeTool);
  const isCameraNavigating = useViewer((s) => s.isCameraNavigating);

  useEffect(() => {
    const canvas = gl.domElement;
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    canvas.addEventListener("contextmenu", onContextMenu);
    return () => canvas.removeEventListener("contextmenu", onContextMenu);
  }, [gl]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.style.cursor = isCameraNavigating ? "grabbing" : activeTool === "select" ? "default" : "crosshair";
    return () => {
      canvas.style.cursor = "";
    };
  }, [activeTool, gl, isCameraNavigating]);

  return null;
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
          cellColor="#3a3a3a"
          sectionColor="#555555"
          position={[0, -0.01, 0]}
        />
      )}
    </>
  );
}

function PostProcessing() {
  return (
    <EffectComposer>
      <N8AO aoRadius={0.5} intensity={2} distanceFalloff={1} />
      <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.4} intensity={0.15} />
      <Vignette darkness={0.3} offset={0.3} />
    </EffectComposer>
  );
}

interface R3FCanvasProps {
  className?: string;
}

export function R3FCanvas({ className = "" }: R3FCanvasProps) {
  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [15, 12, 15], fov: 45 }}
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        shadows
      >
        {/* Lighting */}
        <ambientLight intensity={0.25} />
        <hemisphereLight args={["#b1e1ff", "#b97a20", 0.25]} />
        <directionalLight
          position={[8, 20, 12]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={4096}
          shadow-mapSize-height={4096}
          shadow-bias={-0.0001}
          shadow-normalBias={0.02}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
        />
        <directionalLight position={[-6, 8, -4]} intensity={0.3} />

        <Suspense fallback={<Loader />}>
          <SceneContent />
          <SelectionHandler />
          <CanvasInteractionBindings />
          <DrawingInteraction />
          <Environment preset="city" background={false} environmentIntensity={0.5} />
          <ContactShadows position={[0, -0.01, 0]} opacity={0.35} scale={50} blur={2.5} far={20} />
          <PostProcessing />
        </Suspense>
      </Canvas>
    </div>
  );
}
