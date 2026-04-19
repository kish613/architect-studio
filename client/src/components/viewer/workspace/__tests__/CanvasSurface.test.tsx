import { describe, it, expect, vi, afterEach } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

// Mock the expensive canvases so tests don't spin up R3F/WebGL
vi.mock("@/components/viewer/FloorplanCanvas", () => ({
  FloorplanCanvas: () => <div data-testid="fp-2d" />,
}));
vi.mock("@/components/viewer/Model3DViewer", () => ({
  Model3DViewer: ({ modelUrl }: any) => <div data-testid="m3d" data-url={modelUrl} />,
  Model3DPlaceholder: () => <div data-testid="m3d-placeholder" />,
}));
vi.mock("@/components/viewer/R3FCanvas", () => ({
  R3FCanvas: () => <div data-testid="r3f" />,
}));

import { CanvasSurface } from "../CanvasSurface";

afterEach(() => { document.body.innerHTML = ""; });

function mount(el: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(el); });
  return container;
}

describe("CanvasSurface", () => {
  it("renders FloorplanCanvas in 2D mode", () => {
    const c = mount(<CanvasSurface mode="2d" hasPascal={false} modelUrl={null} onGenerate={() => {}} />);
    expect(c.querySelector("[data-testid=\"fp-2d\"]")).toBeTruthy();
  });

  it("renders R3FCanvas in 3D mode when Pascal scene available", () => {
    const c = mount(<CanvasSurface mode="3d" hasPascal modelUrl={null} onGenerate={() => {}} />);
    expect(c.querySelector("[data-testid=\"r3f\"]")).toBeTruthy();
    expect(c.querySelector("[data-testid=\"m3d\"]")).toBeNull();
  });

  it("renders Model3DViewer in 3D mode when only modelUrl is available", () => {
    const c = mount(<CanvasSurface mode="3d" hasPascal={false} modelUrl="/m.glb" onGenerate={() => {}} />);
    const m = c.querySelector("[data-testid=\"m3d\"]");
    expect(m).toBeTruthy();
    expect(m?.getAttribute("data-url")).toBe("/m.glb");
  });

  it("renders empty-state CTA when no 3D source is available", () => {
    const onGen = vi.fn();
    const c = mount(<CanvasSurface mode="3d" hasPascal={false} modelUrl={null} onGenerate={onGen} />);
    const btn = Array.from(c.querySelectorAll("button")).find(b => /Generate 3D/i.test(b.textContent || ""));
    expect(btn).toBeTruthy();
    act(() => { btn!.click(); });
    expect(onGen).toHaveBeenCalledTimes(1);
  });

  it("renders both canvases in split mode", () => {
    const c = mount(<CanvasSurface mode="split" hasPascal modelUrl={null} onGenerate={() => {}} />);
    expect(c.querySelector("[data-testid=\"fp-2d\"]")).toBeTruthy();
    expect(c.querySelector("[data-testid=\"r3f\"]")).toBeTruthy();
  });

  it("split with only modelUrl shows 2D + Model3DViewer", () => {
    const c = mount(<CanvasSurface mode="split" hasPascal={false} modelUrl="/a.glb" onGenerate={() => {}} />);
    expect(c.querySelector("[data-testid=\"fp-2d\"]")).toBeTruthy();
    expect(c.querySelector("[data-testid=\"m3d\"]")).toBeTruthy();
  });
});
