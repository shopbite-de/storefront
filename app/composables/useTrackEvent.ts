import type { Schemas } from "#shopware";

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
  // `page:finish`), not by the registry's page watcher.
  function trackPageView(path: string) {
    push(["setCustomUrl", path]);
    push(["setDocumentTitle", document.title]);
    push(["trackPageView"]);
  }

  function trackProductView(product: Schemas["Product"]) {
    push([
      "setEcommerceView",
      product.productNumber,
      product.translated.name ?? product.name,
      product.seoCategory?.name ?? false,
      product.calculatedPrice.unitPrice,
    ]);
    push(["trackPageView", product.productNumber]);
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

  function trackAddToWishlist(product: Schemas["Product"]) {
    push(["trackEvent", "Product", "AddToWishlist", product.productNumber]);
  }

  function trackAddToCart(product: Schemas["Product"], quantity: number) {
    push(["trackEvent", "Cart", "AddToCart", product.productNumber, quantity]);
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
    trackSearch,
  };
}
