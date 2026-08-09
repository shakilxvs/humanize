// Maps internal/provider errors to messages that are safe to show a user.
// Technical detail is logged server-side (see lib/log.ts) and never sent
// to the client.

export class AppError extends Error {
  public readonly userMessage: string;
  public readonly status: number;

  constructor(userMessage: string, status = 400, cause?: unknown) {
    super(userMessage);
    this.userMessage = userMessage;
    this.status = status;
    if (cause) this.cause = cause;
  }
}

export function friendlyAiError(): AppError {
  return new AppError(
    'AI processing is temporarily unavailable. We tried multiple providers and none could complete the request — please try again shortly.',
    503
  );
}

export function friendlyFileError(): AppError {
  return new AppError('That file could not be processed. Please check the format and try again.', 422);
}

export function friendlyTooLargeError(): AppError {
  return new AppError('Your document is too large for the current plan limits.', 413);
}

export function friendlySearchError(): AppError {
  return new AppError('Source search is temporarily unavailable.', 503);
}
