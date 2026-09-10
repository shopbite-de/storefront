/**
 * Delivery area for the address validation and the address autocomplete,
 * from `runtimeConfig.public.shopBite.delivery` (#251):
 *
 * - `cities`: comma-separated city names an address must match; empty means
 *   every city is accepted.
 * - `boundingBox`: `lon1,lat1,lon2,lat2` that narrows the Geoapify
 *   autocomplete (`filter=rect:`); empty means no filter.
 */
export function useValidCitiesForDelivery() {
  const { delivery } = useRuntimeConfig().public.shopBite;

  const validCities = computed(() =>
    delivery.cities
      .split(",")
      .map((city) => city.trim())
      .filter(Boolean),
  );

  const boundingBoxCoordinates = computed(() => delivery.boundingBox.trim());

  return {
    validCities,
    boundingBoxCoordinates,
  };
}
