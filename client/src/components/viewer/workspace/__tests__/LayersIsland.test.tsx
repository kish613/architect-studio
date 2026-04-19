import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

const toggleVisibility = vi.fn();

vi.mock("@/stores/use-scene", () => ({
  useScene: vi.fn(),
}));
vi.mock("@/stores/use-viewer", () => ({
  useViewer: vi.fn(),
}));

import { LayersIsland } from "../LayersIsland";
import { useScene } from "@/stores/use-scene";
import { useViewer } from "@/stores/use-viewer";

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

const VIEWER_STATE = {
  showWalls: true,
  showWindows: true,
  showItems: true,
  showZones: true,
  showGrid: true,
  showDimensions: true,
  toggleVisibility,
};

beforeEach(() => {
  toggleVisibility.mockReset();
  (useViewer as any).mockImplementation((sel: any) => sel(VIEWER_STATE));
});

describe("LayersIsland", () => {
  it("renders 8 layer rows", async () => {
    (useScene as any).mockImplementation((sel: any) => sel({ nodes: {} }));
    const c = await mount(<LayersIsland />);
    const rows = c.querySelectorAll(".sb-layer");
    expect(rows.length).toBe(8);
  });

  it("shows real wall count from scene nodes", async () => {
    (useScene as any).mockImplementation((sel: any) =>
      sel({
        nodes: {
          w1: { id: "w1", type: "wall" },
          w2: { id: "w2", type: "wall" },
          d1: { id: "d1", type: "door" },
        },
      }),
    );
    const c = await mount(<LayersIsland />);
    const rows = Array.from(c.querySelectorAll(".sb-layer"));
    const wallsRow = rows.find((r) =>
      r.querySelector(".sb-layer-name")?.textContent?.startsWith("Walls"),
    );
    expect(wallsRow).toBeDefined();
    expect(wallsRow?.querySelector(".sb-layer-count")?.textContent).toBe("2");
  });

  it("calls toggleVisibility with mapped key for non-local layers", async () => {
    (useScene as any).mockImplementation((sel: any) => sel({ nodes: {} }));
    const c = await mount(<LayersIsland />);
    const rows = Array.from(c.querySelectorAll(".sb-layer")) as HTMLElement[];
    const windowsRow = rows.find((r) =>
      r.querySelector(".sb-layer-name")?.textContent?.startsWith("Windows"),
    );
    expect(windowsRow).toBeDefined();
    await act(async () => {
      windowsRow?.click();
    });
    expect(toggleVisibility).toHaveBeenCalledWith("showWindows");
  });

  it("does NOT call toggleVisibility when clicking the Lighting (local-only) layer", async () => {
    (useScene as any).mockImplementation((sel: any) => sel({ nodes: {} }));
    const c = await mount(<LayersIsland />);
    const rows = Array.from(c.querySelectorAll(".sb-layer")) as HTMLElement[];
    const lightRow = rows.find((r) =>
      r.querySelector(".sb-layer-name")?.textContent?.startsWith("Lighting"),
    );
    expect(lightRow).toBeDefined();
    await act(async () => {
      lightRow?.click();
    });
    expect(toggleVisibility).not.toHaveBeenCalled();
  });
});
