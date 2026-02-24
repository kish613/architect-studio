import { Client, handle_file } from "@gradio/client";

const TRELLIS_SPACE = "trellis-community/TRELLIS";

export interface TrellisResult {
  success: boolean;
  glbUrl?: string;
  error?: string;
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
      hf_token: hfToken as `hf_${string}` | undefined,
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

    // Result data: [state_dict, video_url, glb_display, glb_download]
    const data = result.data as any[];

    // The GLB download URL is the 4th output (index 3)
    const glbOutput = data[3];
    let glbUrl: string | undefined;

    if (glbOutput && typeof glbOutput === "object" && glbOutput.url) {
      glbUrl = glbOutput.url;
    } else if (typeof glbOutput === "string") {
      glbUrl = glbOutput;
    }

    if (!glbUrl) {
      return {
        success: false,
        error: "TRELLIS did not return a GLB file URL",
      };
    }

    return {
      success: true,
      glbUrl,
    };
  } catch (error: any) {
    console.error("TRELLIS generation error:", error);
    return {
      success: false,
      error: error.message || "TRELLIS 3D generation failed",
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
