import type { CrossSellingElement, Product } from "~/types/commerce/product";
import type { AssociationItem } from "~/types/Association";

const DEFAULT_CURRENCY = "EUR";
const DEFAULT_LOCALE = "de-DE";
const DEFAULT_ICON = "i-lucide-plus";

function mapAssociationToItems(
  associations: CrossSellingElement[],
  getFormattedPrice: (price: number) => string,
): AssociationItem[] {
  return associations.map((crossSellingElement) => ({
    label: crossSellingElement.crossSelling.name,
    products: crossSellingElement.products.map((product: Product) => ({
      label: product.name ?? "",
      value: product.id,
      price: getFormattedPrice(product.calculatedPrice.unitPrice),
      icon: DEFAULT_ICON,
    })),
  }));
}

export function useProductCrossSelling(getProductId: () => string) {
  const { getFormattedPrice } = useCommercePrice({
    currencyCode: DEFAULT_CURRENCY,
    localeCode: DEFAULT_LOCALE,
  });

  const { data, pending: isAssociationsLoading } = useFetch<
    CrossSellingElement[]
  >(() => `/api/product/${getProductId()}/cross-selling`, {
    key: () => `cross-selling-${getProductId()}`,
  });

  const associationItems = computed(() =>
    mapAssociationToItems(data.value ?? [], getFormattedPrice),
  );

  return {
    associationItems,
    isAssociationsLoading,
  };
}
