import { shopLocale } from "#shopbite-locale";
import type { NavigationMenuItem } from "./useNavigation";
import { buildRestaurantSchema, type MenuSectionInfo } from "../utils/schema";
import { splitList, toAbsoluteUrl } from "../utils/seo";

/**
 * `Restaurant` JSON-LD for the home page (#272): shop data from
 * `runtimeConfig.public.site`, opening hours and holidays from the shop
 * backend (`/api/shop/*`), the menu sections from the menu navigation. Hours and holidays are
 * prefetched on the server so the schema is part of the HTML. Ordering,
 * delivery areas and payment methods (#401) tell AI assistants and search
 * engines how to order.
 */
export function useRestaurantSchema() {
  const { site } = useRuntimeConfig().public;
  const siteConfig = useSiteConfig();
  const { openingHours, refresh: refreshOpeningHours } = useOpeningHours();
  const { holidays, refresh: refreshHolidays } = useHolidays();
  const { menuCardMenu } = useNavigation(true);
  const { acceptsOrders } = useShopConfig();
  const { currencyCode } = useCommercePrice();
  const { t } = useI18n();

  // Cached on the server (server/api/payment-methods).
  const { data: paymentMethods } = useAsyncData(
    "restaurant-schema-payment-methods",
    async () => {
      try {
        return await $fetch<string[]>("/api/payment-methods");
      } catch (error) {
        console.error("Failed to load payment methods", error);
        return [];
      }
    },
    { default: () => [] },
  );

  onServerPrefetch(() =>
    Promise.all([refreshOpeningHours(), refreshHolidays()]),
  );

  const toSection = (item: NavigationMenuItem): MenuSectionInfo => ({
    name: item.label ?? "",
    url:
      typeof item.to === "string"
        ? toAbsoluteUrl(siteConfig.url, item.to)
        : undefined,
    sections: item.children?.map(toSection),
  });

  // the menu root's path (backend data, a locale default, ADR 0002),
  // without its trailing slash as before
  const menuUrl = toAbsoluteUrl(
    siteConfig.url,
    shopLocale.menuPath.replace(/\/+$/, ""),
  );

  const schema = computed(() =>
    buildRestaurantSchema({
      site: {
        name: site.name,
        alternateNames: splitList(site.alternateNames),
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
        deliveryAreas: splitList(site.deliveryAreas),
        geo: site.geo,
        acceptsReservations: site.acceptsReservations,
      },
      openingHours: openingHours.value ?? undefined,
      holidays: holidays.value ?? [],
      menuUrl,
      menuName: t("common.schema.menuName"),
      menuSections: menuCardMenu.value.map(toSection),
      orderUrl: acceptsOrders.value ? menuUrl : undefined,
      paymentMethods: paymentMethods.value,
      currency: currencyCode.value,
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
