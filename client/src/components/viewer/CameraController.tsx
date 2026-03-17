import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useViewer } from "@/stores/use-viewer";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export function CameraController() {
  const { cameraMode } = useViewer();
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (cameraMode === "orthographic") {
      // Switch to orthographic-like view by setting camera properties
      camera.position.set(0, 20, 0);
      camera.lookAt(0, 0, 0);
      if (controlsRef.current) {
        controlsRef.current.maxPolarAngle = 0.01;
        controlsRef.current.update();
      }
    } else {
      camera.position.set(15, 12, 15);
      camera.lookAt(0, 0, 0);
      if (controlsRef.current) {
        controlsRef.current.maxPolarAngle = Math.PI / 2.1;
        controlsRef.current.update();
      }
    }
  }, [cameraMode, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      enableRotate
      minDistance={2}
      maxDistance={60}
      maxPolarAngle={cameraMode === "orthographic" ? 0.01 : Math.PI / 2.1}
    />
  );
}
