import type { Schemas } from "#shopware";

export function useTrackEvent() {
  const matomo = useMatomo();

  // Tracking is a no-op when Matomo is not configured (#294).
  function push(command: unknown[]) {
    matomo?.proxy._paq.push(command);
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
    trackProductView,
    trackOrder,
    trackAddToWishlist,
    trackAddToCart,
    trackSearch,
  };
}
