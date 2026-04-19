import { describe, it, expect, vi, afterEach } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ModeSwitcher } from "../ModeSwitcher";

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

describe("ModeSwitcher", () => {
  it("renders Plan, Split, Model labels", () => {
    const c = mount(<ModeSwitcher mode="3d" onChange={() => {}} />);
    const buttons = c.querySelectorAll("button.sb-mode-btn");
    expect(buttons).toHaveLength(3);
    const texts = Array.from(buttons).map((b) => b.textContent || "");
    expect(texts[0]).toContain("Plan");
    expect(texts[1]).toContain("Split");
    expect(texts[2]).toContain("Model");
  });

  it("marks the active mode with .active", () => {
    const c = mount(<ModeSwitcher mode="split" onChange={() => {}} />);
    const active = c.querySelector("button.sb-mode-btn.active");
    expect(active?.textContent).toContain("Split");
  });

  it("calls onChange on click", () => {
    const cb = vi.fn();
    const c = mount(<ModeSwitcher mode="3d" onChange={cb} />);
    const plan = c.querySelectorAll("button.sb-mode-btn")[0] as HTMLButtonElement;
    act(() => {
      plan.click();
    });
    expect(cb).toHaveBeenCalledWith("2d");
  });
});
