import { NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { AppError, friendlyTooLargeError } from '@/lib/errors';
import { requireUser, requireOwnedAssignment } from '@/lib/session';
import { extractDocument } from '@/lib/document/extract';
import { PLANS } from '@/lib/plans';

const PasteSchema = z.object({ text: z.string().min(1).max(200_000) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    await requireOwnedAssignment(params.id, userId);

    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    const plan = PLANS[user.plan as keyof typeof PLANS] ?? PLANS.free;

    const contentType = req.headers.get('content-type') ?? '';
    let paragraphs: { id: string; text: string; heading?: string }[];
    let title: string;

    if (contentType.includes('application/json')) {
      const body = PasteSchema.parse(await req.json());
      const doc = await (await import('@/lib/document/extractors/text')).extractText(
        Buffer.from(body.text, 'utf-8'),
        'Pasted text'
      );
      paragraphs = doc.paragraphs;
      title = doc.title;
    } else {
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) throw new AppError('No file was provided.', 400);

      const maxBytes = plan.maxUploadMb * 1024 * 1024;
      if (file.size > maxBytes) throw friendlyTooLargeError();

      const buffer = Buffer.from(await file.arrayBuffer());

      // Persist file metadata (not the bytes — no durable storage wired up
      // yet; see README roadmap for Vercel Blob / Firebase Storage).
      await db.documentFile.create({
        data: {
          assignmentId: params.id,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size
        }
      });

      const doc = await extractDocument({ name: file.name, type: file.type, buffer });
      paragraphs = doc.paragraphs;
      title = doc.title;
    }

    if (paragraphs.length === 0) {
      throw new AppError('No readable text was found in that document.', 422);
    }

    // Replace any prior sections for this assignment with the freshly
    // extracted ones (re-extraction is idempotent per assignment).
    await db.assignmentSection.deleteMany({ where: { assignmentId: params.id } });
    await db.assignmentSection.createMany({
      data: paragraphs.map((p, i) => ({
        id: p.id ?? nanoid(8),
        assignmentId: params.id,
        order: i,
        heading: p.heading,
        originalText: p.text,
        currentText: p.text
      }))
    });

    const combined = paragraphs.map((p) => p.text).join('\n\n');
    await db.assignmentVersion.create({
      data: { assignmentId: params.id, label: 'original', content: combined }
    });

    await db.assignment.update({
      where: { id: params.id },
      data: { title: title || undefined, status: 'draft' }
    });

    await db.usageEvent.create({
      data: { userId, kind: 'words_processed', amount: combined.split(/\s+/).filter(Boolean).length }
    });
    await db.usageEvent.create({ data: { userId, kind: 'file_processed' } });

    const sections = await db.assignmentSection.findMany({
      where: { assignmentId: params.id },
      orderBy: { order: 'asc' }
    });

    return NextResponse.json({ sections });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.userMessage }, { status: err.status });
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Please provide some text.' }, { status: 400 });
    return NextResponse.json({ error: 'That document could not be processed.' }, { status: 500 });
  }
}
