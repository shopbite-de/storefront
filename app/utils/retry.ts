/**
 * Runs `request` and, when it throws, runs it again after each of `delays`
 * (milliseconds). The error of the last attempt is thrown.
 */
export async function withRetries<T>(
  request: () => Promise<T>,
  delays: readonly number[],
): Promise<T> {
  for (const delay of delays) {
    try {
      return await request();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return request();
}
