import { describe, it, expect, vi, afterEach } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

vi.mock("../CanvasSurface", () => ({
  CanvasSurface: () => <div data-testid="canvas" />,
}));
vi.mock("../LayersIsland", () => ({
  LayersIsland: () => <div data-testid="layers" />,
}));
vi.mock("../Inspector", () => ({
  Inspector: () => <div data-testid="inspector" />,
}));
vi.mock("../FloorSwitcher", () => ({
  FloorSwitcher: () => <div data-testid="floor" />,
}));
vi.mock("../CamIsland", () => ({
  CamIsland: () => <div data-testid="cam" />,
}));
vi.mock("../Rail", () => ({
  Rail: () => <div data-testid="rail" />,
}));
vi.mock("../SceneTreePanel", () => ({
  SceneTreePanel: () => <div data-testid="tree" />,
}));
vi.mock("../ToolDock", () => ({
  ToolDock: () => <div data-testid="dock" />,
}));
vi.mock("../HUD", () => ({
  HUD: () => <div data-testid="hud" />,
}));
vi.mock("../HoverTag", () => ({
  HoverTag: () => <div data-testid="hover" />,
}));
vi.mock("../SectionCut", () => ({
  SectionCut: () => <div data-testid="section" />,
}));
vi.mock("@/stores/use-viewer", () => ({
  useViewer: vi.fn((sel: any) =>
    sel({
      cameraPreset: "isometric",
      setCameraPreset: () => {},
    }),
  ),
}));

import { StudioStage } from "../StudioStage";
import { PrecisionStage } from "../PrecisionStage";
import type { StageProps } from "../stage-props";

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

async function mount(el: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(el);
    await Promise.resolve();
  });
  mountedRoot = root;
  mountedContainer = container;
  return container;
}

afterEach(async () => {
  if (mountedRoot) {
    await act(async () => {
      mountedRoot?.unmount();
    });
  }
  mountedRoot = null;
  mountedContainer?.remove();
  mountedContainer = null;
});

function baseProps(overrides: Partial<StageProps> = {}): StageProps {
  return {
    mode: "3d",
    tool: "select",
    onTool: () => {},
    hasPascal: false,
    modelUrl: null,
    isometricUrl: null,
    cutY: 0.5,
    onCutY: () => {},
    onGenerate: () => {},
    onUndo: () => {},
    onRedo: () => {},
    hover: null,
    ...overrides,
  };
}

describe("StudioStage", () => {
  it("renders canvas, layers, inspector, floor, cam, dock, hud in 3d mode and omits rail/tree", async () => {
    const c = await mount(<StudioStage {...baseProps({ mode: "3d" })} />);
    expect(c.querySelector('[data-testid="canvas"]')).toBeTruthy();
    expect(c.querySelector('[data-testid="layers"]')).toBeTruthy();
    expect(c.querySelector('[data-testid="inspector"]')).toBeTruthy();
    expect(c.querySelector('[data-testid="floor"]')).toBeTruthy();
    expect(c.querySelector('[data-testid="cam"]')).toBeTruthy();
    expect(c.querySelector('[data-testid="dock"]')).toBeTruthy();
    expect(c.querySelector('[data-testid="hud"]')).toBeTruthy();
    expect(c.querySelector('[data-testid="rail"]')).toBeNull();
    expect(c.querySelector('[data-testid="tree"]')).toBeNull();
  });

  it("does NOT render CamIsland in 2d mode", async () => {
    const c = await mount(<StudioStage {...baseProps({ mode: "2d" })} />);
    expect(c.querySelector('[data-testid="cam"]')).toBeNull();
    // SectionCut is 3d-only too
    expect(c.querySelector('[data-testid="section"]')).toBeNull();
    // Canvas is still there
    expect(c.querySelector('[data-testid="canvas"]')).toBeTruthy();
  });
});

describe("PrecisionStage", () => {
  it("renders rail, tree, canvas and omits floating layers/cam islands", async () => {
    const c = await mount(<PrecisionStage {...baseProps({ mode: "3d" })} />);
    expect(c.querySelector('[data-testid="rail"]')).toBeTruthy();
    expect(c.querySelector('[data-testid="tree"]')).toBeTruthy();
    expect(c.querySelector('[data-testid="canvas"]')).toBeTruthy();
    // No floating layers island or cam island in precision
    expect(c.querySelector('[data-testid="layers"]')).toBeNull();
    expect(c.querySelector('[data-testid="cam"]')).toBeNull();
    // Inspector is still rendered inside the right panel
    expect(c.querySelector('[data-testid="inspector"]')).toBeTruthy();
  });
});
