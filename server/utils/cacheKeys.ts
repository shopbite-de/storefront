/**
 * The version of a cached handler's answer shape. Handlers that answer
 * domain types under the name a handler with Shopware's shapes had before
 * (ADR 0001: `listing`, `search`, `top-sellers`, `variant` in step 2,
 * `navigation`, `breadcrumb` in step 3) prefix their keys with it, so a
 * shop with persistent cache storage never serves an old shape to the new
 * app. Raise it when such a shape changes again.
 */
export const ANSWER_SHAPE = "v2";

export const versionedKey = (key: string): string => `${ANSWER_SHAPE}-${key}`;
