export const MODEL_3D_PROVIDERS = ["meshy", "trellis"] as const;

export type Model3DProvider = (typeof MODEL_3D_PROVIDERS)[number];

export const MODEL_PIPELINE_PROVIDERS = ["gemini", ...MODEL_3D_PROVIDERS] as const;

export type ModelPipelineProvider = (typeof MODEL_PIPELINE_PROVIDERS)[number];
export type ModelGenerationProvider = ModelPipelineProvider;

export const MODEL_PIPELINE_STAGES = [
  "uploaded",
  "generating_pascal",
  "pascal_ready",
  "generating_isometric",
  "isometric_ready",
  "generating_3d",
  "generating_3d_meshy",
  "generating_3d_trellis",
  "retexturing",
  "completed",
  "failed",
] as const;

export type ModelPipelineStage = (typeof MODEL_PIPELINE_STAGES)[number];

export const DEFAULT_3D_PROVIDER: Model3DProvider = "meshy";

export function get3DStageForProvider(provider: Model3DProvider): ModelPipelineStage {
  return provider === "trellis" ? "generating_3d_trellis" : "generating_3d_meshy";
}

export function isProviderSpecific3DStage(
  stage: string | null | undefined
): stage is "generating_3d_meshy" | "generating_3d_trellis" {
  return stage === "generating_3d_meshy" || stage === "generating_3d_trellis";
}

export function isValidGlbUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  return /\.glb(?:[?#].*)?$/i.test(url.trim());
}

export interface Resolve3DProviderOptions {
  trellisHealthy?: boolean;
  trellisUsable?: boolean;
}

export interface Resolved3DProvider {
  provider: Model3DProvider;
  fallbackReason?: "trellis_unavailable";
}

export function resolve3DProvider(
  requestedProvider?: string | null,
  options: Resolve3DProviderOptions = {}
): Resolved3DProvider {
  const requested = (requestedProvider || "").toLowerCase();
  const trellisAvailable =
    options.trellisHealthy !== false && options.trellisUsable !== false;

  if (requested === "trellis" && trellisAvailable) {
    return { provider: "trellis" };
  }

  if (requested === "trellis" && !trellisAvailable) {
    return {
      provider: DEFAULT_3D_PROVIDER,
      fallbackReason: "trellis_unavailable",
    };
  }

  return { provider: DEFAULT_3D_PROVIDER };
}
