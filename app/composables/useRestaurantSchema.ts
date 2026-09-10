import type { NavigationMenuItem } from "@nuxt/ui";
import { buildRestaurantSchema, type MenuSectionInfo } from "../utils/schema";
import { toAbsoluteUrl } from "../utils/seo";

/**
 * `Restaurant` JSON-LD for the home page (#272): shop data from
 * `runtimeConfig.public.site`, weekly hours and closing days from the ShopBite
 * plugin, the menu sections from the menu navigation. Hours and holidays are
 * prefetched on the server so the schema is part of the HTML.
 */
export function useRestaurantSchema() {
  const { site } = useRuntimeConfig().public;
  const siteConfig = useSiteConfig();
  const { businessHours, refresh: refreshBusinessHours } = useBusinessHours();
  const { holidays, refresh: refreshHolidays } = useHolidays();
  const { menuCardMenu } = useNavigation(true);

  onServerPrefetch(() =>
    Promise.all([refreshBusinessHours(), refreshHolidays()]),
  );

  const toSection = (item: NavigationMenuItem): MenuSectionInfo => ({
    name: item.label ?? "",
    url:
      typeof item.to === "string"
        ? toAbsoluteUrl(siteConfig.url, item.to)
        : undefined,
    sections: item.children?.map(toSection),
  });

  const schema = computed(() =>
    buildRestaurantSchema({
      site: {
        name: site.name,
        description: site.description,
        url: siteConfig.url,
        image: site.ogImage
          ? toAbsoluteUrl(siteConfig.url, site.ogImage)
          : undefined,
        telephone: site.telephone,
        cuisine: site.cuisine,
        priceRange: site.priceRange,
        googleBusinessProfileUrl: site.googleBusinessProfileUrl,
        address: site.address,
      },
      businessHours: businessHours.value ?? [],
      holidays: holidays.value ?? [],
      menuUrl: toAbsoluteUrl(siteConfig.url, "/speisekarte"),
      menuSections: menuCardMenu.value.map(toSection),
    }),
  );

  useHead(() => ({
    script: [
      {
        key: "jsonld-restaurant",
        type: "application/ld+json",
        innerHTML: JSON.stringify(schema.value),
      },
    ],
  }));

  return { schema };
}
