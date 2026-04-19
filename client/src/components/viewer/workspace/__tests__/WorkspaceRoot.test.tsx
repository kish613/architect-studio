import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { WorkspaceRoot } from "../WorkspaceRoot";

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

async function renderWorkspace(element: ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(element);
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

describe("WorkspaceRoot", () => {
  it("renders children inside scoped root with data-layout", async () => {
    const container = await renderWorkspace(
      <WorkspaceRoot layout="studio">
        <span>hello</span>
      </WorkspaceRoot>
    );
    const helloSpan = Array.from(container.querySelectorAll("span")).find(
      (el) => el.textContent === "hello",
    );
    expect(helloSpan).toBeDefined();
    const root = helloSpan?.closest(".workspace-root") as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.getAttribute("data-layout")).toBe("studio");
  });

  it("applies the 'precision' data-layout attribute when requested", async () => {
    const container = await renderWorkspace(
      <WorkspaceRoot layout="precision">
        <span>hi</span>
      </WorkspaceRoot>
    );
    const hiSpan = Array.from(container.querySelectorAll("span")).find(
      (el) => el.textContent === "hi",
    );
    const root = hiSpan?.closest(".workspace-root") as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.getAttribute("data-layout")).toBe("precision");
  });
});
