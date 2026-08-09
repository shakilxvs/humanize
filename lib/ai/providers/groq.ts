import type { AIProvider, AiCallOptions, AiCallResult } from '../types';
import { ProviderUnavailableError } from '../types';

// Groq is used for fast, lightweight analysis passes (spec section 12).
const MODEL_BY_OPERATION: Record<string, string> = {
  analyzeAssignment: 'llama-3.1-8b-instant',
  analyzeSection: 'llama-3.1-8b-instant',
  generateQuestions: 'llama-3.1-8b-instant',
  reconstructSection: 'llama-3.1-70b-versatile',
  reviewAssignment: 'llama-3.1-70b-versatile',
  extractContent: 'llama-3.1-8b-instant',
  summarize: 'llama-3.1-8b-instant'
};

export class GroqProvider implements AIProvider {
  readonly id = 'groq';

  isConfigured(): boolean {
    return Boolean(process.env.GROQ_API_KEY);
  }

  async complete(options: AiCallOptions): Promise<AiCallResult> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new ProviderUnavailableError(this.id, 'GROQ_API_KEY is not configured');

    const model = MODEL_BY_OPERATION[options.operation] ?? 'llama-3.1-8b-instant';
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    let response: Response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: options.messages,
          max_tokens: options.maxTokens ?? 2000,
          temperature: options.temperature ?? 0.4,
          ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {})
        })
      });
    } catch (err) {
      throw new ProviderUnavailableError(this.id, `network error: ${(err as Error).message}`);
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 429) throw new ProviderUnavailableError(this.id, 'rate limited');
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ProviderUnavailableError(this.id, `HTTP ${response.status}: ${body.slice(0, 300)}`);
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new ProviderUnavailableError(this.id, 'empty response from provider');

    return { text, provider: this.id, model, latencyMs: Date.now() - started };
  }
}
