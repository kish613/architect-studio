/**
 * Pipeline stage 1: preprocess.
 *
 * Normalises the raw uploaded buffer into a raster the extraction stage can
 * consume. Accepts image OR PDF inputs; PDFs are rasterised to PNG via
 * `lib/pdf-utils.ts` (pdfjs-dist + @napi-rs/canvas).
 *
 * This stage does no BIM logic and has no dependency on the extractor —
 * keeping it pure means it can be re-used by future extractors (CV, IFC
 * importers, synthetic test fixtures, etc.).
 */

import { isPdfBuffer, processPdf } from "../pdf-utils.js";
import type {
  FloorplanSourceFile,
  FloorplanSourceKind,
  PreprocessResult,
} from "./types.js";

/** Detects the source kind and builds a canonical source-file descriptor. */
export function detectSource(
  buffer: Buffer,
  contentType: string | undefined
): FloorplanSourceFile {
  const declaredMime = (contentType || "").split(";")[0].trim().toLowerCase();
  const isPdf =
    declaredMime === "application/pdf" || isPdfBuffer(buffer);

  if (isPdf) {
    return { buffer, mimeType: "application/pdf", kind: "pdf", ext: "pdf" };
  }

  const kind: FloorplanSourceKind = "image";
  const mimeType =
    declaredMime.startsWith("image/") ? declaredMime : "image/png";
  const ext: "png" | "jpg" =
    mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";

  return { buffer, mimeType, kind, ext };
}

/**
 * Normalise a source file into a raster ready for extraction. PDFs are
 * rasterised at high DPI. Image inputs are passed through unchanged aside
 * from having any dimensions we can cheaply detect.
 */
export async function preprocessFloorplan(
  source: FloorplanSourceFile
): Promise<PreprocessResult> {
  if (source.kind === "pdf") {
    const result = await processPdf(source.buffer);
    return {
      imageBuffer: result.imageBuffer,
      mimeType: result.mimeType,
      width: result.width,
      height: result.height,
      pageCount: result.pageCount,
      rasterisedFromPdf: true,
    };
  }

  // Image inputs require no transformation — the extractor can consume the
  // raw buffer directly. We still wrap it in the common PreprocessResult shape
  // so downstream code does not need to special-case the source kind.
  return {
    imageBuffer: source.buffer,
    mimeType: source.mimeType,
    rasterisedFromPdf: false,
  };
}
