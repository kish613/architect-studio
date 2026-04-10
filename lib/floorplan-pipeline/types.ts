/**
 * Shared types for the BIM-first floorplan extraction pipeline.
 *
 * The pipeline is structured as a small set of composable modules:
 *
 *   preprocess ─► extract ─► validate ─► (to-pascal | to-viewer)
 *
 * Each module has a single, testable responsibility. The orchestration happens
 * in the API route handler, not inside the modules themselves.
 */

import type { CanonicalBim } from "../../shared/bim/canonical-schema.js";

/** Supported raw input file kinds for the pipeline. */
export type FloorplanSourceKind = "image" | "pdf";

/** The original file the user uploaded. */
export interface FloorplanSourceFile {
  /** Original buffer exactly as uploaded. */
  buffer: Buffer;
  /** MIME type declared by the client / detected by magic bytes. */
  mimeType: string;
  /** Detected kind after PDF sniffing. */
  kind: FloorplanSourceKind;
  /** Extension used to build blob filenames. */
  ext: "pdf" | "png" | "jpg";
}

/**
 * Result of the preprocess stage — a normalised raster ready for extraction.
 * For image inputs the buffer is typically the same as `FloorplanSourceFile`;
 * for PDFs this is the rasterised first page.
 */
export interface PreprocessResult {
  /** Raster buffer (always an image mime type). */
  imageBuffer: Buffer;
  mimeType: string;
  width?: number;
  height?: number;
  pageCount?: number;
  /** True if the preprocess actually rasterised a PDF. */
  rasterisedFromPdf: boolean;
}

/** Diagnostics surfaced by any pipeline stage. */
export interface PipelineDiagnostic {
  stage:
    | "preprocess"
    | "extract"
    | "validate"
    | "to-pascal"
    | "to-viewer"
    | "persist";
  code: string;
  message: string;
}

/**
 * A generic extractor signature. Initially the default extractor uses the
 * existing Gemini path, but this interface means we can plug in alternative
 * extractors (CV models, IFC importers, synthetic test data, etc.) without
 * touching the API route.
 */
export interface FloorplanExtractor {
  name: string;
  extract(input: PreprocessResult): Promise<ExtractorResult>;
}

/**
 * Result of an extractor: the canonical BIM and any extractor-specific
 * diagnostics. Extractors are expected to already produce a shape compatible
 * with the canonical BIM schema — validation happens afterwards.
 */
export interface ExtractorResult {
  bim: CanonicalBim;
  diagnostics: PipelineDiagnostic[];
}

/** The aggregated result returned by the pipeline to the API handler. */
export interface PipelineResult {
  bim: CanonicalBim;
  diagnostics: PipelineDiagnostic[];
  /** The preprocessed raster the extractor saw. Useful for diagnostics UI. */
  preprocess: PreprocessResult;
}
