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

export function CameraController() {
  const { cameraMode, cameraPreset, setCameraNavigating } = useViewer();
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const targetPos = useRef(new THREE.Vector3(15, 12, 15));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const isAnimating = useRef(false);
  const interaction = useMemo(
    () => getViewerInteractionConfig("editor", { cameraMode, cameraPreset }),
    [cameraMode, cameraPreset]
  );

  useEffect(() => {
    const presetKey: CameraPreset = cameraMode === "orthographic" ? "top" : (cameraPreset ?? "perspective");
    const preset = CAMERA_PRESETS[presetKey];
    if (!preset) return;

    targetPos.current.set(...preset.position);
    targetLookAt.current.set(...preset.target);
    isAnimating.current = true;
  }, [cameraMode, cameraPreset, camera]);

  useEffect(() => () => setCameraNavigating(false), [setCameraNavigating]);

  useFrame(() => {
    if (!isAnimating.current) return;

    camera.position.lerp(targetPos.current, 0.08);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, 0.08);
      controlsRef.current.update();
    }

    if (camera.position.distanceTo(targetPos.current) < 0.05) {
      camera.position.copy(targetPos.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt.current);
        controlsRef.current.update();
      }
      isAnimating.current = false;
    }
  });

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
      onStart={() => setCameraNavigating(true)}
      onEnd={() => setCameraNavigating(false)}
    />
  );
}
