import { describe, it, expect, afterEach } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { StatusBar } from "../StatusBar";

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

describe("StatusBar", () => {
  it("renders saved label by default", () => {
    const c = mount(<StatusBar />);
    expect(c.textContent).toContain("Saved · just now");
    // .sb-stat.ok is present for saved
    expect(c.querySelector(".sb-stat.ok")).toBeTruthy();
  });

  it("renders custom saved label", () => {
    const c = mount(<StatusBar savedLabel="Saved · 2 min ago" />);
    expect(c.textContent).toContain("Saved · 2 min ago");
  });

  it("renders dims and area with room count", () => {
    const c = mount(
      <StatusBar dims="12.4 × 6.8 m" area="72 m²" roomCount={4} />,
    );
    expect(c.textContent).toContain("12.4 × 6.8 m");
    expect(c.textContent).toContain("72 m²");
    expect(c.textContent).toContain("4 rooms");
  });

  it("renders layer count over layerMax", () => {
    const c = mount(<StatusBar layerCount={5} layerMax={8} />);
    expect(c.textContent).toMatch(/Layer\s*5\/8/);
  });

  it("formats triCount in thousands", () => {
    const c = mount(<StatusBar triCount={2400} />);
    expect(c.textContent).toContain("2.4k");
  });

  it("renders version slug when provided", () => {
    const c = mount(<StatusBar version="v3.2 · draft" />);
    expect(c.textContent).toContain("v3.2 · draft");
  });

  it("uses the sb-statusbar class", () => {
    const c = mount(<StatusBar />);
    expect(c.querySelector("footer.sb-statusbar")).toBeTruthy();
  });
});
