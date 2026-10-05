import type { NavigationMenuItem } from "@nuxt/ui";
import { buildRestaurantSchema, type MenuSectionInfo } from "../utils/schema";
import { splitList, toAbsoluteUrl } from "../utils/seo";

/**
 * `Restaurant` JSON-LD for the home page (#272): shop data from
 * `runtimeConfig.public.site`, weekly hours and closing days from the ShopBite
 * plugin, the menu sections from the menu navigation. Hours and holidays are
 * prefetched on the server so the schema is part of the HTML. Ordering,
 * delivery areas and payment methods (#401) tell AI assistants and search
 * engines how to order.
 */
export function useRestaurantSchema() {
  const { site } = useRuntimeConfig().public;
  const siteConfig = useSiteConfig();
  const { businessHours, refresh: refreshBusinessHours } = useBusinessHours();
  const { holidays, refresh: refreshHolidays } = useHolidays();
  const { menuCardMenu } = useNavigation(true);
  const { isCheckoutEnabled } = useShopBiteConfig();
  const { currencyCode } = useCommercePrice();
  const { apiClient } = useShopwareContext();

  const { data: paymentMethods } = useAsyncData(
    "restaurant-schema-payment-methods",
    async () => {
      try {
        const { data } = await apiClient.invoke(
          "readPaymentMethod post /payment-method",
          {
            body: {
              onlyAvailable: true,
              includes: { payment_method: ["name", "translated"] },
            },
          },
        );
        return (data.elements ?? []).map(
          (method) => method.translated?.name ?? method.name,
        );
      } catch (error) {
        console.error("Failed to load payment methods", error);
        return [];
      }
    },
    { default: () => [] },
  );

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

  const menuUrl = toAbsoluteUrl(siteConfig.url, "/speisekarte");

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
        deliveryAreas: splitList(site.deliveryAreas),
        geo: site.geo,
        acceptsReservations: site.acceptsReservations,
      },
      businessHours: businessHours.value ?? [],
      holidays: holidays.value ?? [],
      menuUrl,
      menuSections: menuCardMenu.value.map(toSection),
      orderUrl: isCheckoutEnabled.value ? menuUrl : undefined,
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
