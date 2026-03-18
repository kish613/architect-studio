import { useState, useCallback, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useScene } from "@/stores/use-scene";
import type { WallNode } from "@/lib/pascal/schemas";

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const mouseVec = new THREE.Vector2();
const intersectionPt = new THREE.Vector3();

type DragEnd = "start" | "end";

function snap(v: number): number {
  return Math.round(v * 20) / 20; // 0.05m grid
}

function DragHandle({
  wall,
  which,
}: {
  wall: WallNode;
  which: DragEnd;
}) {
  const updateNode = useScene((s) => s.updateNode);
  const { camera, gl } = useThree();

  const [hovered, setHovered] = useState(false);
  const dragging = useRef(false);

  const pos = which === "start" ? wall.start : wall.end;
  const halfHeight = (wall.height ?? 2.7) / 2;

  const getGroundPoint = useCallback(
    (e: PointerEvent): { x: number; z: number } | null => {
      const rect = gl.domElement.getBoundingClientRect();
      mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseVec, camera);
      if (raycaster.ray.intersectPlane(groundPlane, intersectionPt)) {
        return { x: snap(intersectionPt.x), z: snap(intersectionPt.z) };
      }
      return null;
    },
    [camera, gl],
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
        const update =
          which === "start"
            ? { start: { x: pt.x, y: pos.y, z: pt.z } }
            : { end: { x: pt.x, y: pos.y, z: pt.z } };
        updateNode(wall.id, update as any);
      };

      const onUp = () => {
        dragging.current = false;
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
      };

      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
    },
    [gl, getGroundPoint, which, wall.id, pos.y, updateNode],
  );

  const color = dragging.current ? "#FFFFFF" : hovered ? "#FFB800" : "#FF6B35";

  return (
    <mesh
      position={[pos.x, halfHeight, pos.z]}
      onPointerDown={onPointerDown as any}
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

export function WallDragHandles({ wall }: { wall: WallNode }) {
  return (
    <>
      <DragHandle wall={wall} which="start" />
      <DragHandle wall={wall} which="end" />
    </>
  );
}
