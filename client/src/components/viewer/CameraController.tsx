import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useViewer } from "@/stores/use-viewer";
import type { CameraPreset } from "@/stores/use-viewer";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { getViewerInteractionConfig } from "@/lib/viewer/interaction";

const CAMERA_PRESETS: Record<string, { position: [number, number, number]; target: [number, number, number] }> = {
  perspective: { position: [15, 12, 15], target: [0, 0, 0] },
  top: { position: [0, 30, 0.01], target: [0, 0, 0] },
  front: { position: [0, 5, 20], target: [0, 5, 0] },
  right: { position: [20, 5, 0], target: [0, 5, 0] },
  isometric: { position: [15, 15, 15], target: [0, 0, 0] },
};

/** Ease-in-out cubic: smooth acceleration and deceleration */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const TRANSITION_DURATION = 0.8; // seconds

export function CameraController({ mode }: { mode?: string }) {
  const { cameraMode, cameraPreset, setCameraNavigating } = useViewer();
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const targetPos = useRef(new THREE.Vector3(15, 12, 15));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const startPos = useRef(new THREE.Vector3(15, 12, 15));
  const startLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const animStartTime = useRef(0);
  const isAnimating = useRef(false);
  const interaction = useMemo(
    () => getViewerInteractionConfig("editor", { cameraMode, cameraPreset }),
    [cameraMode, cameraPreset]
  );

  useEffect(() => {
    const presetKey: CameraPreset = cameraMode === "orthographic" ? "top" : (cameraPreset ?? "perspective");
    const preset = CAMERA_PRESETS[presetKey];
    if (!preset) return;

    // Capture current camera state as animation start point
    startPos.current.copy(camera.position);
    if (controlsRef.current) {
      startLookAt.current.copy(controlsRef.current.target);
    }

    targetPos.current.set(...preset.position);
    targetLookAt.current.set(...preset.target);
    animStartTime.current = performance.now();
    isAnimating.current = true;
  }, [cameraMode, cameraPreset, camera]);

  useEffect(() => () => setCameraNavigating(false), [setCameraNavigating]);

  useFrame(() => {
    if (!isAnimating.current) return;

    const elapsed = (performance.now() - animStartTime.current) / 1000;
    const rawT = Math.min(elapsed / TRANSITION_DURATION, 1);
    const t = easeInOutCubic(rawT);

    camera.position.lerpVectors(startPos.current, targetPos.current, t);
    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(startLookAt.current, targetLookAt.current, t);
      controlsRef.current.update();
    }

    if (rawT >= 1) {
      camera.position.copy(targetPos.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt.current);
        controlsRef.current.update();
      }
      isAnimating.current = false;
    }
  });

  const autoRotateSpeed = useViewer((s) => s.autoRotateSpeed);
  const isPresent = mode === "present";

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      enableRotate={interaction.enableRotate}
      enableDamping={interaction.enableDamping}
      dampingFactor={interaction.dampingFactor}
      mouseButtons={interaction.mouseButtons}
      touches={interaction.touches}
      minDistance={2}
      maxDistance={60}
      maxPolarAngle={interaction.maxPolarAngle}
      autoRotate={isPresent || autoRotateSpeed > 0}
      autoRotateSpeed={isPresent ? 0.3 : autoRotateSpeed}
      onStart={() => setCameraNavigating(true)}
      onEnd={() => setCameraNavigating(false)}
    />
  );
}
