import { describe, it, expect, vi, afterEach } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { CommandPalette } from "../CommandPalette";

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

describe("CommandPalette", () => {
  it("renders nothing when closed", () => {
    mount(<CommandPalette open={false} onClose={() => {}} onPick={() => {}} />);
    expect(
      document.body.querySelector('[data-testid="command-palette-overlay"]'),
    ).toBeNull();
  });

  it("renders overlay and list when open", () => {
    mount(<CommandPalette open={true} onClose={() => {}} onPick={() => {}} />);
    expect(
      document.body.querySelector('[data-testid="command-palette-overlay"]'),
    ).toBeTruthy();
    const list = document.body.querySelector(
      '[data-testid="command-palette-list"]',
    );
    expect(list).toBeTruthy();
    // All default commands present
    expect(list?.querySelectorAll("button").length).toBeGreaterThan(5);
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    mount(<CommandPalette open={true} onClose={onClose} onPick={() => {}} />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the overlay backdrop is clicked", () => {
    const onClose = vi.fn();
    mount(<CommandPalette open={true} onClose={onClose} onPick={() => {}} />);
    const overlay = document.body.querySelector(
      '[data-testid="command-palette-overlay"]',
    ) as HTMLElement;
    act(() => {
      overlay.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("filters commands by query", () => {
    mount(<CommandPalette open={true} onClose={() => {}} onPick={() => {}} />);
    const input = document.body.querySelector(
      '[data-testid="command-palette-input"]',
    ) as HTMLInputElement;
    // React tracks its own value; use the native setter so React sees the change
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    act(() => {
      nativeSetter?.call(input, "walk");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const buttons = document.body.querySelectorAll(
      '[data-testid="command-palette-list"] button',
    );
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toContain("Walk-through");
  });

  it("calls onPick with the action when a command is clicked", () => {
    const onPick = vi.fn();
    mount(<CommandPalette open={true} onClose={() => {}} onPick={onPick} />);
    const modeSplit = document.body.querySelector(
      'button[data-action="mode:split"]',
    ) as HTMLButtonElement;
    expect(modeSplit).toBeTruthy();
    act(() => {
      modeSplit.click();
    });
    expect(onPick).toHaveBeenCalledWith("mode:split");
  });
});
