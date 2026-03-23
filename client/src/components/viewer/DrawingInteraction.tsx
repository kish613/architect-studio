import { useEffect, useCallback, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEditor } from "@/stores/use-editor";
import { useScene } from "@/stores/use-scene";
import { useViewer } from "@/stores/use-viewer";
import { createNode } from "@/lib/pascal/schemas";
import { createCatalogPlacementNode } from "@/lib/pascal/item-placement";

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const intersection = new THREE.Vector3();

export function DrawingInteraction() {
  const activeTool = useEditor((s) => s.activeTool);
  const phase = useEditor((s) => s.phase);
  const drawingPoints = useEditor((s) => s.drawingPoints);
  const previewPoint = useEditor((s) => s.previewPoint);
  const placingCatalogItem = useEditor((s) => s.placingCatalogItem);
  const addDrawingPoint = useEditor((s) => s.addDrawingPoint);
  const setPreviewPoint = useEditor((s) => s.setPreviewPoint);
  const clearDrawing = useEditor((s) => s.clearDrawing);
  const cancelAction = useEditor((s) => s.cancelAction);

  const addNode = useScene((s) => s.addNode);
  const activeLevelId = useViewer((s) => s.activeLevelId);
  const select = useViewer((s) => s.select);

  const { camera, gl } = useThree();

  const getGroundPoint = useCallback(
    (clientX: number, clientY: number): { x: number; z: number } | null => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
        // Snap to 0.05m grid
        return {
          x: Math.round(intersection.x * 20) / 20,
          z: Math.round(intersection.z * 20) / 20,
        };
      }
      return null;
    },
    [camera, gl]
  );

  const isWallTool = activeTool === "wall";
  const isItemPlacement = activeTool === "item" && phase === "placing" && placingCatalogItem != null;

  useEffect(() => {
    if (!isWallTool && !isItemPlacement) return;

    const canvas = gl.domElement;

    const onPointerMove = (e: PointerEvent) => {
      const pt = getGroundPoint(e.clientX, e.clientY);
      if (pt) setPreviewPoint(pt);
    };

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0) return; // left click only
      const pt = getGroundPoint(e.clientX, e.clientY);
      if (!pt) return;

      if (isItemPlacement && placingCatalogItem) {
        const node = createCatalogPlacementNode(placingCatalogItem, activeLevelId, pt);
        addNode(node, activeLevelId ?? undefined);
        select([node.id]);
        cancelAction();
        return;
      }

      addDrawingPoint(pt);
    };

    const onDblClick = () => {
      if (!isWallTool) return;
      const points = useEditor.getState().drawingPoints;
      if (points.length < 2) return;

      // Create a WallNode for each consecutive pair
      for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];
        const wall = createNode("wall", {
          parentId: activeLevelId ?? undefined,
          start: { x: start.x, y: 0, z: start.z },
          end: { x: end.x, y: 0, z: end.z },
          height: 2.7,
          thickness: 0.15,
          material: "plaster",
        } as any);
        addNode(wall, activeLevelId ?? undefined);
      }

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
    addNode,
    activeLevelId,
    setPreviewPoint,
    phase,
    placingCatalogItem,
    isItemPlacement,
    select,
    cancelAction,
  ]);

  if (!isWallTool && !isItemPlacement) return null;

  // Build line points for visualization
  const linePoints: [number, number, number][] = drawingPoints.map((p) => [
    p.x,
    0.05,
    p.z,
  ]);
  if (previewPoint && drawingPoints.length > 0) {
    linePoints.push([previewPoint.x, 0.05, previewPoint.z]);
  }

  // Build a THREE.Line object for WebGPU-compatible line rendering
  // (drei's <Line> uses LineMaterial from three-stdlib which is a legacy GLSL shader)
  const lineObject = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    if (linePoints.length >= 2) {
      const positions = new Float32Array(linePoints.length * 3);
      for (let i = 0; i < linePoints.length; i++) {
        positions[i * 3] = linePoints[i][0];
        positions[i * 3 + 1] = linePoints[i][1];
        positions[i * 3 + 2] = linePoints[i][2];
      }
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    }
    const mat = new THREE.LineBasicMaterial({ color: "#4A90FF" });
    return new THREE.Line(geo, mat);
  }, [linePoints]);

  return (
    <>
      {/* Drawing path line — using primitive THREE.Line for WebGPU compat */}
      {linePoints.length >= 2 && (
        <primitive object={lineObject} />
      )}

      {/* Point markers */}
      {drawingPoints.map((pt, i) => (
        <mesh key={i} position={[pt.x, 0.05, pt.z]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#4A90FF" />
        </mesh>
      ))}

      {/* Preview point */}
      {previewPoint && (
        <mesh position={[previewPoint.x, 0.05, previewPoint.z]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#78B4FF" transparent opacity={0.6} />
        </mesh>
      )}

      {isItemPlacement && previewPoint && placingCatalogItem && (
        <mesh position={[previewPoint.x, placingCatalogItem.dimensions.y / 2, previewPoint.z]} castShadow receiveShadow>
          <boxGeometry args={[placingCatalogItem.dimensions.x, placingCatalogItem.dimensions.y, placingCatalogItem.dimensions.z]} />
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
