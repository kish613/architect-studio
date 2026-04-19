import { describe, it, expect, vi, afterEach } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ToolDock } from "../ToolDock";
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

describe("ToolDock", () => {
  it("renders one button per tool (9 tool buttons + 2 history buttons)", async () => {
    const onTool = vi.fn();
    const c = await mount(<ToolDock tool="select" onTool={onTool} />);
    const toolButtons = c.querySelectorAll(".sb-tool");
    // 9 tools + undo + redo
    expect(toolButtons.length).toBe(TOOLS.length + 2);
    expect(TOOLS.length).toBe(9);
  });

  it("applies active class to current tool", async () => {
    const onTool = vi.fn();
    const c = await mount(<ToolDock tool="wall" onTool={onTool} />);
    const buttons = Array.from(c.querySelectorAll(".sb-tool")) as HTMLButtonElement[];
    const activeButtons = buttons.filter((b) => b.classList.contains("active"));
    expect(activeButtons.length).toBe(1);
    // The active button should be the "wall" tool (index 2 in TOOLS)
    const wallIndex = TOOLS.findIndex((t) => t.id === "wall");
    expect(buttons[wallIndex].classList.contains("active")).toBe(true);
  });

  it("calls onTool when a tool button is clicked", async () => {
    const onTool = vi.fn();
    const c = await mount(<ToolDock tool="select" onTool={onTool} />);
    const buttons = Array.from(c.querySelectorAll(".sb-tool")) as HTMLButtonElement[];
    const doorIndex = TOOLS.findIndex((t) => t.id === "door");
    await act(async () => {
      buttons[doorIndex].click();
    });
    expect(onTool).toHaveBeenCalledWith("door");
  });

  it("calls onUndo and onRedo when those buttons are clicked", async () => {
    const onTool = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const c = await mount(
      <ToolDock tool="select" onTool={onTool} onUndo={onUndo} onRedo={onRedo} />,
    );
    const buttons = Array.from(c.querySelectorAll(".sb-tool")) as HTMLButtonElement[];
    // Last two buttons are undo and redo
    await act(async () => {
      buttons[buttons.length - 2].click();
    });
    await act(async () => {
      buttons[buttons.length - 1].click();
    });
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });
});
