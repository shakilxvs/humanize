import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { AppError, friendlyAiError } from '@/lib/errors';
import { requireUser, requireOwnedAssignment } from '@/lib/session';
import { completeWithFallback } from '@/lib/ai/provider';
import { buildQuestionsPrompt } from '@/lib/ai/prompts/questions.v1';
import { QuestionsResultSchema, parseJsonLoose } from '@/lib/schema/ai-output';
import { ProviderUnavailableError } from '@/lib/ai/types';

export async function POST(_req: Request, { params }: { params: { id: string; sectionId: string } }) {
  try {
    const { userId } = await requireUser();
    await requireOwnedAssignment(params.id, userId);

    const section = await db.assignmentSection.findUnique({ where: { id: params.sectionId } });
    if (!section || section.assignmentId !== params.id) throw new AppError('Section not found.', 404);

    const issues = Array.isArray(section.issues) ? (section.issues as string[]) : [];
    const messages = buildQuestionsPrompt({ id: section.id, text: section.originalText, issues });

    let result;
    try {
      result = await completeWithFallback({
        operation: 'generateQuestions',
        messages,
        jsonMode: true,
        assignmentId: params.id
      });
    } catch (err) {
      if (err instanceof ProviderUnavailableError) throw friendlyAiError();
      throw err;
    }

    const parsed = QuestionsResultSchema.safeParse(parseJsonLoose(result.text));
    if (!parsed.success) throw friendlyAiError();

    await db.question.deleteMany({ where: { sectionId: section.id } });
    const created = await db.$transaction(
      parsed.data.questions.map((q) =>
        db.question.create({
          data: {
            id: nanoid(8),
            sectionId: section.id,
            type: q.type,
            question: q.question,
            reason: q.reason
          }
        })
      )
    );

    return NextResponse.json({ questions: created });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.userMessage }, { status: err.status });
    return NextResponse.json({ error: 'Could not generate questions. Please try again.' }, { status: 500 });
  }
}
