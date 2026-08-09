import type { AIProvider, AiCallOptions, AiCallResult } from '../types';
import { ProviderUnavailableError } from '../types';

// Task -> model routing. Cheaper/faster models handle lightweight
// operations; a stronger model is reserved for reconstruction, which
// needs the most reasoning quality (see spec section 35, cost
// optimization).
const MODEL_BY_OPERATION: Record<string, string> = {
  analyzeAssignment: 'openai/gpt-4o-mini',
  analyzeSection: 'openai/gpt-4o-mini',
  generateQuestions: 'openai/gpt-4o-mini',
  reconstructSection: 'anthropic/claude-3.7-sonnet',
  reviewAssignment: 'anthropic/claude-3.7-sonnet',
  extractContent: 'openai/gpt-4o-mini',
  summarize: 'openai/gpt-4o-mini'
};

export class OpenRouterProvider implements AIProvider {
  readonly id = 'openrouter';

  isConfigured(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY);
  }

  async complete(options: AiCallOptions): Promise<AiCallResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new ProviderUnavailableError(this.id, 'OPENROUTER_API_KEY is not configured');
    }

    const model = MODEL_BY_OPERATION[options.operation] ?? 'openai/gpt-4o-mini';
    const started = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          // Required-ish by OpenRouter for attribution; harmless if unset upstream.
          'HTTP-Referer': process.env.NEXTAUTH_URL ?? 'https://localhost',
          'X-Title': 'Humanize'
        },
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

    if (response.status === 429) {
      throw new ProviderUnavailableError(this.id, 'rate limited');
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ProviderUnavailableError(this.id, `HTTP ${response.status}: ${body.slice(0, 300)}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new ProviderUnavailableError(this.id, 'empty response from provider');
    }

    return {
      text,
      provider: this.id,
      model,
      latencyMs: Date.now() - started
    };
  }
}
