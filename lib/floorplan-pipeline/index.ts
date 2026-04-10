/**
 * Public entry-point for the BIM-first floorplan extraction pipeline.
 *
 *   upload ─► preprocess ─► extract ─► validate ─► to-pascal / to-viewer
 *
 * The API route orchestrates which stages to run and in what order — but
 * this module exposes `runFloorplanPipeline`, a convenience wrapper that
 * runs the whole chain end-to-end with a configurable extractor. That
 * keeps the API route slim and the pipeline individually testable.
 *
 * Scope:
 * - Pure business logic only. No HTTP, no DB, no auth — those live in the
 *   route handler.
 * - The extractor is injected so tests can swap in a stub extractor that
 *   produces a deterministic canonical BIM without hitting Gemini.
 */

import { preprocessFloorplan, detectSource } from "./preprocess.js";
import { validateCanonicalBim } from "./validate.js";
import type {
  FloorplanExtractor,
  FloorplanSourceFile,
  PipelineDiagnostic,
  PipelineResult,
} from "./types.js";

export * from "./types.js";
export * from "./canonical-schema.js";
export * from "./preprocess.js";
export * from "./extract.js";
export * from "./validate.js";
export * from "./to-pascal.js";
export * from "./to-viewer.js";

export interface RunPipelineOptions {
  source: FloorplanSourceFile;
  extractor: FloorplanExtractor;
}

/**
 * End-to-end pipeline runner.
 *
 * Preprocess → Extract → Validate. Returns the canonical BIM, the
 * preprocessed raster, and a flat list of diagnostics from every stage.
 * Downstream callers can then run `canonicalBimToPascalScene(bim)` for
 * the legacy editor, `toBimViewerPayload(bim)` for the BIM viewer, etc.
 */
export async function runFloorplanPipeline(
  opts: RunPipelineOptions
): Promise<PipelineResult> {
  const diagnostics: PipelineDiagnostic[] = [];

  // 1. Preprocess
  let preprocess;
  try {
    preprocess = await preprocessFloorplan(opts.source);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to preprocess floorplan";
    throw Object.assign(new Error(message), {
      diagnostics: [
        {
          stage: "preprocess" as const,
          code: "preprocess-failed",
          message,
        },
      ],
    });
  }

  // 2. Extract
  let extractorResult;
  try {
    extractorResult = await opts.extractor.extract(preprocess);
  } catch (err) {
    const extractorDiagnostics =
      (err as Error & { diagnostics?: PipelineDiagnostic[] }).diagnostics ?? [];
    throw Object.assign(
      new Error(err instanceof Error ? err.message : "Extractor failed"),
      {
        diagnostics: [
          ...diagnostics,
          ...extractorDiagnostics,
          {
            stage: "extract" as const,
            code: "extractor-threw",
            message: err instanceof Error ? err.message : "Extractor threw",
          },
        ],
      }
    );
  }
  diagnostics.push(...extractorResult.diagnostics);

  // 3. Validate
  const { bim, diagnostics: validateDiagnostics } = validateCanonicalBim(
    extractorResult.bim
  );
  diagnostics.push(...validateDiagnostics);

  return { bim, preprocess, diagnostics };
}

/** Detect the source kind from a raw buffer + content-type header. */
export { detectSource };
