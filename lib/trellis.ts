import { Client, handle_file } from "@gradio/client";
import { isValidGlbUrl } from "../shared/model-pipeline.js";

const TRELLIS_SPACE = "trellis-community/TRELLIS";

export interface TrellisParseDiagnostics {
  rawType: string;
  outputCount: number;
  outputKinds: string[];
  glbCandidateCount: number;
  rejectedUrl?: string;
}

export interface TrellisParseSuccess {
  success: true;
  glbUrl: string;
  diagnostics: TrellisParseDiagnostics;
}

export interface TrellisParseFailure {
  success: false;
  error: string;
  diagnostics: TrellisParseDiagnostics;
}

export type TrellisParseResult = TrellisParseSuccess | TrellisParseFailure;

export interface TrellisResult {
  success: boolean;
  glbUrl?: string;
  error?: string;
  diagnostics?: TrellisParseDiagnostics;
}

export interface TrellisOptions {
  seed?: number;
  ssGuidanceStrength?: number;
  ssSamplingSteps?: number;
  slatGuidanceStrength?: number;
  slatSamplingSteps?: number;
  meshSimplify?: number;
  textureSize?: number;
}

const DEFAULT_OPTIONS: Required<TrellisOptions> = {
  seed: 0,
  ssGuidanceStrength: 7.5,
  ssSamplingSteps: 12,
  slatGuidanceStrength: 3.0,
  slatSamplingSteps: 12,
  meshSimplify: 0.95,
  textureSize: 1024,
};

function getTrellisOutputs(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown[] }).data)) {
    return (payload as { data: unknown[] }).data;
  }

  return null;
}

function normalizeOutputValue(output: unknown): string | undefined {
  if (typeof output === "string") {
    return output;
  }

  if (output && typeof output === "object") {
    const candidate = (output as { url?: unknown }).url;
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  return undefined;
}

export function parseTrellisPredictResult(payload: unknown): TrellisParseResult {
  const outputs = getTrellisOutputs(payload);
  const diagnostics: TrellisParseDiagnostics = {
    rawType: Array.isArray(payload)
      ? "array"
      : payload && typeof payload === "object"
        ? "object"
        : typeof payload,
    outputCount: outputs?.length ?? 0,
    outputKinds: outputs?.map((output) => {
      if (typeof output === "string") return "string";
      if (output && typeof output === "object") return "object";
      return typeof output;
    }) ?? [],
    glbCandidateCount: 0,
  };

  if (!outputs || outputs.length < 3) {
    return {
      success: false,
      error: "TRELLIS response missing required outputs",
      diagnostics,
    };
  }

  const glbCandidates = outputs
    .slice(2)
    .map(normalizeOutputValue)
    .filter((value): value is string => Boolean(value));
  diagnostics.glbCandidateCount = glbCandidates.length;

  const glbUrl = glbCandidates.find(isValidGlbUrl);
  if (glbUrl) {
    return {
      success: true,
      glbUrl,
      diagnostics,
    };
  }

  const rejectedUrl = glbCandidates.find((value) => /\.obj(?:[?#].*)?$/i.test(value));
  if (rejectedUrl) {
    diagnostics.rejectedUrl = rejectedUrl;
    return {
      success: false,
      error: "TRELLIS returned an OBJ-only result; a GLB is required",
      diagnostics,
    };
  }

  if (glbCandidates.length > 0) {
    diagnostics.rejectedUrl = glbCandidates[0];
  }

  return {
    success: false,
    error: "TRELLIS did not return a valid GLB output",
    diagnostics,
  };
}

/**
 * Generate a 3D GLB model from an image using TRELLIS v1 via the Gradio Space.
 * This call is synchronous — it blocks until the model is generated (30-120s).
 *
 * Returns a temporary URL to the GLB file on the Space. This URL is ephemeral
 * and should be downloaded + stored permanently (e.g. Vercel Blob) immediately.
 */
export async function generateTrellis3D(
  imageUrl: string,
  options?: TrellisOptions
): Promise<TrellisResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const hfToken = process.env.HF_TOKEN;
    const client = await Client.connect(TRELLIS_SPACE, {
      token: hfToken as `hf_${string}` | undefined,
    });

    const result = await client.predict("/generate_and_extract_glb", [
      handle_file(imageUrl),  // image
      null,                    // multiimages (not used for single image)
      false,                   // is_multiimage
      opts.seed,
      opts.ssGuidanceStrength,
      opts.ssSamplingSteps,
      opts.slatGuidanceStrength,
      opts.slatSamplingSteps,
      "stochastic",            // multiimage_algo
      opts.meshSimplify,
      opts.textureSize,
    ]);

    const parsed = parseTrellisPredictResult(result);
    if (!parsed.success) {
      return parsed;
    }

    return {
      success: true,
      glbUrl: parsed.glbUrl,
      diagnostics: parsed.diagnostics,
    };
  } catch (error: any) {
    console.error("TRELLIS generation error:", error);
    return {
      success: false,
      error: error.message || "TRELLIS 3D generation failed",
      diagnostics: {
        rawType: "exception",
        outputCount: 0,
        outputKinds: [],
        glbCandidateCount: 0,
      },
    };
  }
}

/**
 * Download a GLB file from a URL and return it as a Buffer.
 * Used to download the temporary file from the Gradio Space before uploading to Vercel Blob.
 */
export async function downloadGlb(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download GLB: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
