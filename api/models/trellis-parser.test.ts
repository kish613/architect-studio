import { describe, expect, it } from "vitest";
import {
  DEFAULT_3D_PROVIDER,
  get3DStageForProvider,
  resolve3DProvider,
} from "../../shared/model-pipeline.js";
import {
  parseTrellisPredictResult,
} from "../../lib/trellis.js";

describe("TRELLIS payload parsing", () => {
  it("extracts the GLB URL from the live 3-output contract", () => {
    const result = parseTrellisPredictResult({
      data: [
        { state: "packed" },
        "https://example.invalid/video.mp4",
        { url: "https://blob.example.invalid/models/house.glb" },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.glbUrl).toBe("https://blob.example.invalid/models/house.glb");
    expect(result.diagnostics?.outputCount).toBe(3);
    expect(result.diagnostics?.glbCandidateCount).toBe(1);
  });

  it("rejects OBJ-only TRELLIS outputs", () => {
    const result = parseTrellisPredictResult({
      data: [
        { state: "packed" },
        "https://example.invalid/video.mp4",
        { url: "https://blob.example.invalid/models/house.obj" },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/GLB/i);
    expect(result.diagnostics?.rejectedUrl).toBe(
      "https://blob.example.invalid/models/house.obj",
    );
  });

  it("falls back to Meshy when TRELLIS is requested but unavailable", () => {
    const resolved = resolve3DProvider("trellis", {
      trellisHealthy: false,
      trellisUsable: false,
    });

    expect(DEFAULT_3D_PROVIDER).toBe("meshy");
    expect(resolved.provider).toBe("meshy");
    expect(resolved.fallbackReason).toBe("trellis_unavailable");
    expect(get3DStageForProvider(resolved.provider)).toBe("generating_3d_meshy");
  });
});
