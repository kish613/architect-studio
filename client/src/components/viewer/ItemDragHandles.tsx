import { useState, useCallback, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useScene } from "@/stores/use-scene";
import type { ItemNode } from "@/lib/pascal/schemas";

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const mouseVec = new THREE.Vector2();
const intersectionPt = new THREE.Vector3();

function snap(v: number): number {
  return Math.round(v * 20) / 20; // 0.05m grid
}

function getGroundPointFromEvent(
  e: PointerEvent,
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
): THREE.Vector3 | null {
  const rect = canvas.getBoundingClientRect();
  mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouseVec, camera);
  if (raycaster.ray.intersectPlane(groundPlane, intersectionPt)) {
    return intersectionPt.clone();
  }
  return null;
}

function PositionHandle({ item }: { item: ItemNode }) {
  const updateNode = useScene((s) => s.updateNode);
  const { camera, gl } = useThree();
  const [hovered, setHovered] = useState(false);
  const dragging = useRef(false);

  const pos = item.transform?.position ?? { x: 0, y: 0, z: 0 };

  const onPointerDown = useCallback(
    (e: THREE.Event & { stopPropagation: () => void; nativeEvent: PointerEvent }) => {
      e.stopPropagation();
      dragging.current = true;
      (e.nativeEvent.target as HTMLElement)?.setPointerCapture?.(e.nativeEvent.pointerId);

      const canvas = gl.domElement;

      const onMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const pt = getGroundPointFromEvent(ev, camera, canvas);
        if (!pt) return;
        const snappedX = snap(pt.x);
        const snappedZ = snap(pt.z);

        // Read current item from store to avoid overwriting rotation
        const currentItem = useScene.getState().nodes[item.id] as ItemNode | undefined;
        const currentTransform = currentItem?.transform ?? {};

        updateNode(item.id, {
          transform: {
            ...currentTransform,
            position: { x: snappedX, y: pos.y, z: snappedZ },
          },
        } as any);
      };

      const onUp = () => {
        dragging.current = false;
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
      };

      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
    },
    [gl, camera, item.id, pos.y, updateNode],
  );

  const color = dragging.current ? "#FFFFFF" : hovered ? "#FFB800" : "#FF6B35";

  return (
    <mesh
      position={[pos.x, 0, pos.z]}
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

function RotationHandle({ item }: { item: ItemNode }) {
  const updateNode = useScene((s) => s.updateNode);
  const { camera, gl } = useThree();
  const [hovered, setHovered] = useState(false);
  const dragging = useRef(false);
  const startAngle = useRef(0);
  const originalRotY = useRef(0);

  const pos = item.transform?.position ?? { x: 0, y: 0, z: 0 };
  const d = item.dimensions ?? { x: 1, y: 1, z: 1 };
  const radius = Math.max(d.x, d.z) * 0.7;

  const onPointerDown = useCallback(
    (e: THREE.Event & { stopPropagation: () => void; nativeEvent: PointerEvent }) => {
      e.stopPropagation();
      dragging.current = true;
      (e.nativeEvent.target as HTMLElement)?.setPointerCapture?.(e.nativeEvent.pointerId);

      const canvas = gl.domElement;

      // Record start angle from item center to mouse ground point
      const pt = getGroundPointFromEvent(e.nativeEvent, camera, canvas);
      if (pt) {
        const dx = pt.x - pos.x;
        const dz = pt.z - pos.z;
        startAngle.current = Math.atan2(dz, dx);
      }
      originalRotY.current = item.transform?.rotation?.y ?? 0;

      const onMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const pt = getGroundPointFromEvent(ev, camera, canvas);
        if (!pt) return;

        const dx = pt.x - pos.x;
        const dz = pt.z - pos.z;
        const newAngle = Math.atan2(dz, dx);
        const delta = newAngle - startAngle.current;
        const newRotY = originalRotY.current + delta;

        // Read current item from store to avoid overwriting position
        const currentItem = useScene.getState().nodes[item.id] as ItemNode | undefined;
        const currentTransform = currentItem?.transform ?? {};

        updateNode(item.id, {
          transform: {
            ...currentTransform,
            rotation: { x: 0, y: newRotY, z: 0 },
          },
        } as any);
      };

      const onUp = () => {
        dragging.current = false;
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
      };

      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
    },
    [gl, camera, item.id, pos.x, pos.z, updateNode, item.transform?.rotation?.y],
  );

  const color = dragging.current ? "#FFFFFF" : hovered ? "#FFB800" : "#FF6B35";

  return (
    <mesh
      position={[pos.x, 0.01, pos.z]}
      rotation={[Math.PI / 2, 0, 0]}
      onPointerDown={onPointerDown as any}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <torusGeometry args={[radius, 0.03, 8, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        toneMapped={false}
      />
    </mesh>
  );
}

export function ItemDragHandles({ item }: { item: ItemNode }) {
  return (
    <group>
      <PositionHandle item={item} />
      <RotationHandle item={item} />
    </group>
  );
}
