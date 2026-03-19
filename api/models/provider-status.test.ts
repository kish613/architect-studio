import { describe, expect, it } from "vitest";
import {
  get3DStageForProvider,
  isProviderSpecific3DStage,
  resolve3DProvider,
} from "../../shared/model-pipeline.js";

describe("3D provider status progression", () => {
  it("uses Meshy by default", () => {
    const resolved = resolve3DProvider();

    expect(resolved.provider).toBe("meshy");
    expect(get3DStageForProvider(resolved.provider)).toBe("generating_3d_meshy");
  });

  it("understands provider-specific 3D stages", () => {
    expect(isProviderSpecific3DStage("generating_3d_meshy")).toBe(true);
    expect(isProviderSpecific3DStage("generating_3d_trellis")).toBe(true);
    expect(isProviderSpecific3DStage("generating_3d")).toBe(false);
  });

  it("falls back from TRELLIS to Meshy when TRELLIS is unhealthy", () => {
    const resolved = resolve3DProvider("trellis", {
      trellisHealthy: false,
      trellisUsable: false,
    });

    expect(resolved.provider).toBe("meshy");
    expect(resolved.fallbackReason).toBe("trellis_unavailable");
  });
});
