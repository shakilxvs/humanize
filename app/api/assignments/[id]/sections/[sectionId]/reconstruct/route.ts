import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { AppError, friendlyAiError } from '@/lib/errors';
import { requireUser, requireOwnedAssignment } from '@/lib/session';
import { completeWithFallback } from '@/lib/ai/provider';
import { buildReconstructionPrompt } from '@/lib/ai/prompts/reconstruction.v1';
import { ReconstructionResultSchema, parseJsonLoose } from '@/lib/schema/ai-output';
import { ProviderUnavailableError } from '@/lib/ai/types';

const BodySchema = z.object({
  style: z
    .enum([
      'Simple Academic',
      'Natural Academic',
      'Formal Academic',
      'Concise',
      'Detailed',
      'Personal / Reflective',
      'Match My Writing Style'
    ])
    .default('Natural Academic')
});

export async function POST(req: Request, { params }: { params: { id: string; sectionId: string } }) {
  try {
    const { userId } = await requireUser();
    await requireOwnedAssignment(params.id, userId);

    const section = await db.assignmentSection.findUnique({ where: { id: params.sectionId } });
    if (!section || section.assignmentId !== params.id) throw new AppError('Section not found.', 404);

    const parsedBody = BodySchema.safeParse(await req.json().catch(() => ({})));
    const style = parsedBody.success ? parsedBody.data.style : 'Natural Academic';

    const answers = await db.studentAnswer.findMany({
      where: { sectionId: section.id },
      include: { question: true }
    });

    if (answers.length === 0) {
      throw new AppError('Answer at least one question for this section before reconstructing it.', 400);
    }

    const messages = buildReconstructionPrompt({
      sectionId: section.id,
      originalText: section.originalText,
      style,
      answers: answers.map((a) => ({ question: a.question.question, answer: a.answer, type: a.type }))
    });

    let result;
    try {
      result = await completeWithFallback({
        operation: 'reconstructSection',
        messages,
        jsonMode: true,
        assignmentId: params.id
      });
    } catch (err) {
      if (err instanceof ProviderUnavailableError) throw friendlyAiError();
      throw err;
    }

    const parsed = ReconstructionResultSchema.safeParse(parseJsonLoose(result.text));
    if (!parsed.success) throw friendlyAiError();

    const reconstruction = await db.reconstructedSection.create({
      data: {
        sectionId: section.id,
        original: section.originalText,
        personalized: parsed.data.personalized,
        studentInputsUsed: parsed.data.studentInputsUsed,
        changes: parsed.data.changes,
        potentialUnsupportedClaims: parsed.data.potentialUnsupportedClaims,
        status: 'proposed'
      }
    });

    return NextResponse.json({ reconstruction });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.userMessage }, { status: err.status });
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid style option.' }, { status: 400 });
    return NextResponse.json({ error: 'Reconstruction failed. Please try again.' }, { status: 500 });
  }
}

// Accept/edit/reject a proposed reconstruction (spec section 19).
const DecisionSchema = z.object({
  reconstructionId: z.string(),
  decision: z.enum(['accept', 'reject']),
  editedText: z.string().max(20_000).optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string; sectionId: string } }) {
  try {
    const { userId } = await requireUser();
    await requireOwnedAssignment(params.id, userId);

    const body = DecisionSchema.parse(await req.json());
    const recon = await db.reconstructedSection.findUnique({ where: { id: body.reconstructionId } });
    if (!recon || recon.sectionId !== params.sectionId) throw new AppError('Reconstruction not found.', 404);

    const finalText = body.decision === 'accept' ? (body.editedText ?? recon.personalized) : recon.original;
    const status = body.decision === 'reject' ? 'rejected' : body.editedText ? 'edited' : 'accepted';

    await db.$transaction([
      db.reconstructedSection.update({ where: { id: recon.id }, data: { status } }),
      db.assignmentSection.update({
        where: { id: params.sectionId },
        data: { currentText: finalText, needsInput: status === 'rejected' }
      })
    ]);

    return NextResponse.json({ status, currentText: finalText });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.userMessage }, { status: err.status });
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    return NextResponse.json({ error: 'Could not save your decision.' }, { status: 500 });
  }
}
