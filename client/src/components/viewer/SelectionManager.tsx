import { useThree } from "@react-three/fiber";
import { useCallback, useRef } from "react";
import * as THREE from "three";
import { useViewer } from "@/stores/use-viewer";
import { sceneRegistry } from "@/lib/pascal/scene-registry";
import { useEditor } from "@/stores/use-editor";
import {
  didPointerGestureExceedThreshold,
  shouldCommitSelectionGesture,
  shouldStartSelectionGesture,
} from "@/lib/viewer/interaction";

export function SelectionManager() {
  return null;
}

export function useSelectionClick() {
  const { camera, gl } = useThree();
  const { select, addToSelection, clearSelection, isCameraNavigating } = useViewer();
  const activeTool = useEditor((s) => s.activeTool);
  const pendingGesture = useRef<{
    pointerId: number;
    button: number;
    shiftKey: boolean;
    start: { x: number; y: number };
    exceededDragThreshold: boolean;
  } | null>(null);

  const resolveSelection = useCallback(
    (clientX: number, clientY: number, shiftKey: boolean) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

      const objects = Array.from(sceneRegistry.getAllObjects().values());
      if (objects.length === 0) {
        clearSelection();
        return;
      }

      const intersects = raycaster.intersectObjects(objects, true);
      if (intersects.length === 0) {
        clearSelection();
        return;
      }

      // Walk up from intersected object to find registered node
      const nodeId = sceneRegistry.getNodeId(intersects[0].object);
      if (!nodeId) {
        clearSelection();
        return;
      }

      if (shiftKey) {
        addToSelection(nodeId);
      } else {
        select([nodeId]);
      }
    },
    [addToSelection, camera, clearSelection, gl, select]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (!shouldStartSelectionGesture({ activeTool, button: event.button })) {
        return;
      }

      gl.domElement.setPointerCapture?.(event.pointerId);
      pendingGesture.current = {
        pointerId: event.pointerId,
        button: event.button,
        shiftKey: event.shiftKey,
        start: { x: event.clientX, y: event.clientY },
        exceededDragThreshold: false,
      };
    },
    [activeTool, gl]
  );

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const gesture = pendingGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    if (
      didPointerGestureExceedThreshold(gesture.start, {
        x: event.clientX,
        y: event.clientY,
      })
    ) {
      gesture.exceededDragThreshold = true;
    }
  }, []);

  const clearPendingGesture = useCallback((pointerId?: number) => {
    if (pointerId !== undefined && gl.domElement.hasPointerCapture?.(pointerId)) {
      gl.domElement.releasePointerCapture(pointerId);
    }
    pendingGesture.current = null;
  }, [gl]);

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const gesture = pendingGesture.current;
      if (!gesture || gesture.pointerId !== event.pointerId) {
        return;
      }

      const shouldCommit = shouldCommitSelectionGesture({
        activeTool,
        button: gesture.button,
        exceededDragThreshold: gesture.exceededDragThreshold,
        isCameraNavigating,
      });

      const shiftKey = gesture.shiftKey || event.shiftKey;
      clearPendingGesture(event.pointerId);

      if (!shouldCommit) {
        return;
      }

      resolveSelection(event.clientX, event.clientY, shiftKey);
    },
    [activeTool, clearPendingGesture, isCameraNavigating, resolveSelection]
  );

  const handlePointerCancel = useCallback(
    (event: PointerEvent) => {
      clearPendingGesture(event.pointerId);
    },
    [clearPendingGesture]
  );

  return { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel };
}
