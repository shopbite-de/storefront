import { describe, it, expect, beforeEach } from "vitest";
import { useAddressSuggestionArea } from "../../app/composables/useAddressSuggestionArea";

// Setting the real runtime config instead of mocking useRuntimeConfig, see
// FooterContact.test.ts.
function setBoundingBox(boundingBox: string) {
  useRuntimeConfig().public.shopBite.addressAutocomplete.boundingBox =
    boundingBox;
}

describe("useAddressSuggestionArea", () => {
  beforeEach(() => {
    setBoundingBox("");
  });

  it("has no bounding box without configuration", () => {
    expect(useAddressSuggestionArea().boundingBoxCoordinates.value).toBe("");
  });

  it("returns the trimmed bounding box", () => {
    setBoundingBox(" 8.822251,50.055026,8.899077,50.104327 ");

    expect(useAddressSuggestionArea().boundingBoxCoordinates.value).toBe(
      "8.822251,50.055026,8.899077,50.104327",
    );
  });
});
