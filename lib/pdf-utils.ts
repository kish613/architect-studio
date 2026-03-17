// PDF utilities for Vercel serverless environment
// Converts PDF first page to high-resolution PNG using pdfjs-dist + @napi-rs/canvas

import { createCanvas } from "@napi-rs/canvas";

/** Check whether a filename looks like a PDF. */
export function isPdf(filename: string): boolean {
  return filename.toLowerCase().endsWith(".pdf");
}

/** Check whether a buffer starts with the PDF magic bytes (%PDF). */
export function isPdfBuffer(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46 // F
  );
}

export interface PdfConversionResult {
  imageBuffer: Buffer;
  mimeType: "image/png";
  pageCount: number;
  width: number;
  height: number;
}

/**
 * Convert the first page of a PDF to a high-resolution PNG image.
 *
 * Uses pdfjs-dist for parsing and @napi-rs/canvas for server-side rendering.
 * Both are pure JS / prebuilt native — no system binaries required (works on Vercel).
 *
 * The output is at least 2048 px wide (300 DPI equivalent for most floor plans).
 */
export async function processPdf(pdfBuffer: Buffer): Promise<PdfConversionResult> {
  // Dynamic import so the worker setup stays lazy
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Load the PDF document from a Uint8Array copy of the buffer
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    // Disable worker threads — we run synchronously in the same V8 isolate
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;

  if (pageCount === 0) {
    throw new Error("PDF has no pages");
  }

  // Render only the first page
  const page = await pdfDoc.getPage(1);
  const unscaledViewport = page.getViewport({ scale: 1 });

  // Compute scale so the output is at least 2048 px on the wider axis
  const TARGET_PX = 2048;
  const longerSide = Math.max(unscaledViewport.width, unscaledViewport.height);
  const scale = Math.max(TARGET_PX / longerSide, 1);

  const viewport = page.getViewport({ scale });
  const width = Math.floor(viewport.width);
  const height = Math.floor(viewport.height);

  // Create an @napi-rs/canvas and obtain a 2D context
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Fill white background (PDFs may have transparent backgrounds)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // pdfjs-dist expects a CanvasRenderingContext2D-compatible object.
  // @napi-rs/canvas provides one that is close enough.
  // We pass `canvas: null` and supply `canvasContext` — pdfjs uses whichever is available.
  await page.render({
    canvas: canvas as any,
    canvasContext: ctx as any,
    viewport,
  }).promise;

  // Encode the canvas to PNG
  const pngBuffer = canvas.toBuffer("image/png");

  // Clean up
  page.cleanup();
  await pdfDoc.destroy();

  return {
    imageBuffer: Buffer.from(pngBuffer),
    mimeType: "image/png",
    pageCount,
    width,
    height,
  };
}
