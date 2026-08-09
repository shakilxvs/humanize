import { AppError, friendlyFileError } from '@/lib/errors';
import { extractText } from './extractors/text';
import { extractPdf } from './extractors/pdf';
import { extractDocx } from './extractors/docx';

export interface ExtractedParagraph {
  id: string;
  heading?: string;
  text: string;
}

export interface ExtractedDocument {
  title: string;
  sourceType: 'txt' | 'pdf' | 'docx' | 'paste';
  paragraphs: ExtractedParagraph[];
}

// Formats implemented for real in this build. Anything outside this list
// is rejected with a clear message rather than silently returning empty
// or fabricated content (spec section 46 — no fake completeness).
const IMPLEMENTED_MIME: Record<string, ExtractedDocument['sourceType']> = {
  'text/plain': 'txt',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
};

const NOT_YET_IMPLEMENTED = new Set([
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/zip',
  'image/png',
  'image/jpeg',
  'image/webp'
]);

export async function extractDocument(file: { name: string; type: string; buffer: Buffer }): Promise<ExtractedDocument> {
  const kind = IMPLEMENTED_MIME[file.type];

  if (!kind) {
    if (NOT_YET_IMPLEMENTED.has(file.type)) {
      throw new AppError(
        'This file format (PPTX, DOC, ZIP, or image OCR) is not supported in this build yet. Supported now: TXT, PDF, DOCX, or pasted text.',
        422
      );
    }
    throw friendlyFileError();
  }

  switch (kind) {
    case 'txt':
      return extractText(file.buffer, file.name);
    case 'pdf':
      return extractPdf(file.buffer, file.name);
    case 'docx':
      return extractDocx(file.buffer, file.name);
  }
}
