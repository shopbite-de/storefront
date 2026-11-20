import type { Schemas } from "#shopware";
import type { Dish } from "../../shared/domain";
import { moneyAmount } from "../utils/money";

/** What tracking names of a dish: its menu number, name and price. */
type TrackedDish = Pick<Dish, "number" | "name" | "price">;

type MatomoWindow = Window & { _paq?: unknown[][] };

export function useTrackEvent() {
  const { enabled } = useMatomoConfig();

  // Commands go into Matomo's `_paq` queue; matomo.js processes what was
  // pushed before it loaded, so tracking does not depend on the script (which
  // `plugins/matomo.ts` loads after `onNuxtReady`, #314). Tracking is a no-op
  // when Matomo is not configured (#294).
  function push(command: unknown[]) {
    if (!enabled || import.meta.server) return;
    const matomoWindow = window as MatomoWindow;
    (matomoWindow._paq ??= []).push(command);
  }

  // Page views are pushed by `plugins/matomo.ts` (initial page and every
  // `page:finish`), not by the registry's page watcher. The URL keeps only
  // harmless query parameters (`trackingUrl`): e-mail links carry secrets.
  function trackPageView(path: string) {
    push(["setCustomUrl", trackingUrl(path)]);
    push(["setDocumentTitle", document.title]);
    push(["trackPageView"]);
  }

  // The dish sheet as a product view; the category stays unset (false).
  function trackProductView(dish: TrackedDish) {
    push([
      "setEcommerceView",
      dish.number,
      dish.name,
      false,
      moneyAmount(dish.price),
    ]);
    push(["trackPageView", dish.number]);
  }

  function trackOrder(order: Schemas["Order"]) {
    order.lineItems?.forEach((item) => {
      if (item.type === "container") return;
      push([
        "addEcommerceItem",
        item.product?.productNumber ?? item.id,
        item.label,
        item.product?.seoCategory?.name ?? false,
        item.unitPrice,
        item.quantity,
      ]);
    });

    push(["trackEcommerceOrder", order.orderNumber, order.price.totalPrice]);
  }

  function trackAddToWishlist(entry: { productNumber: string }) {
    push(["trackEvent", "Product", "AddToWishlist", entry.productNumber]);
  }

  function trackAddToCart(dish: Pick<Dish, "number">, quantity: number) {
    push(["trackEvent", "Cart", "AddToCart", dish.number, quantity]);
  }

  // A separate action, so the cart suggestions are measurable apart from
  // regular adds (#338).
  function trackUpsellAdd(dish: Pick<Dish, "number">, quantity: number) {
    push(["trackEvent", "Cart", "UpsellAdd", dish.number, quantity]);
  }

  // A shared product link: `Share` for the native share sheet, `CopyLink`
  // for the clipboard. The shared path carries the quick view configuration
  // (`ohne`, `extras`, #411) and becomes the event's page URL; router.replace
  // does not trigger a page view, so the last tracked URL would lack it.
  function trackShare(
    method: "share" | "copy",
    productNumber: string,
    path: string,
  ) {
    push(["setCustomUrl", trackingUrl(path)]);
    push([
      "trackEvent",
      "Product",
      method === "share" ? "Share" : "CopyLink",
      productNumber,
    ]);
  }

  function trackSearch(term: string, productNumbers: string[]) {
    push(["trackSiteSearch", term, false, productNumbers.length]);
  }

  return {
    trackPageView,
    trackProductView,
    trackOrder,
    trackAddToWishlist,
    trackAddToCart,
    trackUpsellAdd,
    trackShare,
    trackSearch,
  };
}
