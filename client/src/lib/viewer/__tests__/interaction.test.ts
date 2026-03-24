import { MOUSE, TOUCH } from "three";
import { describe, expect, it, vi } from "vitest";
import {
  applyModelViewerControlAction,
  didPointerGestureExceedThreshold,
  getViewerInteractionConfig,
  shouldCommitSelectionGesture,
  shouldHandlePrimaryCanvasAction,
  shouldStartSelectionGesture,
} from "../interaction";

describe("viewer interaction contract", () => {
  it("uses classic object-viewer bindings for the standalone model viewer", () => {
    const config = getViewerInteractionConfig("model");

    expect(config.mouseButtons.LEFT).toBe(MOUSE.ROTATE);
    expect(config.mouseButtons.MIDDLE).toBe(MOUSE.DOLLY);
    expect(config.mouseButtons.RIGHT).toBe(MOUSE.PAN);
    expect(config.touches.ONE).toBe(TOUCH.ROTATE);
    expect(config.touches.TWO).toBe(TOUCH.DOLLY_PAN);
    expect(config.enableRotate).toBe(true);
    expect(config.helpText).toMatch(/left-drag orbit/i);
  });

  it("uses hybrid bindings for the editor in perspective mode", () => {
    const config = getViewerInteractionConfig("editor", {
      cameraMode: "perspective",
      cameraPreset: null,
    });

    expect(config.mouseButtons.LEFT).toBeUndefined();
    expect(config.mouseButtons.MIDDLE).toBe(MOUSE.PAN);
    expect(config.mouseButtons.RIGHT).toBe(MOUSE.ROTATE);
    expect(config.touches.ONE).toBe(TOUCH.PAN);
    expect(config.touches.TWO).toBe(TOUCH.DOLLY_PAN);
    expect(config.enableRotate).toBe(true);
    expect(config.helpText).toMatch(/right-drag orbit/i);
  });

  it("disables rotation and pans on right or middle drag in top-down editor views", () => {
    const config = getViewerInteractionConfig("editor", {
      cameraMode: "orthographic",
      cameraPreset: "top",
    });

    expect(config.mouseButtons.LEFT).toBeUndefined();
    expect(config.mouseButtons.MIDDLE).toBe(MOUSE.PAN);
    expect(config.mouseButtons.RIGHT).toBe(MOUSE.PAN);
    expect(config.enableRotate).toBe(false);
    expect(config.helpText).toMatch(/right-drag pan/i);
  });
});

describe("selection gesture helpers", () => {
  it("only starts selection gestures for primary-button clicks in select mode", () => {
    expect(shouldStartSelectionGesture({ activeTool: "select", button: 0 })).toBe(true);
    expect(shouldStartSelectionGesture({ activeTool: "select", button: 2 })).toBe(false);
    expect(shouldStartSelectionGesture({ activeTool: "wall", button: 0 })).toBe(false);
  });

  it("uses a drag threshold before treating a pointer gesture as a click", () => {
    expect(didPointerGestureExceedThreshold({ x: 10, y: 10 }, { x: 12, y: 12 })).toBe(false);
    expect(didPointerGestureExceedThreshold({ x: 10, y: 10 }, { x: 20, y: 20 })).toBe(true);
  });

  it("commits selection only for undragged primary clicks while the camera is idle", () => {
    expect(
      shouldCommitSelectionGesture({
        activeTool: "select",
        button: 0,
        exceededDragThreshold: false,
        isCameraNavigating: false,
      })
    ).toBe(true);

    expect(
      shouldCommitSelectionGesture({
        activeTool: "select",
        button: 2,
        exceededDragThreshold: false,
        isCameraNavigating: false,
      })
    ).toBe(false);

    expect(
      shouldCommitSelectionGesture({
        activeTool: "select",
        button: 0,
        exceededDragThreshold: true,
        isCameraNavigating: false,
      })
    ).toBe(false);

    expect(
      shouldCommitSelectionGesture({
        activeTool: "select",
        button: 0,
        exceededDragThreshold: false,
        isCameraNavigating: true,
      })
    ).toBe(false);
  });

  it("allows drawing and placement actions only for primary-button clicks while not navigating", () => {
    expect(shouldHandlePrimaryCanvasAction({ button: 0, isCameraNavigating: false })).toBe(true);
    expect(shouldHandlePrimaryCanvasAction({ button: 1, isCameraNavigating: false })).toBe(false);
    expect(shouldHandlePrimaryCanvasAction({ button: 2, isCameraNavigating: false })).toBe(false);
    expect(shouldHandlePrimaryCanvasAction({ button: 0, isCameraNavigating: true })).toBe(false);
  });
});

describe("model viewer control actions", () => {
  it("calls the live controls instance directly for zoom and reset", () => {
    const controls = {
      dollyIn: vi.fn(),
      dollyOut: vi.fn(),
      reset: vi.fn(),
      update: vi.fn(),
    };

    applyModelViewerControlAction(controls, "in");
    applyModelViewerControlAction(controls, "out");
    applyModelViewerControlAction(controls, "reset");

    expect(controls.dollyIn).toHaveBeenCalledOnce();
    expect(controls.dollyOut).toHaveBeenCalledOnce();
    expect(controls.reset).toHaveBeenCalledOnce();
    expect(controls.update).toHaveBeenCalledTimes(3);
  });
});
