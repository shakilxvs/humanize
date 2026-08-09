import type { AIProvider, AiCallOptions, AiCallResult } from '../types';
import { ProviderUnavailableError } from '../types';

const MODEL_BY_OPERATION: Record<string, string> = {
  analyzeAssignment: 'gemini-1.5-flash',
  analyzeSection: 'gemini-1.5-flash',
  generateQuestions: 'gemini-1.5-flash',
  reconstructSection: 'gemini-1.5-pro',
  reviewAssignment: 'gemini-1.5-pro',
  extractContent: 'gemini-1.5-flash',
  summarize: 'gemini-1.5-flash'
};

export class GeminiProvider implements AIProvider {
  readonly id = 'gemini';

  isConfigured(): boolean {
    return Boolean(process.env.GOOGLE_API_KEY);
  }

  async complete(options: AiCallOptions): Promise<AiCallResult> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new ProviderUnavailableError(this.id, 'GOOGLE_API_KEY is not configured');

    const model = MODEL_BY_OPERATION[options.operation] ?? 'gemini-1.5-flash';
    const system = options.messages.find((m) => m.role === 'system')?.content;
    const userText = options.messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('\n\n');
    const started = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: system ? { parts: [{ text: system }] } : undefined,
            contents: [{ role: 'user', parts: [{ text: userText }] }],
            generationConfig: {
              maxOutputTokens: options.maxTokens ?? 2000,
              temperature: options.temperature ?? 0.4,
              ...(options.jsonMode ? { responseMimeType: 'application/json' } : {})
            }
          })
        }
      );
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

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
    if (!text) throw new ProviderUnavailableError(this.id, 'empty response from provider');

    return { text, provider: this.id, model, latencyMs: Date.now() - started };
  }
}
