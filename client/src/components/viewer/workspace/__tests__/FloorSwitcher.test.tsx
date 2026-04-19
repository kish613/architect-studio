import { describe, it, expect, vi, afterEach } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

vi.mock("@/stores/use-scene", () => {
  const mod: any = {
    useScene: vi.fn(() => ({})),
  };
  return mod;
});
vi.mock("@/stores/use-viewer", () => ({
  useViewer: vi.fn((sel: any) =>
    sel({
      activeLevelId: null,
      setActiveLevel: vi.fn(),
    }),
  ),
}));

import { FloorSwitcher } from "../FloorSwitcher";
import { useScene } from "@/stores/use-scene";

afterEach(() => {
  document.body.innerHTML = "";
});

function mount(el: ReactNode) {
  const c = document.createElement("div");
  document.body.appendChild(c);
  const r = createRoot(c);
  act(() => {
    r.render(el);
  });
  return c;
}

describe("FloorSwitcher", () => {
  it("renders nothing when fewer than two levels", () => {
    (useScene as any).mockImplementation((sel: any) =>
      sel({ nodes: { l1: { id: "l1", type: "level", name: "Ground" } } }),
    );
    const c = mount(<FloorSwitcher />);
    expect(c.textContent).toBe("");
  });

  it("renders one pill per level when two or more exist", () => {
    (useScene as any).mockImplementation((sel: any) =>
      sel({
        nodes: {
          a: { id: "a", type: "level", name: "Ground" },
          b: { id: "b", type: "level", name: "First" },
          c: { id: "c", type: "wall" },
        },
      }),
    );
    const c = mount(<FloorSwitcher />);
    const buttons = c.querySelectorAll("button");
    expect(buttons.length).toBe(2);
  });
});
