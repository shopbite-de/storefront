/**
 * 404 for a page without content. On the server Nuxt renders the error page
 * for every error, and Nitro logs a `[request error] [fatal]` block for fatal
 * ones, which scanner traffic (`/.env`, `/.git/config`) turned into hundreds
 * of error logs a day (#363). In the browser only a fatal error shows the
 * error page, so it stays fatal there for client-side navigation.
 */
export function createNotFoundError(statusMessage = "Page not found") {
  return createError({
    statusCode: 404,
    statusMessage,
    fatal: import.meta.client,
  });
}
