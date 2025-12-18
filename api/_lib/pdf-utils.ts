// PDF utilities for Vercel serverless environment
// Note: PDF to image conversion requires external services on serverless
// For now, we just check if a file is a PDF and pass it through

export function isPdf(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf');
}

// On Vercel serverless, we can't use system commands like pdftoppm
// PDF files are accepted but stored as-is
// Users should upload image files for best results
export async function processPdf(pdfBuffer: Buffer): Promise<Buffer> {
  // In a serverless environment, we'd need to use:
  // 1. An external API service (like CloudConvert, Adobe PDF Services)
  // 2. A library that can render PDFs to images (heavy, not ideal for serverless)
  // For now, return the buffer as-is - the floorplan can still be processed
  // if the AI model supports PDF input
  return pdfBuffer;
}



