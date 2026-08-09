// Shared types for the AI provider abstraction (see section 11 of the spec).

export type AiOperation =
  | 'analyzeAssignment'
  | 'analyzeSection'
  | 'generateQuestions'
  | 'reconstructSection'
  | 'reviewAssignment'
  | 'extractContent'
  | 'summarize';

export interface AiMessage {
  role: 'system' | 'user';
  content: string;
}

export interface AiCallOptions {
  operation: AiOperation;
  messages: AiMessage[];
  /** Ask the provider to return JSON matching a documented shape. */
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface AiCallResult {
  text: string;
  provider: string;
  model: string;
  latencyMs: number;
}

export class ProviderUnavailableError extends Error {
  constructor(public provider: string, message: string) {
    super(message);
  }
}

/**
 * Every AI provider (Gemini, Anthropic, OpenRouter, Groq, DeepSeek, ...)
 * implements this interface. Higher-level app logic (analysis, question
 * generation, reconstruction) never talks to a vendor SDK directly — only
 * to this interface — so providers can be swapped or added without
 * touching feature code.
 */
export interface AIProvider {
  readonly id: string;
  /** True when the provider has the environment variables it needs. */
  isConfigured(): boolean;
  complete(options: AiCallOptions): Promise<AiCallResult>;
}
