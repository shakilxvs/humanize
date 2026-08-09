import { nanoid } from 'nanoid';
import type { ExtractedDocument } from '../extract';

export async function extractText(buffer: Buffer, fileName: string): Promise<ExtractedDocument> {
  const raw = buffer.toString('utf-8');
  const blocks = raw
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return {
    title: fileName.replace(/\.[^.]+$/, ''),
    sourceType: 'txt',
    paragraphs: blocks.map((text) => ({ id: nanoid(8), text }))
  };
}
