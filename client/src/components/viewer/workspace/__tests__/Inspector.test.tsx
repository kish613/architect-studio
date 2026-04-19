import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

vi.mock("@/stores/use-scene", () => ({
  useScene: vi.fn(),
}));
vi.mock("@/stores/use-viewer", () => ({
  useViewer: vi.fn(),
}));

import { Inspector } from "../Inspector";
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

function setSelection(id: string | undefined) {
  (useViewer as any).mockImplementation((sel: any) =>
    sel({ selectedIds: id ? [id] : [] }),
  );
}

function setNodes(nodes: Record<string, any>) {
  (useScene as any).mockImplementation((sel: any) => sel({ nodes }));
}

beforeEach(() => {
  (useViewer as any).mockReset();
  (useScene as any).mockReset();
});

function fieldLabels(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(".sb-field label")).map(
    (l) => l.textContent || "",
  );
}

describe("Inspector", () => {
  it("shows the empty state when nothing is selected", async () => {
    setSelection(undefined);
    setNodes({});
    const c = await mount(<Inspector />);
    expect(c.textContent).toContain("Nothing selected");
  });

  it("renders Length, Height, Thickness for a wall selection", async () => {
    setSelection("w1");
    setNodes({
      w1: {
        id: "w1",
        type: "wall",
        start: { x: 0, y: 0, z: 0 },
        end: { x: 3, y: 0, z: 0 },
        height: 2.7,
        thickness: 0.15,
        material: "plaster",
      },
    });
    const c = await mount(<Inspector />);
    const labels = fieldLabels(c);
    expect(labels).toContain("Length");
    expect(labels).toContain("Height");
    expect(labels).toContain("Thickness");
  });

  it("renders Width and Height (no Sill) for a door selection", async () => {
    setSelection("d1");
    setNodes({
      d1: {
        id: "d1",
        type: "door",
        width: 0.9,
        height: 2.1,
        wallId: "w1",
      },
    });
    const c = await mount(<Inspector />);
    const labels = fieldLabels(c);
    expect(labels).toContain("Width");
    expect(labels).toContain("Height");
    expect(labels).not.toContain("Sill");
  });

  it("renders Width/Depth/Height for an item selection", async () => {
    setSelection("i1");
    setNodes({
      i1: {
        id: "i1",
        type: "item",
        dimensions: { x: 1.2, y: 0.75, z: 0.6 },
      },
    });
    const c = await mount(<Inspector />);
    const labels = fieldLabels(c);
    expect(labels).toContain("Width");
    expect(labels).toContain("Depth");
    expect(labels).toContain("Height");
  });

  it("marks the matching material chip as active", async () => {
    setSelection("w1");
    setNodes({
      w1: {
        id: "w1",
        type: "wall",
        start: { x: 0, y: 0, z: 0 },
        end: { x: 1, y: 0, z: 0 },
        height: 2.7,
        thickness: 0.15,
        material: "concrete",
      },
    });
    const c = await mount(<Inspector />);
    const activeMats = c.querySelectorAll(".sb-mat.active");
    expect(activeMats.length).toBe(1);
    expect((activeMats[0] as HTMLElement).getAttribute("title")).toContain(
      "Concrete",
    );
  });
});
