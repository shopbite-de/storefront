import { queryCollection } from "@nuxt/content/server";
import { shopLocale } from "#shopbite-locale";
import { defineEventHandler } from "nuxt/server";
import { fulfillmentLeadTime } from "../../app/utils/leadTime";
import { splitList, toAbsoluteUrl } from "../../app/utils/seo";
import { buildLlmsTxt, toLlmsMenu } from "../utils/llmsTxt";
import {
  holidaysData,
  openingHoursData,
  shippingMethodsData,
  shopConfigData,
} from "../utils/shopData";

/**
 * `/llms.txt` (#402): the shop, its hours, ordering and the menu as Markdown
 * for language models. Every source is optional; a failing request leaves
 * its section out instead of failing the file.
 *
 * A `nuxt/server` handler: its event has the web-standard shape that
 * `getPathRobotConfig()` of @nuxtjs/robots 7 reads.
 */
export default defineEventHandler(async (event) => {
  const { site } = useRuntimeConfig().public;
  const siteUrl = getSiteConfig(event).url;
  const { catalog } = useBackend();
  // the shop's locale (ADR 0002): the detector always answers it
  // useTranslation reads only `event.context.i18n`, which the i18n server
  // plugin sets per request; the web-standard event shares that context
  const translate = await useTranslation(
    event as unknown as Parameters<typeof useTranslation>[0],
  );
  const words = {
    t: (key: string, params?: Record<string, string | number>) =>
      translate(key, params ?? {}),
    language: shopLocale.language,
  };

  const [menu, dishes, hours, holidays, config, shippingMethods, pages, home] =
    await Promise.allSettled([
      // the menu through the catalog (ADR 0001, step 2); the route's `swr`
      // caches the file
      catalog.getMenu(),
      catalog.listMenuDishes(),
      // restaurant operations through the ports (ADR 0001), cached
      openingHoursData.cached(),
      holidaysData.cached(),
      shopConfigData.cached(),
      shippingMethodsData.cached(),
      queryCollection(event, "landingpages")
        .select("path", "title", "description")
        .all(),
      queryCollection(event, "home").select("faq").first(),
    ]);

  const value = <T>(result: PromiseSettledResult<T>) =>
    result.status === "fulfilled" ? result.value : undefined;

  const menuDishes = value(dishes) ?? [];
  const body = buildLlmsTxt(
    {
      name: site.name,
      alternateNames: splitList(site.alternateNames),
      description: site.description,
      url: siteUrl,
      cuisine: site.cuisine,
      address: {
        street: site.address.street,
        postalCode: site.address.postalCode
          ? String(site.address.postalCode)
          : undefined,
        city: site.address.city,
      },
      telephone: site.telephone,
      googleBusinessProfileUrl: site.googleBusinessProfileUrl,
      deliveryAreas: splitList(site.deliveryAreas),
      openingHours: value(hours),
      holidays: value(holidays),
      acceptsOrders: value(config)?.acceptsOrders,
      // lead times of the delivery and pickup methods (shopbite#6)
      deliveryTime: fulfillmentLeadTime(value(shippingMethods), "delivery"),
      pickupTime: fulfillmentLeadTime(value(shippingMethods), "pickup"),
      // the menu root without its trailing slash, as before ADR 0002
      menuUrl: toAbsoluteUrl(siteUrl, shopLocale.menuPath.replace(/\/+$/, "")),
      menu: toLlmsMenu(value(menu) ?? [], menuDishes, siteUrl, words.language),
      pages: (value(pages) ?? [])
        // Pages the shop keeps out of robots.txt (legal pages) stay out here.
        .filter(
          (page) =>
            getPathRobotConfig(event, {
              path: page.path,
              skipSiteIndexable: true,
            }).indexable,
        )
        .map((page) => ({
          title: page.title,
          url: toAbsoluteUrl(siteUrl, page.path),
          description: page.description,
        })),
      faq: value(home)?.faq?.items,
      currency: menuDishes[0]?.price.currency,
      now: new Date(),
      timeZone: value(config)?.timeZone ?? useRuntimeConfig().shopBite.timeZone,
    },
    words,
  );

  event.res.headers.set("Content-Type", "text/markdown; charset=utf-8");
  return body;
});
