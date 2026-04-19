import { describe, it, expect } from "vitest";
import { toStorePreset, STUDIO_PRESETS } from "../camera-presets";

describe("camera preset mapping", () => {
  it("maps prototype preset ids to useViewer CameraPreset", () => {
    expect(toStorePreset("iso")).toBe("isometric");
    expect(toStorePreset("front")).toBe("front");
    expect(toStorePreset("side")).toBe("right");
    expect(toStorePreset("top")).toBe("top");
    expect(toStorePreset("walk")).toBe("perspective");
  });

  it("exposes all five presets in order", () => {
    expect(STUDIO_PRESETS.map(p => p.id)).toEqual(["iso", "front", "side", "top", "walk"]);
  });

  it("every preset has the right icon and label", () => {
    expect(STUDIO_PRESETS.find(p => p.id === "iso")).toEqual({ id: "iso", icon: "box", label: "Isometric" });
    expect(STUDIO_PRESETS.find(p => p.id === "walk")).toEqual({ id: "walk", icon: "footprints", label: "Walk" });
  });
});
