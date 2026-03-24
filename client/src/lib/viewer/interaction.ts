import { MOUSE, TOUCH } from "three";
import type { CameraPreset, CameraMode } from "@/stores/use-viewer";
import type { EditorTool } from "@/stores/use-editor";

const EDITOR_MAX_POLAR_ANGLE = Math.PI / 2.1;
const TOP_DOWN_MAX_POLAR_ANGLE = 0.01;
const POINTER_CLICK_THRESHOLD_PX = 4;

export type ViewerInteractionSurface = "model" | "editor";
export type ModelViewerControlAction = "in" | "out" | "reset";

interface ViewerInteractionOptions {
  cameraMode?: CameraMode;
  cameraPreset?: CameraPreset;
}

export interface ViewerInteractionConfig {
  mouseButtons: Partial<{
    LEFT: MOUSE;
    MIDDLE: MOUSE;
    RIGHT: MOUSE;
  }>;
  touches: Partial<{
    ONE: TOUCH;
    TWO: TOUCH;
  }>;
  enableDamping: boolean;
  dampingFactor: number;
  enableRotate: boolean;
  maxPolarAngle: number;
  helpText: string;
  idleCursor: string;
  navigationCursor: string;
}

export interface PointerPosition {
  x: number;
  y: number;
}

export interface SelectionGestureCommitOptions {
  activeTool: EditorTool;
  button: number;
  exceededDragThreshold: boolean;
  isCameraNavigating: boolean;
}

export interface PrimaryCanvasActionOptions {
  button: number;
  isCameraNavigating: boolean;
}

export interface ModelViewerControlsTarget {
  dollyIn: (dollyScale?: number) => void;
  dollyOut: (dollyScale?: number) => void;
  reset: () => void;
  update: () => void;
}

export function isTopDownCameraView(options: ViewerInteractionOptions = {}): boolean {
  return options.cameraMode === "orthographic" || options.cameraPreset === "top";
}

export function getViewerInteractionConfig(
  surface: ViewerInteractionSurface,
  options: ViewerInteractionOptions = {}
): ViewerInteractionConfig {
  if (surface === "model") {
    return {
      mouseButtons: {
        LEFT: MOUSE.ROTATE,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN,
      },
      touches: {
        ONE: TOUCH.ROTATE,
        TWO: TOUCH.DOLLY_PAN,
      },
      enableDamping: true,
      dampingFactor: 0.08,
      enableRotate: true,
      maxPolarAngle: Math.PI,
      helpText: "Left-drag orbit · Right-drag pan · Scroll zoom",
      idleCursor: "grab",
      navigationCursor: "grabbing",
    };
  }

  const topDown = isTopDownCameraView(options);

  return {
    mouseButtons: {
      LEFT: undefined,
      MIDDLE: MOUSE.PAN,
      RIGHT: topDown ? MOUSE.PAN : MOUSE.ROTATE,
    },
    touches: {
      ONE: TOUCH.PAN,
      TWO: TOUCH.DOLLY_PAN,
    },
    enableDamping: true,
    dampingFactor: 0.1,
    enableRotate: !topDown,
    maxPolarAngle: topDown ? TOP_DOWN_MAX_POLAR_ANGLE : EDITOR_MAX_POLAR_ANGLE,
    helpText: topDown
      ? "Left-click edit · Right-drag pan · Middle-drag pan · Scroll zoom"
      : "Left-click edit · Right-drag orbit · Middle-drag pan · Scroll zoom",
    idleCursor: "default",
    navigationCursor: "grabbing",
  };
}

export function didPointerGestureExceedThreshold(
  start: PointerPosition,
  current: PointerPosition,
  thresholdPx = POINTER_CLICK_THRESHOLD_PX
): boolean {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  return dx * dx + dy * dy > thresholdPx * thresholdPx;
}

export function shouldStartSelectionGesture(options: {
  activeTool: EditorTool;
  button: number;
}): boolean {
  return options.activeTool === "select" && options.button === 0;
}

export function shouldCommitSelectionGesture(options: SelectionGestureCommitOptions): boolean {
  return (
    shouldStartSelectionGesture({ activeTool: options.activeTool, button: options.button }) &&
    !options.exceededDragThreshold &&
    !options.isCameraNavigating
  );
}

export function shouldHandlePrimaryCanvasAction(options: PrimaryCanvasActionOptions): boolean {
  return options.button === 0 && !options.isCameraNavigating;
}

export function applyModelViewerControlAction(
  controls: ModelViewerControlsTarget,
  action: ModelViewerControlAction
): void {
  if (action === "in") {
    controls.dollyIn();
  } else if (action === "out") {
    controls.dollyOut();
  } else {
    controls.reset();
  }

  controls.update();
}
