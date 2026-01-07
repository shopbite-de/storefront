export function useValidCitiesForDelivery() {
  const validCities = computed(() => ["Obertshausen", "Lämmerspiel", "Hausen"]);

  const boundingBoxCoordinates = computed(
    () => "8.822251,50.055026,8.899077,50.104327",
  );

  return {
    validCities,
    boundingBoxCoordinates,
  };
}
