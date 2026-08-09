// Structured logging. Never logs full assignment content or student
// answers — only operational metadata needed for observability/debugging.

interface LogEvent {
  requestId?: string;
  operation: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
  success?: boolean;
  fallbackFrom?: string;
  estCostUsd?: number;
  error?: string;
}

export function logEvent(event: LogEvent) {
  // In production, swap this for your log sink of choice (e.g. a
  // Vercel-compatible drain). Kept as structured console output so it is
  // useful out of the box without additional infrastructure.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...event }));
}
