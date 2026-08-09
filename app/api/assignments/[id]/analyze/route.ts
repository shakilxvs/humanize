import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AppError, friendlyAiError } from '@/lib/errors';
import { requireUser, requireOwnedAssignment } from '@/lib/session';
import { completeWithFallback } from '@/lib/ai/provider';
import { buildAnalysisPrompt } from '@/lib/ai/prompts/analysis.v1';
import { ANALYSIS_PROMPT_VERSION } from '@/lib/ai/prompts/analysis.v1';
import { AnalysisResultSchema, parseJsonLoose } from '@/lib/schema/ai-output';
import { ProviderUnavailableError } from '@/lib/ai/types';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    await requireOwnedAssignment(params.id, userId);

    const sections = await db.assignmentSection.findMany({
      where: { assignmentId: params.id },
      orderBy: { order: 'asc' }
    });
    if (sections.length === 0) {
      throw new AppError('Extract a document or paste text before running analysis.', 400);
    }

    const messages = buildAnalysisPrompt(sections.map((s) => ({ id: s.id, text: s.originalText })));

    let result;
    try {
      result = await completeWithFallback({
        operation: 'analyzeAssignment',
        messages,
        jsonMode: true,
        assignmentId: params.id
      });
    } catch (err) {
      if (err instanceof ProviderUnavailableError) throw friendlyAiError();
      throw err;
    }

    const parsed = AnalysisResultSchema.safeParse(parseJsonLoose(result.text));
    if (!parsed.success) throw friendlyAiError();

    const knownSectionIds = new Set(sections.map((s) => s.id));
    parsed.data.sections = parsed.data.sections.filter((s) => knownSectionIds.has(s.sectionId));

    await db.$transaction([
      db.analysisResult.deleteMany({ where: { assignmentId: params.id } }),
      db.analysisResult.create({
        data: {
          assignmentId: params.id,
          overallSignal: parsed.data.overallSignal,
          confidence: parsed.data.confidence,
          promptVersion: ANALYSIS_PROMPT_VERSION,
          provider: result.provider,
          model: result.model
        }
      }),
      ...parsed.data.sections.map((s) =>
        db.assignmentSection.update({
          where: { id: s.sectionId },
          data: { signals: s.signals, issues: s.issues, needsInput: s.needsStudentInput }
        })
      ),
      db.assignment.update({ where: { id: params.id }, data: { status: 'analyzed' } })
    ]);

    const updatedSections = await db.assignmentSection.findMany({
      where: { assignmentId: params.id },
      orderBy: { order: 'asc' }
    });

    return NextResponse.json({
      analysis: { overallSignal: parsed.data.overallSignal, confidence: parsed.data.confidence },
      sections: updatedSections
    });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.userMessage }, { status: err.status });
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 });
  }
}
