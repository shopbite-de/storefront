import type { Schemas } from "#shopware";

export function useTrackEvent() {
  const { proxy } = useScriptMatomoAnalytics();

  function trackProductView(product: Schemas["Product"]) {
    proxy._paq.push([
      "setEcommerceView",
      product.productNumber,
      product.translated.name ?? product.name,
      product.seoCategory?.name ?? false,
      product.calculatedPrice.unitPrice,
    ]);
    proxy._paq.push(["trackPageView", product.productNumber]);
  }

  function trackOrder(order: Schemas["Order"]) {
    order.lineItems?.forEach((item) => {
      if (item.type === "container") return;
      proxy._paq.push([
        "addEcommerceItem",
        item.product?.productNumber ?? item.id,
        item.label,
        item.product?.seoCategory?.name ?? false,
        item.unitPrice,
        item.quantity,
      ]);
    });

    proxy._paq.push([
      "trackEcommerceOrder",
      order.orderNumber,
      order.price.totalPrice,
    ]);
  }

  function trackAddToWishlist(product: Schemas["Product"]) {
    proxy._paq.push([
      "trackEvent",
      "Product",
      "AddToWishlist",
      product.productNumber,
    ]);
  }

  function trackAddToCart(product: Schemas["Product"], quantity: number) {
    proxy._paq.push([
      "trackEvent",
      "Cart",
      "AddToCart",
      product.productNumber,
      quantity,
    ]);
  }

  function trackSearch(term: string, productNumbers: string[]) {
    proxy._paq.push(["trackSiteSearch", term, false, productNumbers.length]);
  }

  return {
    trackProductView,
    trackOrder,
    trackAddToWishlist,
    trackAddToCart,
    trackSearch,
  };
}
