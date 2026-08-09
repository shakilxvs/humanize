import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { requireUser, requireOwnedAssignment } from '@/lib/session';

const AnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string().min(1).max(4000),
  type: z.enum([
    'personal_experience',
    'personal_opinion',
    'specific_example',
    'course_knowledge',
    'reasoning',
    'interpretation',
    'observation',
    'evidence',
    'clarification'
  ])
});

export async function POST(req: Request, { params }: { params: { id: string; sectionId: string } }) {
  try {
    const { userId } = await requireUser();
    await requireOwnedAssignment(params.id, userId);

    const body = AnswerSchema.parse(await req.json());
    const question = await db.question.findUnique({ where: { id: body.questionId } });
    if (!question || question.sectionId !== params.sectionId) throw new AppError('Question not found.', 404);

    const answer = await db.studentAnswer.upsert({
      where: {
        // No natural unique constraint on (questionId) in schema, so find-then-write.
        id: (await db.studentAnswer.findFirst({ where: { questionId: body.questionId } }))?.id ?? '__none__'
      },
      update: { answer: body.answer, type: body.type },
      create: {
        assignmentId: params.id,
        sectionId: params.sectionId,
        questionId: body.questionId,
        answer: body.answer,
        type: body.type
      }
    });

    return NextResponse.json({ answer });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.userMessage }, { status: err.status });
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Please provide a valid answer.' }, { status: 400 });
    return NextResponse.json({ error: 'Could not save your answer.' }, { status: 500 });
  }
}
