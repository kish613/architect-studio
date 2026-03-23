import { describe, expect, it, vi } from "vitest";
import { createNode } from "@/lib/pascal/schemas";
import { createFinishMaterial } from "@/lib/pascal/finish-resolver";

describe("createFinishMaterial", () => {
  it("does not emit Three warnings when side is omitted", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const wall = createNode("wall", {
      start: { x: 0, y: 0, z: 0 },
      end: { x: 4, y: 0, z: 0 },
      name: "Wall",
    });

    const material = createFinishMaterial(wall, "wall");

    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("parameter 'side' has value of undefined")
    );

    material.dispose();
    warnSpy.mockRestore();
  });
});
