import { describe, expect, it } from 'vitest';
import { AnalysisResultSchema, QuestionsResultSchema, ReconstructionResultSchema, parseJsonLoose } from '@/lib/schema/ai-output';

describe('AI output validation', () => {
  it('accepts a well-formed analysis response', () => {
    const parsed = AnalysisResultSchema.safeParse({
      overallSignal: 72,
      confidence: 'medium',
      sections: [
        {
          sectionId: 'abc123',
          signals: { genericLanguage: 'high', repetition: 'medium', specificity: 'low', reasoning: 'low', evidence: 'medium' },
          issues: ['No specific example given'],
          needsStudentInput: true
        }
      ]
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a signal value outside the enum (prevents malformed provider output reaching the DB)', () => {
    const parsed = AnalysisResultSchema.safeParse({
      overallSignal: 72,
      confidence: 'medium',
      sections: [
        {
          sectionId: 'abc123',
          signals: { genericLanguage: 'extreme', repetition: 'medium', specificity: 'low', reasoning: 'low', evidence: 'medium' },
          issues: [],
          needsStudentInput: true
        }
      ]
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects an out-of-range overallSignal', () => {
    const parsed = AnalysisResultSchema.safeParse({ overallSignal: 150, confidence: 'medium', sections: [] });
    expect(parsed.success).toBe(false);
  });

  it('rejects a question type outside the documented enum', () => {
    const parsed = QuestionsResultSchema.safeParse({
      questions: [{ id: 'q1', type: 'made_up_type', question: 'What happened?' }]
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts a reconstruction response and defaults missing arrays', () => {
    const parsed = ReconstructionResultSchema.safeParse({
      original: 'Original text.',
      personalized: 'Personalized text.'
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.studentInputsUsed).toEqual([]);
      expect(parsed.data.potentialUnsupportedClaims).toEqual([]);
    }
  });

  it('strips markdown code fences before parsing JSON', () => {
    const result = parseJsonLoose('```json\n{"a": 1}\n```');
    expect(result).toEqual({ a: 1 });
  });
});
