import { nanoid } from 'nanoid';
import type { ExtractedDocument } from '../extract';
import { friendlyFileError } from '@/lib/errors';

export async function extractPdf(buffer: Buffer, fileName: string): Promise<ExtractedDocument> {
  // Lazy-imported: pdf-parse touches the filesystem at module load in some
  // environments, so we only pull it in when actually parsing a PDF.
  const pdfParse = (await import('pdf-parse')).default;

  let data: { text: string; numpages: number };
  try {
    data = await pdfParse(buffer);
  } catch {
    throw friendlyFileError();
  }

  const blocks = data.text
    .split(/\n{2,}/)
    .map((b) => b.replace(/\s+/g, ' ').trim())
    .filter((b) => b.length > 0);

  if (blocks.length === 0) {
    // Likely a scanned/image-only PDF — OCR is not implemented in this
    // build (see README). We say so rather than returning an empty doc.
    throw friendlyFileError();
  }

  return {
    title: fileName.replace(/\.[^.]+$/, ''),
    sourceType: 'pdf',
    paragraphs: blocks.map((text) => ({ id: nanoid(8), text }))
  };
}
