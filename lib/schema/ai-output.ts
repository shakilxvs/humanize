import { z } from 'zod';

// Structured AI output contracts (spec section 45). Every AI response is
// validated against these before it touches the database or the UI.

export const SignalLevel = z.enum(['low', 'medium', 'high']);

export const SectionAnalysisSchema = z.object({
  sectionId: z.string(),
  signals: z.object({
    genericLanguage: SignalLevel,
    repetition: SignalLevel,
    specificity: SignalLevel,
    reasoning: SignalLevel,
    evidence: SignalLevel
  }),
  issues: z.array(z.string()).default([]),
  needsStudentInput: z.boolean()
});

export const AnalysisResultSchema = z.object({
  overallSignal: z.number().int().min(0).max(100),
  confidence: z.enum(['low', 'medium', 'high']),
  sections: z.array(SectionAnalysisSchema)
});
export type AnalysisResultOutput = z.infer<typeof AnalysisResultSchema>;

export const QuestionTypeSchema = z.enum([
  'personal_experience',
  'personal_opinion',
  'specific_example',
  'course_knowledge',
  'reasoning',
  'interpretation',
  'observation',
  'evidence',
  'clarification'
]);

export const QuestionsResultSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      type: QuestionTypeSchema,
      question: z.string(),
      reason: z.string().optional()
    })
  )
});
export type QuestionsResultOutput = z.infer<typeof QuestionsResultSchema>;

export const ReconstructionResultSchema = z.object({
  original: z.string(),
  personalized: z.string(),
  studentInputsUsed: z.array(z.string()).default([]),
  changes: z.array(z.string()).default([]),
  potentialUnsupportedClaims: z.array(z.string()).default([])
});
export type ReconstructionResultOutput = z.infer<typeof ReconstructionResultSchema>;

/** Strips markdown code fences some models wrap JSON in, then parses. */
export function parseJsonLoose(text: string): unknown {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
  return JSON.parse(cleaned);
}
