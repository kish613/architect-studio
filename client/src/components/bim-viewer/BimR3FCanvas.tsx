import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, Grid, Html, useProgress, ContactShadows } from "@react-three/drei";
import { EffectComposer, N8AO, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { BimSceneRenderer, type BimSceneRendererProps } from "./BimSceneRenderer";
import { CameraController } from "@/components/viewer/CameraController";
import { useSelectionClick } from "@/components/viewer/SelectionManager";
import { BimDrawingInteraction } from "./BimDrawingInteraction";
import { useViewer } from "@/stores/use-viewer";
import { useEditor } from "@/stores/use-editor";
export type BimViewerMode = "editor" | "bim" | "present" | "extract";

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-center">
        <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        <p className="text-sm text-white">{progress.toFixed(0)}%</p>
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

function CanvasInteractionBindings({ mode }: { mode: BimViewerMode }) {
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
    const readOnly = mode === "present" || mode === "extract";
    const tool = readOnly ? "select" : activeTool;
    canvas.style.cursor =
      isCameraNavigating ? "grabbing" : tool === "select" ? "default" : "crosshair";
    return () => {
      canvas.style.cursor = "";
    };
  }, [activeTool, gl, isCameraNavigating, mode]);

  return null;
}

function SceneContent({
  sceneProps,
  mode,
}: {
  sceneProps?: BimSceneRendererProps;
  mode: BimViewerMode;
}) {
  const { showGrid } = useViewer();
  const readOnly = mode === "present" || mode === "extract";
  return (
    <>
      <BimSceneRenderer {...sceneProps} />
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
      {!readOnly && <BimDrawingInteraction />}
    </>
  );
}

function PostProcessing({ soft }: { soft?: boolean }) {
  return (
    <EffectComposer>
      <N8AO aoRadius={soft ? 0.35 : 0.5} intensity={soft ? 1.4 : 2} distanceFalloff={1} />
      <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.4} intensity={soft ? 0.1 : 0.15} />
      <Vignette darkness={soft ? 0.2 : 0.3} offset={0.3} />
    </EffectComposer>
  );
}

export interface BimR3FCanvasProps {
  className?: string;
  mode?: BimViewerMode;
  sceneProps?: BimSceneRendererProps;
}

export function BimR3FCanvas({
  className = "",
  mode = "bim",
  sceneProps,
}: BimR3FCanvasProps) {
  const readOnly = mode === "present" || mode === "extract";
  const envIntensity = mode === "present" ? 0.65 : 0.5;
  const toneExp = mode === "present" ? 1.05 : 1.1;

  return (
    <div className={`relative h-full w-full ${className}`}>
      <Canvas
        camera={{ position: [15, 12, 15], fov: 45 }}
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: toneExp,
        }}
        shadows
      >
        <ambientLight intensity={mode === "present" ? 0.35 : 0.25} />
        <hemisphereLight args={["#b1e1ff", "#b97a20", mode === "present" ? 0.35 : 0.25]} />
        <directionalLight
          position={[8, 20, 12]}
          intensity={mode === "present" ? 1.0 : 1.2}
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
        <directionalLight position={[-6, 8, -4]} intensity={mode === "present" ? 0.35 : 0.3} />

        <Suspense fallback={<Loader />}>
          <SceneContent sceneProps={sceneProps} mode={mode} />
          {mode !== "present" && <SelectionHandler />}
          <CanvasInteractionBindings mode={mode} />
          <Environment preset="city" background={false} environmentIntensity={envIntensity} />
          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={mode === "present" ? 0.28 : 0.35}
            scale={50}
            blur={2.5}
            far={20}
          />
          <PostProcessing soft={mode === "present"} />
        </Suspense>
      </Canvas>
    </div>
  );
}
