import { useState, useCallback, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Fixture, Furniture } from "@shared/bim/canonical-schema";
import { useBimScene } from "@/stores/use-bim-scene";

const raycaster = new THREE.Raycaster();
const mouseVec = new THREE.Vector2();
const intersectionPt = new THREE.Vector3();

function snap(v: number): number {
  return Math.round(v * 20) / 20;
}

function getPlanePoint(
  e: PointerEvent,
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  planeY: number,
): THREE.Vector3 | null {
  const rect = canvas.getBoundingClientRect();
  mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouseVec, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
  if (raycaster.ray.intersectPlane(plane, intersectionPt)) {
    return intersectionPt.clone();
  }
  return null;
}

function PositionHandle({
  asset,
  kind,
  levelElevation,
}: {
  asset: Furniture | Fixture;
  kind: "furniture" | "fixture";
  levelElevation: number;
}) {
  const updatePlacedAsset = useBimScene((s) => s.updatePlacedAsset);
  const { camera, gl } = useThree();
  const [hovered, setHovered] = useState(false);
  const dragging = useRef(false);
  const pos = asset.position;
  const footY = levelElevation + pos.y;
  const handleY = footY + 0.05;

  const onPointerDown = useCallback(
    (e: THREE.Event & { stopPropagation: () => void; nativeEvent: PointerEvent }) => {
      e.stopPropagation();
      dragging.current = true;
      (e.nativeEvent.target as HTMLElement)?.setPointerCapture?.(e.nativeEvent.pointerId);
      const canvas = gl.domElement;
      const planeY = levelElevation;

      const onMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const pt = getPlanePoint(ev, camera, canvas, planeY);
        if (!pt) return;
        const snappedX = snap(pt.x);
        const snappedZ = snap(pt.z);
        const current = useBimScene.getState().bim;
        const list = kind === "furniture" ? current.furniture : current.fixtures;
        const cur = list.find((x) => x.id === asset.id);
        const py = cur?.position.y ?? pos.y;
        updatePlacedAsset(
          asset.id,
          {
            position: { x: snappedX, y: py, z: snappedZ },
          },
          kind,
        );
      };

      const onUp = () => {
        dragging.current = false;
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
      };

      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
    },
    [gl, camera, asset.id, kind, pos.y, levelElevation, updatePlacedAsset],
  );

  const color = dragging.current ? "#FFFFFF" : hovered ? "#FFB800" : "#FF6B35";

  return (
    <mesh
      position={[pos.x, handleY, pos.z]}
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

function RotationHandle({
  asset,
  kind,
  levelElevation,
}: {
  asset: Furniture | Fixture;
  kind: "furniture" | "fixture";
  levelElevation: number;
}) {
  const updatePlacedAsset = useBimScene((s) => s.updatePlacedAsset);
  const { camera, gl } = useThree();
  const [hovered, setHovered] = useState(false);
  const dragging = useRef(false);
  const startAngle = useRef(0);
  const originalRotY = useRef(0);

  const pos = asset.position;
  const d = asset.asset.dimensions;
  const radius = Math.max(d.x, d.z) * 0.7;
  const planeY = levelElevation;

  const onPointerDown = useCallback(
    (e: THREE.Event & { stopPropagation: () => void; nativeEvent: PointerEvent }) => {
      e.stopPropagation();
      dragging.current = true;
      (e.nativeEvent.target as HTMLElement)?.setPointerCapture?.(e.nativeEvent.pointerId);
      const canvas = gl.domElement;

      const pt = getPlanePoint(e.nativeEvent, camera, canvas, planeY);
      if (pt) {
        const dx = pt.x - pos.x;
        const dz = pt.z - pos.z;
        startAngle.current = Math.atan2(dz, dx);
      }
      originalRotY.current = asset.rotationY;

      const onMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const p = getPlanePoint(ev, camera, canvas, planeY);
        if (!p) return;
        const dx = p.x - pos.x;
        const dz = p.z - pos.z;
        const newAngle = Math.atan2(dz, dx);
        const delta = newAngle - startAngle.current;
        const newRotY = originalRotY.current + delta;
        updatePlacedAsset(asset.id, { rotationY: newRotY }, kind);
      };

      const onUp = () => {
        dragging.current = false;
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
      };

      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
    },
    [gl, camera, asset.id, asset.rotationY, pos.x, pos.z, kind, planeY, updatePlacedAsset],
  );

  const color = dragging.current ? "#FFFFFF" : hovered ? "#FFB800" : "#FF6B35";

  return (
    <mesh
      position={[pos.x, planeY + 0.01, pos.z]}
      rotation={[Math.PI / 2, 0, 0]}
      onPointerDown={onPointerDown as unknown as () => void}
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

export function BimItemDragHandles({
  asset,
  kind,
  levelElevation,
}: {
  asset: Furniture | Fixture;
  kind: "furniture" | "fixture";
  levelElevation: number;
}) {
  return (
    <group>
      <PositionHandle asset={asset} kind={kind} levelElevation={levelElevation} />
      <RotationHandle asset={asset} kind={kind} levelElevation={levelElevation} />
    </group>
  );
}
