import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { PascalRenderBoundary } from "./PascalRenderBoundary";

function HealthyChild() {
  return createElement("div", null, "Pascal Canvas Healthy");
}

function BrokenChild() {
  throw new Error("Canvas exploded");
}

describe("PascalRenderBoundary", () => {
  it("renders healthy Pascal content when no runtime error occurs", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(
          PascalRenderBoundary,
          {
            title: "Pascal crashed",
            description: "This should not render while the child is healthy.",
          },
          createElement(HealthyChild),
        ),
      );
    });

    expect(container.textContent).toContain("Pascal Canvas Healthy");
    root.unmount();
  });

  it("renders recovery UI when the Pascal child throws", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const handlePrimary = vi.fn();

    await act(async () => {
      root.render(
        createElement(
          PascalRenderBoundary,
          {
            title: "Pascal crashed",
            description: "The route should recover instead of going blank.",
            primaryAction: { label: "Retry", onClick: handlePrimary },
          },
          createElement(BrokenChild),
        ),
      );
    });

    expect(container.textContent).toContain("Pascal crashed");
    expect(container.textContent).toContain("The route should recover instead of going blank.");
    expect(container.textContent).toContain("Canvas exploded");
    expect(container.textContent).toContain("Retry");
    root.unmount();
  });
});
