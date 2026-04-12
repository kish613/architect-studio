import { useEffect, useCallback, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEditor } from "@/stores/use-editor";
import { useBimScene } from "@/stores/use-bim-scene";
import { useViewer } from "@/stores/use-viewer";
import { shouldHandlePrimaryCanvasAction } from "@/lib/viewer/interaction";
import { getLevelElevationM } from "./bim-level-utils";

function NativeLine({ points, color }: { points: [number, number, number][]; color: string }) {
  const lineObj = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const material = new THREE.LineBasicMaterial({ color });
    return new THREE.Line(geometry, material);
  }, [JSON.stringify(points), color]);

  return <primitive object={lineObj} />;
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const intersection = new THREE.Vector3();

function snap(v: number): number {
  return Math.round(v * 20) / 20;
}

export function BimDrawingInteraction() {
  const activeTool = useEditor((s) => s.activeTool);
  const phase = useEditor((s) => s.phase);
  const drawingPoints = useEditor((s) => s.drawingPoints);
  const previewPoint = useEditor((s) => s.previewPoint);
  const placingCatalogItem = useEditor((s) => s.placingCatalogItem);
  const addDrawingPoint = useEditor((s) => s.addDrawingPoint);
  const setPreviewPoint = useEditor((s) => s.setPreviewPoint);
  const clearDrawing = useEditor((s) => s.clearDrawing);
  const cancelAction = useEditor((s) => s.cancelAction);

  const addWall = useBimScene((s) => s.addWall);
  const addFurnitureFromCatalog = useBimScene((s) => s.addFurnitureFromCatalog);
  const bim = useBimScene((s) => s.bim);

  const activeLevelId = useViewer((s) => s.activeLevelId);
  const select = useViewer((s) => s.select);
  const isCameraNavigating = useViewer((s) => s.isCameraNavigating);

  const { camera, gl } = useThree();

  const levelId = activeLevelId ?? bim.levels[0]?.id ?? "level-ground";
  const levelElevation = getLevelElevationM(bim, levelId);

  const getGroundPoint = useCallback(
    (clientX: number, clientY: number): { x: number; z: number } | null => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -levelElevation);
      if (raycaster.ray.intersectPlane(plane, intersection)) {
        return {
          x: snap(intersection.x),
          z: snap(intersection.z),
        };
      }
      return null;
    },
    [camera, gl, levelElevation],
  );

  const isWallTool = activeTool === "wall";
  const isItemPlacement = activeTool === "item" && phase === "placing" && placingCatalogItem != null;

  useEffect(() => {
    if (!isWallTool && !isItemPlacement) return;

    const canvas = gl.domElement;

    const onPointerMove = (e: PointerEvent) => {
      if (isCameraNavigating) return;
      const pt = getGroundPoint(e.clientX, e.clientY);
      if (pt) setPreviewPoint(pt);
    };

    const onClick = (e: MouseEvent) => {
      if (!shouldHandlePrimaryCanvasAction({ button: e.button, isCameraNavigating })) return;
      const pt = getGroundPoint(e.clientX, e.clientY);
      if (!pt) return;

      if (isItemPlacement && placingCatalogItem) {
        const fid = addFurnitureFromCatalog({
          levelId,
          catalogItem: placingCatalogItem,
          position: { x: pt.x, y: 0, z: pt.z },
          rotationY: 0,
        });
        select([fid]);
        cancelAction();
        return;
      }

      addDrawingPoint(pt);
    };

    const onDblClick = () => {
      if (!isWallTool) return;
      const points = useEditor.getState().drawingPoints;
      if (points.length < 2) return;

      const ids: string[] = [];
      for (let i = 0; i < points.length - 1; i++) {
        const start = points[i]!;
        const end = points[i + 1]!;
        const wid = addWall({
          levelId,
          start: { x: start.x, z: start.z },
          end: { x: end.x, z: end.z },
          height: 2.7,
          thickness: 0.15,
        });
        ids.push(wid);
      }
      if (ids.length) select(ids.slice(-1));
      clearDrawing();
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("dblclick", onDblClick);

    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("dblclick", onDblClick);
    };
  }, [
    isWallTool,
    gl,
    getGroundPoint,
    addDrawingPoint,
    clearDrawing,
    addWall,
    levelId,
    setPreviewPoint,
    placingCatalogItem,
    isItemPlacement,
    select,
    cancelAction,
    isCameraNavigating,
    addFurnitureFromCatalog,
  ]);

  if (!isWallTool && !isItemPlacement) return null;

  const lineY = levelElevation + 0.05;
  const linePoints: [number, number, number][] = drawingPoints.map((p) => [p.x, lineY, p.z]);
  if (previewPoint && drawingPoints.length > 0) {
    linePoints.push([previewPoint.x, lineY, previewPoint.z]);
  }

  return (
    <>
      {linePoints.length >= 2 && <NativeLine points={linePoints} color="#4A90FF" />}

      {drawingPoints.map((pt, i) => (
        <mesh key={i} position={[pt.x, lineY, pt.z]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#4A90FF" />
        </mesh>
      ))}

      {previewPoint && (
        <mesh position={[previewPoint.x, lineY, previewPoint.z]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#78B4FF" transparent opacity={0.6} />
        </mesh>
      )}

      {isItemPlacement && previewPoint && placingCatalogItem && (
        <mesh
          position={[
            previewPoint.x,
            levelElevation + placingCatalogItem.dimensions.y / 2,
            previewPoint.z,
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[
              placingCatalogItem.dimensions.x,
              placingCatalogItem.dimensions.y,
              placingCatalogItem.dimensions.z,
            ]}
          />
          <meshPhysicalMaterial
            color="#4A90FF"
            transparent
            opacity={0.3}
            roughness={0.5}
            metalness={0.05}
            clearcoat={0.2}
          />
        </mesh>
      )}
    </>
  );
}
