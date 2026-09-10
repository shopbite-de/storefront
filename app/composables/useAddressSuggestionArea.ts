/**
 * Optional area that narrows the Geoapify address suggestions
 * (`filter=rect:lon1,lat1,lon2,lat2`), from
 * `runtimeConfig.public.shopBite.addressAutocomplete.boundingBox`. Empty means
 * no filter. Where the shop delivers is decided by the Shopware cart rules,
 * not here (#251).
 */
export function useAddressSuggestionArea() {
  const { addressAutocomplete } = useRuntimeConfig().public.shopBite;

  const boundingBoxCoordinates = computed(() =>
    addressAutocomplete.boundingBox.trim(),
  );

  return { boundingBoxCoordinates };
}
