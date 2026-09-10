import type { Ref } from "vue";
import type { Schemas } from "#shopware";
import { buildMenuSectionSchema } from "../utils/schema";
import { toAbsoluteUrl } from "../utils/seo";

/**
 * `MenuSection` JSON-LD for a category page (#272): the category with its
 * products as `MenuItem`s incl. prices, from the listing that is loaded for
 * the page anyway.
 */
export function useMenuSectionSchema(
  category: Ref<Schemas["Category"] | undefined>,
  products: Ref<Schemas["Product"][]>,
) {
  const siteConfig = useSiteConfig();
  const { currencyCode } = useCommercePrice();

  const schema = computed(() => {
    const current = category.value;
    if (!current) return undefined;

    return buildMenuSectionSchema({
      name: current.translated?.name ?? current.name,
      description:
        current.translated?.description ?? current.description ?? undefined,
      url: current.seoUrl
        ? toAbsoluteUrl(siteConfig.url, current.seoUrl)
        : undefined,
      image: current.media?.url,
      currency: currencyCode.value,
      restaurantUrl: siteConfig.url,
      items: products.value.map((product) => ({
        name: product.translated?.name ?? product.name,
        description:
          product.translated?.description ?? product.description ?? undefined,
        image: product.cover?.media?.url,
        price: product.calculatedPrice?.unitPrice,
      })),
    });
  });

  useHead(() => ({
    script: schema.value
      ? [
          {
            key: "jsonld-menu-section",
            type: "application/ld+json",
            innerHTML: JSON.stringify(schema.value),
          },
        ]
      : [],
  }));

  return { schema };
}
