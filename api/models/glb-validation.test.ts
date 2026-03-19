import { describe, expect, it } from "vitest";
import { isValidGlbUrl } from "../../shared/model-pipeline.js";
import { parseMeshyTaskResponse } from "../../lib/meshy.js";

describe("GLB validation", () => {
  it("accepts valid GLB URLs and rejects OBJ-only URLs", () => {
    expect(isValidGlbUrl("https://blob.example.invalid/model.glb")).toBe(true);
    expect(isValidGlbUrl("https://blob.example.invalid/model.obj")).toBe(false);
  });

  it("refuses to persist Meshy OBJ-only outputs", () => {
    const result = parseMeshyTaskResponse({
      status: "SUCCEEDED",
      model_urls: {
        obj: "https://meshy.example.invalid/model.obj",
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/GLB/i);
    expect(result.diagnostics?.rejectedUrl).toBe(
      "https://meshy.example.invalid/model.obj",
    );
  });

  it("accepts Meshy GLB outputs", () => {
    const result = parseMeshyTaskResponse({
      status: "SUCCEEDED",
      model_urls: {
        glb: "https://meshy.example.invalid/model.glb",
        obj: "https://meshy.example.invalid/model.obj",
      },
    });

    expect(result.success).toBe(true);
    expect(result.modelUrl).toBe("https://meshy.example.invalid/model.glb");
  });
});
