import { describe, it, expect, beforeEach } from "vitest";
import { useValidCitiesForDelivery } from "../../app/composables/useValidCitiesForDelivery";

// Setting the real runtime config instead of mocking useRuntimeConfig, see
// FooterContact.test.ts.
function setDelivery(cities: string, boundingBox: string) {
  Object.assign(useRuntimeConfig().public.shopBite.delivery, {
    cities,
    boundingBox,
  });
}

describe("useValidCitiesForDelivery", () => {
  beforeEach(() => {
    setDelivery("", "");
  });

  it("accepts every city and skips the bounding box without configuration", () => {
    const { validCities, boundingBoxCoordinates } = useValidCitiesForDelivery();

    expect(validCities.value).toEqual([]);
    expect(boundingBoxCoordinates.value).toBe("");
  });

  it("parses the comma-separated cities and the bounding box", () => {
    setDelivery(
      " Obertshausen, Lämmerspiel ,Hausen,, ",
      "8.822251,50.055026,8.899077,50.104327",
    );

    const { validCities, boundingBoxCoordinates } = useValidCitiesForDelivery();

    expect(validCities.value).toEqual([
      "Obertshausen",
      "Lämmerspiel",
      "Hausen",
    ]);
    expect(boundingBoxCoordinates.value).toBe(
      "8.822251,50.055026,8.899077,50.104327",
    );
  });
});
