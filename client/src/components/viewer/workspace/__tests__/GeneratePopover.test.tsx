import { describe, it, expect, vi, afterEach } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { GeneratePopover } from "../GeneratePopover";

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

const baseProps = {
  hasPascal: false,
  hasIsometric: false,
  has3D: false,
  isPascalLoading: false,
  isIsometricLoading: false,
  is3DLoading: false,
  isRetexturing: false,
  provider3D: "meshy" as const,
  onProviderChange: () => {},
  onPascal: () => {},
  onIsometric: () => {},
  onGenerate3D: () => {},
  onRetexture: () => {},
  onRevert: () => {},
};

describe("GeneratePopover", () => {
  it("renders a Generate trigger button", () => {
    const c = mount(<GeneratePopover {...baseProps} />);
    const btn = c.querySelector("button.sb-btn.sb-btn-primary");
    expect(btn).toBeTruthy();
    expect(btn?.textContent).toContain("Generate");
  });

  it("trigger is disabled when disabled prop is true", () => {
    const c = mount(<GeneratePopover {...baseProps} disabled />);
    const btn = c.querySelector(
      "button.sb-btn.sb-btn-primary",
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("opening the popover renders the 4 action rows in the document", () => {
    const c = mount(<GeneratePopover {...baseProps} />);
    const trigger = c.querySelector(
      "button.sb-btn.sb-btn-primary",
    ) as HTMLButtonElement;
    act(() => {
      trigger.click();
    });
    // Radix portals content to document.body
    const body = document.body.textContent || "";
    expect(body).toContain("Pascal BIM");
    expect(body).toContain("Isometric render");
    expect(body).toContain("3D mesh");
    expect(body).toContain("Retexture");
  });

  it("clicking the Pascal Generate button invokes onPascal", () => {
    const onPascal = vi.fn();
    const c = mount(<GeneratePopover {...baseProps} onPascal={onPascal} />);
    const trigger = c.querySelector(
      "button.sb-btn.sb-btn-primary",
    ) as HTMLButtonElement;
    act(() => {
      trigger.click();
    });
    // Find the Pascal row's Generate CTA in the portaled content
    const allButtons = Array.from(document.body.querySelectorAll("button"));
    // First row (Pascal) CTA is the first button whose parent text includes "Pascal BIM"
    const pascalRow = allButtons.find((b) => {
      const parent = b.closest("div");
      return (
        b.textContent?.trim() === "Generate" &&
        parent?.textContent?.includes("Pascal BIM")
      );
    });
    expect(pascalRow).toBeTruthy();
    act(() => {
      pascalRow!.click();
    });
    expect(onPascal).toHaveBeenCalledTimes(1);
  });
});
