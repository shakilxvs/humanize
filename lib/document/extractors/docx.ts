import mammoth from 'mammoth';
import { nanoid } from 'nanoid';
import type { ExtractedDocument } from '../extract';
import { friendlyFileError } from '@/lib/errors';

export async function extractDocx(buffer: Buffer, fileName: string): Promise<ExtractedDocument> {
  let result: { value: string };
  try {
    result = await mammoth.extractRawText({ buffer });
  } catch {
    throw friendlyFileError();
  }

  const blocks = result.value
    .split(/\n{1,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length === 0) throw friendlyFileError();

  return {
    title: fileName.replace(/\.[^.]+$/, ''),
    sourceType: 'docx',
    paragraphs: blocks.map((text) => ({ id: nanoid(8), text }))
  };
}
