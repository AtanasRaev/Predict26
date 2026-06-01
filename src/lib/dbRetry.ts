function isTransientDatabaseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes("connection terminated") ||
    message.includes("connection reset") ||
    message.includes("connection closed") ||
    message.includes("terminating connection") ||
    message.includes("timeout exceeded")
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withTransientDbRetry<T>(
  operation: () => Promise<T>,
  attempts = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDatabaseError(error) || attempt === attempts) break;
      await wait(150 * attempt);
    }
  }

  throw lastError;
}
