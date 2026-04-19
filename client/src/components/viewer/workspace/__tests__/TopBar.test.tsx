import { describe, it, expect, vi, afterEach } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { TopBar } from "../TopBar";

afterEach(() => {
  document.body.innerHTML = "";
});

function mount(el: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(el);
  });
  return container;
}

describe("TopBar", () => {
  const baseProps = {
    projectName: "Rear Extension",
    mode: "3d" as const,
    onMode: () => {},
    onOpenCmd: () => {},
  };

  it("shows project name in the crumb", () => {
    const c = mount(<TopBar {...baseProps} />);
    expect(c.textContent).toContain("Rear Extension");
    expect(c.textContent).toContain("Projects");
  });

  it("renders a user avatar svg in the top-left", () => {
    const c = mount(<TopBar {...baseProps} />);
    const topLeft = c.querySelector(".sb-top-l");
    expect(topLeft?.querySelector("svg")).toBeTruthy();
  });

  it("calls onOpenCmd when the ⌘K trigger is clicked", () => {
    const spy = vi.fn();
    const c = mount(<TopBar {...baseProps} onOpenCmd={spy} />);
    const cmd = c.querySelector(".sb-cmd-trigger") as HTMLButtonElement;
    act(() => {
      cmd.click();
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("renders Export button and fires onExport", () => {
    const spy = vi.fn();
    const c = mount(<TopBar {...baseProps} onExport={spy} />);
    const exportBtn = Array.from(c.querySelectorAll("button")).find((b) =>
      /Export/i.test(b.textContent || ""),
    );
    expect(exportBtn).toBeTruthy();
    act(() => {
      exportBtn!.click();
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("renders rightSlot content when provided", () => {
    const c = mount(
      <TopBar {...baseProps} rightSlot={<span data-testid="gen">GEN</span>} />,
    );
    expect(c.querySelector('[data-testid="gen"]')?.textContent).toBe("GEN");
  });

  it("delegates mode clicks to onMode", () => {
    const spy = vi.fn();
    const c = mount(<TopBar {...baseProps} onMode={spy} />);
    const planBtn = c.querySelector(".sb-mode-btn") as HTMLButtonElement;
    act(() => {
      planBtn.click();
    });
    expect(spy).toHaveBeenCalledWith("2d");
  });
});
