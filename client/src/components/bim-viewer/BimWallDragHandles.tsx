import { useState, useCallback, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Wall } from "@shared/bim/canonical-schema";
import { useBimScene } from "@/stores/use-bim-scene";

const raycaster = new THREE.Raycaster();
const mouseVec = new THREE.Vector2();
const intersectionPt = new THREE.Vector3();

function snap(v: number): number {
  return Math.round(v * 20) / 20;
}

type DragEnd = "start" | "end";

function DragHandle({
  wall,
  which,
  levelElevation,
}: {
  wall: Wall;
  which: DragEnd;
  levelElevation: number;
}) {
  const updateWall = useBimScene((s) => s.updateWall);
  const { camera, gl } = useThree();
  const [hovered, setHovered] = useState(false);
  const dragging = useRef(false);

  const pos = which === "start" ? wall.start : wall.end;
  const halfHeight = levelElevation + wall.height / 2;

  const getGroundPoint = useCallback(
    (e: PointerEvent): { x: number; z: number } | null => {
      const rect = gl.domElement.getBoundingClientRect();
      mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseVec, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -levelElevation);
      if (raycaster.ray.intersectPlane(plane, intersectionPt)) {
        return { x: snap(intersectionPt.x), z: snap(intersectionPt.z) };
      }
      return null;
    },
    [camera, gl, levelElevation],
  );

  const onPointerDown = useCallback(
    (e: THREE.Event & { stopPropagation: () => void; nativeEvent: PointerEvent }) => {
      e.stopPropagation();
      dragging.current = true;
      (e.nativeEvent.target as HTMLElement)?.setPointerCapture?.(e.nativeEvent.pointerId);
      const canvas = gl.domElement;

      const onMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const pt = getGroundPoint(ev);
        if (!pt) return;
        const patch =
          which === "start"
            ? { start: { x: pt.x, z: pt.z } }
            : { end: { x: pt.x, z: pt.z } };
        updateWall(wall.id, patch);
      };

      const onUp = () => {
        dragging.current = false;
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
      };

      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
    },
    [gl, getGroundPoint, which, wall.id, updateWall],
  );

  const color = dragging.current ? "#FFFFFF" : hovered ? "#FFB800" : "#FF6B35";

  return (
    <mesh
      position={[pos.x, halfHeight, pos.z]}
      onPointerDown={onPointerDown as unknown as () => void}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        toneMapped={false}
      />
    </mesh>
  );
}

export function BimWallDragHandles({ wall, levelElevation }: { wall: Wall; levelElevation: number }) {
  return (
    <>
      <DragHandle wall={wall} which="start" levelElevation={levelElevation} />
      <DragHandle wall={wall} which="end" levelElevation={levelElevation} />
    </>
  );
}
