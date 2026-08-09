import type { AIProvider, AiCallOptions, AiCallResult } from '../types';
import { ProviderUnavailableError } from '../types';

const MODEL_BY_OPERATION: Record<string, string> = {
  analyzeAssignment: 'deepseek-chat',
  analyzeSection: 'deepseek-chat',
  generateQuestions: 'deepseek-chat',
  reconstructSection: 'deepseek-reasoner',
  reviewAssignment: 'deepseek-reasoner',
  extractContent: 'deepseek-chat',
  summarize: 'deepseek-chat'
};

export class DeepSeekProvider implements AIProvider {
  readonly id = 'deepseek';

  isConfigured(): boolean {
    return Boolean(process.env.DEEPSEEK_API_KEY);
  }

  async complete(options: AiCallOptions): Promise<AiCallResult> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new ProviderUnavailableError(this.id, 'DEEPSEEK_API_KEY is not configured');

    const model = MODEL_BY_OPERATION[options.operation] ?? 'deepseek-chat';
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch('https://api.deepseek.com/chat/completions', {
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
