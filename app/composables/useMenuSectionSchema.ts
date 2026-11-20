import type { Ref } from "vue";
import type { Dish, MenuSection } from "../../shared/domain";
import { moneyAmount } from "../utils/money";
import { dishLink } from "../utils/productUrl";
import { buildMenuSectionSchema } from "../utils/schema";
import { toAbsoluteUrl } from "../utils/seo";

/**
 * `MenuSection` JSON-LD for a section page (#272): the section with its
 * dishes as `MenuItem`s incl. prices, from the listing that is loaded for
 * the page anyway, with their main ingredients and diets (#400).
 */
export function useMenuSectionSchema(
  section: Ref<MenuSection | null | undefined>,
  dishes: Ref<readonly Dish[]>,
) {
  const siteConfig = useSiteConfig();
  const { currencyCode } = useCommercePrice();

  const schema = computed(() => {
    const current = section.value;
    if (!current) return undefined;

    return buildMenuSectionSchema({
      name: current.name,
      description: current.description ?? undefined,
      url: toAbsoluteUrl(siteConfig.url, current.path),
      image: current.media?.url,
      currency: dishes.value[0]?.price.currency ?? currencyCode.value,
      restaurantUrl: siteConfig.url,
      items: dishes.value.map((dish) => {
        const link = dishLink(dish, current.path);
        return {
          name: dish.name,
          url: link ? toAbsoluteUrl(siteConfig.url, link) : undefined,
          description: dish.description ?? undefined,
          ingredients: dish.ingredients.map((ingredient) => ingredient.name),
          diets: [...dish.diets],
          image: dish.media?.url,
          price: moneyAmount(dish.price),
        };
      }),
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
