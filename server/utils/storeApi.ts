import type { NitroFetchOptions } from "nitropack";

/**
 * Field projection for media entities, shared by the routes that return
 * category or product images: the URL plus the thumbnails and intrinsic size
 * the storefront needs for `srcset` and `width`/`height` (#273).
 */
export const MEDIA_INCLUDES = {
  media: ["url", "alt", "thumbnails", "metaData"],
  media_thumbnail: ["url", "width", "height"],
  product_media: ["media"],
};

/**
 * Calls the Shopware Store API with a criteria in the request body.
 *
 * Criteria must travel as a POST body: sent as `_criteria` query parameters
 * on a GET, Shopware applies `associations` and `limit` but ignores the
 * `includes` projection, so every entity comes back with all of its fields
 * (a product listing was twice the size, #312).
 */
export function storeApiPost<T>(
  path: string,
  body: Record<string, unknown>,
  options: Pick<NitroFetchOptions<string>, "headers"> = {},
): Promise<T> {
  const { endpoint, accessToken } = useRuntimeConfig().public.shopware;

  return $fetch<T>(`${endpoint}${path}`, {
    method: "POST",
    headers: { "sw-access-key": accessToken, ...options.headers },
    body,
  });
}
