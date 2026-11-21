import { DomainError } from "../../../shared/domain";

const statusOf = (error: unknown): number | undefined => {
  const value = error as {
    statusCode?: number;
    status?: number;
    response?: { status?: number };
  } | null;
  return value?.statusCode ?? value?.status ?? value?.response?.status;
};

/** The error codes of a Store API error answer. */
export const errorCodes = (error: unknown): string[] =>
  (
    (error as { data?: { errors?: { code?: string }[] } } | null)?.data
      ?.errors ?? []
  ).flatMap((entry) => (entry.code ? [entry.code] : []));

/**
 * A Store API request as the port answers its failure: 404 is `not_found`,
 * 400 (e.g. an id that is no Shopware id) `invalid_value`, every other
 * failure `backend_unavailable`.
 */
export async function request<T>(
  what: string,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (cause) {
    const status = statusOf(cause);
    if (status === 404) {
      throw new DomainError(
        "not_found",
        `Shopware knows no ${what}.`,
        {},
        { cause },
      );
    }
    if (status === 400) {
      throw new DomainError(
        "invalid_value",
        `Shopware refused the request for ${what}.`,
        {},
        { cause },
      );
    }
    throw new DomainError(
      "backend_unavailable",
      `Shopware did not answer ${what}.`,
      {},
      { cause },
    );
  }
}
