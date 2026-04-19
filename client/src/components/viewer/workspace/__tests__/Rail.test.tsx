import { describe, it, expect, vi, afterEach } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Rail } from "../Rail";
import { TOOLS } from "../tools";

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

describe("Rail", () => {
  it("renders one button per tool (9 tool buttons)", async () => {
    const onTool = vi.fn();
    const c = await mount(<Rail tool="select" onTool={onTool} />);
    // Find buttons that iterate through TOOLS (look inside the rail)
    const rail = c.querySelector(".sb-rail");
    expect(rail).toBeTruthy();
    const buttons = rail!.querySelectorAll("button.sb-tool");
    // 9 tools + undo + redo + settings = 12 total buttons
    expect(buttons.length).toBe(TOOLS.length + 3);
    expect(TOOLS.length).toBe(9);
  });

  it("applies active class to current tool", async () => {
    const onTool = vi.fn();
    const c = await mount(<Rail tool="wall" onTool={onTool} />);
    const rail = c.querySelector(".sb-rail")!;
    const buttons = Array.from(rail.querySelectorAll("button.sb-tool")) as HTMLButtonElement[];
    const activeButtons = buttons.filter((b) => b.classList.contains("active"));
    expect(activeButtons.length).toBe(1);
    const wallIndex = TOOLS.findIndex((t) => t.id === "wall");
    expect(buttons[wallIndex].classList.contains("active")).toBe(true);
  });

  it("delegates tool clicks to onTool, and undo/redo/settings to their handlers", async () => {
    const onTool = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onSettings = vi.fn();
    const c = await mount(
      <Rail
        tool="select"
        onTool={onTool}
        onUndo={onUndo}
        onRedo={onRedo}
        onSettings={onSettings}
      />,
    );
    const rail = c.querySelector(".sb-rail")!;
    const buttons = Array.from(rail.querySelectorAll("button.sb-tool")) as HTMLButtonElement[];
    const doorIndex = TOOLS.findIndex((t) => t.id === "door");
    await act(async () => {
      buttons[doorIndex].click();
    });
    expect(onTool).toHaveBeenCalledWith("door");

    // After the tool buttons come undo, redo, then settings (last)
    await act(async () => {
      buttons[TOOLS.length].click();
    });
    expect(onUndo).toHaveBeenCalledTimes(1);

    await act(async () => {
      buttons[TOOLS.length + 1].click();
    });
    expect(onRedo).toHaveBeenCalledTimes(1);

    await act(async () => {
      buttons[buttons.length - 1].click();
    });
    expect(onSettings).toHaveBeenCalledTimes(1);
  });
});
