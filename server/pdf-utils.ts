import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export async function convertPdfToImage(pdfPath: string, outputDir: string): Promise<string> {
  const baseName = path.basename(pdfPath, '.pdf');
  const outputPath = path.join(outputDir, `${baseName}-page`);
  
  try {
    await execAsync(`pdftoppm -png -r 300 -singlefile "${pdfPath}" "${outputPath}"`);
    
    const outputFile = `${outputPath}.png`;
    
    const exists = await fs.access(outputFile).then(() => true).catch(() => false);
    if (!exists) {
      throw new Error('PDF conversion failed - no output file created');
    }
    
    return outputFile;
  } catch (error: any) {
    console.error('PDF conversion error:', error);
    throw new Error(`Failed to convert PDF: ${error.message}`);
  }
}

export function isPdf(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf');
}
