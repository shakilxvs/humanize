import { db } from '@/lib/db';
import { logEvent } from '@/lib/log';
import type { AIProvider, AiCallOptions, AiCallResult, AiOperation } from './types';
import { ProviderUnavailableError } from './types';
import { OpenRouterProvider } from './providers/openrouter';
import { AnthropicProvider } from './providers/anthropic';
import { GeminiProvider } from './providers/gemini';
import { GroqProvider } from './providers/groq';
import { DeepSeekProvider } from './providers/deepseek';

const REGISTRY: Record<string, AIProvider> = {
  openrouter: new OpenRouterProvider(),
  anthropic: new AnthropicProvider(),
  gemini: new GeminiProvider(),
  groq: new GroqProvider(),
  deepseek: new DeepSeekProvider()
};

function providerOrder(operation: AiOperation): string[] {
  const configured = (process.env.AI_PROVIDER_ORDER ?? 'openrouter,anthropic,gemini,groq,deepseek')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Light task-based reordering per spec section 12 — fast provider first
  // for lightweight analysis, strongest reasoning first for reconstruction —
  // while still respecting the operator-configured order as the base list.
  if (operation === 'reconstructSection' || operation === 'reviewAssignment') {
    return preferFirst(configured, ['anthropic', 'openrouter', 'gemini', 'deepseek', 'groq']);
  }
  if (operation === 'analyzeSection' || operation === 'summarize') {
    return preferFirst(configured, ['groq', 'openrouter', 'gemini', 'anthropic', 'deepseek']);
  }
  return configured;
}

function preferFirst(base: string[], preference: string[]): string[] {
  const set = new Set(base);
  const ordered = preference.filter((p) => set.has(p));
  for (const p of base) if (!ordered.includes(p)) ordered.push(p);
  return ordered;
}

export interface CompleteWithFallbackParams extends AiCallOptions {
  assignmentId?: string;
  requestId?: string;
}

/**
 * Calls providers in order until one succeeds. Providers that are not
 * configured (missing API key) are skipped silently rather than treated
 * as failures — see spec section 46, "no fake completeness": we do not
 * pretend an unconfigured provider was tried.
 */
export async function completeWithFallback(params: CompleteWithFallbackParams): Promise<AiCallResult> {
  const order = providerOrder(params.operation);
  const attempted: string[] = [];
  let lastError: unknown;

  for (const providerId of order) {
    const provider = REGISTRY[providerId];
    if (!provider || !provider.isConfigured()) continue;

    attempted.push(providerId);
    const started = Date.now();
    try {
      const result = await provider.complete(params);
      logEvent({
        requestId: params.requestId,
        operation: params.operation,
        provider: result.provider,
        model: result.model,
        latencyMs: result.latencyMs,
        success: true,
        fallbackFrom: attempted.length > 1 ? attempted[attempted.length - 2] : undefined
      });

      if (params.assignmentId !== undefined) {
        await db.aiRequest
          .create({
            data: {
              assignmentId: params.assignmentId,
              operation: params.operation,
              provider: result.provider,
              model: result.model,
              success: true,
              fallbackFrom: attempted.length > 1 ? attempted[attempted.length - 2] : null,
              latencyMs: result.latencyMs
            }
          })
          .catch(() => undefined); // observability must never break the request
      }

      return result;
    } catch (err) {
      lastError = err;
      logEvent({
        requestId: params.requestId,
        operation: params.operation,
        provider: providerId,
        latencyMs: Date.now() - started,
        success: false,
        error: err instanceof Error ? err.message : String(err)
      });
      // fall through to next configured provider
    }
  }

  if (attempted.length === 0) {
    throw new ProviderUnavailableError(
      'none',
      'No AI provider is configured. Set at least one of OPENROUTER_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, GROQ_API_KEY, DEEPSEEK_API_KEY.'
    );
  }

  throw lastError instanceof Error
    ? lastError
    : new ProviderUnavailableError('unknown', 'All configured AI providers failed.');
}
