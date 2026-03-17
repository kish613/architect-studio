import { useEffect, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { useEditor } from "@/stores/use-editor";
import { useScene } from "@/stores/use-scene";
import { useViewer } from "@/stores/use-viewer";
import { createNode } from "@/lib/pascal/schemas";

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const intersection = new THREE.Vector3();

export function DrawingInteraction() {
  const activeTool = useEditor((s) => s.activeTool);
  const drawingPoints = useEditor((s) => s.drawingPoints);
  const previewPoint = useEditor((s) => s.previewPoint);
  const addDrawingPoint = useEditor((s) => s.addDrawingPoint);
  const setPreviewPoint = useEditor((s) => s.setPreviewPoint);
  const clearDrawing = useEditor((s) => s.clearDrawing);

  const addNode = useScene((s) => s.addNode);
  const activeLevelId = useViewer((s) => s.activeLevelId);

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

  // Only active for wall tool
  const isWallTool = activeTool === "wall";

  useEffect(() => {
    if (!isWallTool) return;

    const canvas = gl.domElement;

    const onPointerMove = (e: PointerEvent) => {
      const pt = getGroundPoint(e.clientX, e.clientY);
      if (pt) setPreviewPoint(pt);
    };

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0) return; // left click only
      const pt = getGroundPoint(e.clientX, e.clientY);
      if (pt) addDrawingPoint(pt);
    };

    const onDblClick = () => {
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
  ]);

  // Don't render anything if not in wall mode
  if (!isWallTool) return null;

  // Build line points for visualization
  const linePoints: [number, number, number][] = drawingPoints.map((p) => [
    p.x,
    0.05,
    p.z,
  ]);
  if (previewPoint && drawingPoints.length > 0) {
    linePoints.push([previewPoint.x, 0.05, previewPoint.z]);
  }

  return (
    <>
      {/* Drawing path line */}
      {linePoints.length >= 2 && (
        <Line points={linePoints} color="#4A90FF" lineWidth={2} />
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
    </>
  );
}
