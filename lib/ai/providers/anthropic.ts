import type { AIProvider, AiCallOptions, AiCallResult } from '../types';
import { ProviderUnavailableError } from '../types';

const MODEL_BY_OPERATION: Record<string, string> = {
  analyzeAssignment: 'claude-3-5-haiku-20241022',
  analyzeSection: 'claude-3-5-haiku-20241022',
  generateQuestions: 'claude-3-5-haiku-20241022',
  reconstructSection: 'claude-3-7-sonnet-20250219',
  reviewAssignment: 'claude-3-7-sonnet-20250219',
  extractContent: 'claude-3-5-haiku-20241022',
  summarize: 'claude-3-5-haiku-20241022'
};

export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic';

  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  async complete(options: AiCallOptions): Promise<AiCallResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new ProviderUnavailableError(this.id, 'ANTHROPIC_API_KEY is not configured');

    const model = MODEL_BY_OPERATION[options.operation] ?? 'claude-3-5-haiku-20241022';
    const system = options.messages.find((m) => m.role === 'system')?.content;
    const userMessages = options.messages.filter((m) => m.role === 'user');
    const started = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          system,
          max_tokens: options.maxTokens ?? 2000,
          temperature: options.temperature ?? 0.4,
          messages: userMessages.map((m) => ({ role: 'user', content: m.content }))
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

    const data = (await response.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((b) => b.type === 'text')?.text;
    if (!text) throw new ProviderUnavailableError(this.id, 'empty response from provider');

    return { text, provider: this.id, model, latencyMs: Date.now() - started };
  }
}
