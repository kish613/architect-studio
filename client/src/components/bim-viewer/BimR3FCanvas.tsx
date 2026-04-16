import { Component, Suspense, useEffect, useState, type ReactNode, type ReactElement } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, Grid, Html, useProgress, ContactShadows, MeshReflectorMaterial } from "@react-three/drei";
import { EffectComposer, N8AO, Bloom, Vignette, DepthOfField, BrightnessContrast, Outline } from "@react-three/postprocessing";
import * as THREE from "three";
import { BimSceneRenderer, type BimSceneRendererProps } from "./BimSceneRenderer";
import { useSelectionOutlineMeshes } from "./SelectionOutline";
import { CameraController } from "@/components/viewer/CameraController";
import { useSelectionClick } from "@/components/viewer/SelectionManager";
import { BimDrawingInteraction } from "./BimDrawingInteraction";
import { useViewer } from "@/stores/use-viewer";
import { useEditor } from "@/stores/use-editor";
import {
  ENVIRONMENT_PRESETS,
  type EnvironmentPreset,
} from "@/lib/bim/environment-presets";
import {
  detectPerformanceTier,
  getPerformanceBudget,
} from "@/lib/bim/performance-budget";

export type BimViewerMode = "editor" | "bim" | "present" | "extract";

/* ---------- helpers --------------------------------------------------- */

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

/**
 * Dynamically updates `gl.toneMappingExposure` when the preset changes.
 * The Canvas `gl` prop only sets the value once at mount time, so we need
 * a child component that writes to the renderer imperatively.
 */
function ToneMappingUpdater({ exposure }: { exposure: number }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  return null;
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
      <CameraController mode={mode} />
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

/**
 * Detects GPU tier on mount and writes the performance budget into the
 * viewer store. Must be rendered inside <Canvas>.
 */
function PerformanceBudgetDetector() {
  const gl = useThree((s) => s.gl);
  const setBudget = useViewer((s) => s.setPerformanceBudget);
  useEffect(() => {
    const tier = detectPerformanceTier(gl);
    const budget = getPerformanceBudget(tier);
    setBudget(budget);
    if (import.meta.env.DEV) {
      console.info(`[PerformanceBudget] Detected tier: ${tier}`, budget);
    }
  }, [gl, setBudget]);
  return null;
}

function PostProcessing({ mode }: { mode: string }) {
  const isPresent = mode === "present";
  const budget = useViewer((s) => s.performanceBudget);
  const dofEnabled = useViewer((s) => s.dofEnabled);
  const dofFocusDistance = useViewer((s) => s.dofFocusDistance);
  const { selectedMeshes, hoveredMeshes } = useSelectionOutlineMeshes();

  // Performance budget overrides — disable effects on low-tier devices
  const showAo = budget ? budget.enableAo : true;
  const showBloom = budget ? budget.enableBloom : true;
  const showDof = isPresent && dofEnabled && (budget ? budget.enableDof : true);

  // EffectComposer requires JSX.Element children (no null/boolean).
  // Build the effect list and cast to satisfy the strict type constraint.
  const effects: ReactElement[] = [];

  if (showAo) {
    effects.push(
      <N8AO
        key="ao"
        aoRadius={isPresent ? 0.2 : 0.3}
        intensity={isPresent ? 0.8 : 1.0}
        distanceFalloff={0.8}
        quality="medium"
      />
    );
  }
  if (showBloom) {
    effects.push(
      <Bloom
        key="bloom"
        luminanceThreshold={0.6}
        luminanceSmoothing={0.5}
        intensity={isPresent ? 0.12 : 0.08}
        radius={0.6}
      />
    );
  }
  if (showDof) {
    effects.push(
      <DepthOfField
        key="dof"
        focusDistance={dofFocusDistance}
        focalLength={0.05}
        bokehScale={3}
      />
    );
  }
  if (selectedMeshes.length > 0) {
    effects.push(
      <Outline
        key="outline-selected"
        selection={selectedMeshes}
        edgeStrength={3}
        pulseSpeed={0}
        visibleEdgeColor={0x4A90FF}
        hiddenEdgeColor={0x2A60BF}
        blur
        xRay={false}
      />
    );
  }
  if (hoveredMeshes.length > 0) {
    effects.push(
      <Outline
        key="outline-hovered"
        selection={hoveredMeshes}
        edgeStrength={2}
        pulseSpeed={0}
        visibleEdgeColor={0x78B4FF}
        hiddenEdgeColor={0x5090DF}
        blur
        xRay={false}
      />
    );
  }
  effects.push(
    <BrightnessContrast key="bc" brightness={0.02} contrast={0.05} />,
    <Vignette key="vig" darkness={isPresent ? 0.15 : 0.2} offset={0.3} />
  );

  return (
    <EffectComposer>
      {effects as unknown as ReactElement}
    </EffectComposer>
  );
}

/**
 * Only renders the ground reflection plane when the performance budget allows it.
 */
function BudgetAwareGroundReflection({ mode }: { mode: BimViewerMode }) {
  const budget = useViewer((s) => s.performanceBudget);
  const show = mode === "present" && (budget ? budget.enableGroundReflection : true);
  if (!show) return null;
  return <GroundReflectionPlane />;
}

function GroundReflectionPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <MeshReflectorMaterial
        blur={[300, 100]}
        resolution={512}
        mixBlur={1}
        mixStrength={0.4}
        roughness={0.9}
        depthScale={1}
        color="#e8e4dc"
        metalness={0.02}
        mirror={0}
      />
    </mesh>
  );
}

/* ---------- HDRI-backed Environment with fallback --------------------- */

/**
 * React error boundary that catches HDRI loading failures inside drei's
 * `<Environment files={...}>` and renders a fallback.
 */
class EnvironmentErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode; resetKey: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[BimR3FCanvas] HDRI load failed, falling back to drei city preset:", error.message);
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    // Reset the boundary when the HDRI URL (resetKey) changes so a new
    // preset gets a fresh attempt.
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/**
 * Wraps drei's `<Environment>` with an error boundary so that if the
 * Poly Haven HDRI fetch fails (CORS, offline, etc.) we fall back to
 * drei's built-in "city" preset which ships as a base64 data-URL.
 */
function HdriEnvironment({
  hdriUrl,
  envIntensity,
}: {
  hdriUrl: string;
  envIntensity: number;
}) {
  const fallback = (
    <Environment
      preset="city"
      background={false}
      environmentIntensity={envIntensity}
    />
  );

  return (
    <EnvironmentErrorBoundary resetKey={hdriUrl} fallback={fallback}>
      <Environment
        files={hdriUrl}
        background={false}
        environmentIntensity={envIntensity}
      />
    </EnvironmentErrorBoundary>
  );
}

/* ---------- Preset-driven lighting ------------------------------------ */

/**
 * Computes effective lighting values from a preset, applying mode-specific
 * multipliers for "present" mode (softer, more ambient).
 */
function getEffectivePreset(
  preset: EnvironmentPreset,
  mode: BimViewerMode,
): EnvironmentPreset {
  if (mode !== "present") return preset;
  return {
    ...preset,
    sunIntensity: preset.sunIntensity * 0.85,
    fillIntensity: preset.fillIntensity * 1.1,
    ambientIntensity: preset.ambientIntensity * 1.2,
    hemisphereIntensity: preset.hemisphereIntensity * 1.1,
    contactShadowOpacity: preset.contactShadowOpacity * 0.8,
  };
}

function PresetLighting({
  preset,
}: {
  preset: EnvironmentPreset;
}) {
  return (
    <>
      <ambientLight intensity={preset.ambientIntensity} />
      <hemisphereLight
        args={[preset.hemisphereTopColor, preset.hemisphereBottomColor, preset.hemisphereIntensity]}
      />
      {/* Sun — primary directional */}
      <directionalLight
        position={preset.sunPosition}
        intensity={preset.sunIntensity}
        color={preset.sunColor}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-bias={preset.shadowBias}
        shadow-normalBias={0.02}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      {/* Fill — secondary directional */}
      <directionalLight
        position={preset.fillPosition}
        intensity={preset.fillIntensity}
        color={preset.fillColor}
      />
    </>
  );
}

/* ---------- main export ----------------------------------------------- */

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
  const environmentPreset = useViewer((s) => s.environmentPreset);

  const rawPreset = ENVIRONMENT_PRESETS[environmentPreset] ?? ENVIRONMENT_PRESETS.daylight;
  const preset = getEffectivePreset(rawPreset, mode);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <Canvas
        camera={{ position: [15, 12, 15], fov: 45 }}
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: preset.toneMappingExposure,
        }}
        shadows
      >
        {/* Dynamic tone-mapping exposure (Canvas gl prop only sets at mount) */}
        <ToneMappingUpdater exposure={preset.toneMappingExposure} />
        <PerformanceBudgetDetector />

        {/* Preset-driven lights */}
        <PresetLighting preset={preset} />

        <Suspense fallback={<Loader />}>
          <SceneContent sceneProps={sceneProps} mode={mode} />
          {!readOnly && <SelectionHandler />}
          <CanvasInteractionBindings mode={mode} />

          {/* HDRI environment with fallback to drei "city" preset */}
          <HdriEnvironment
            hdriUrl={preset.hdriUrl}
            envIntensity={preset.envIntensity}
          />

          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={preset.contactShadowOpacity}
            scale={50}
            blur={2.5}
            far={20}
          />
          <BudgetAwareGroundReflection mode={mode} />
          <PostProcessing mode={mode} />
        </Suspense>
      </Canvas>
    </div>
  );
}
