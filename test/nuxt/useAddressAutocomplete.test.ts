import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { useAddressAutocomplete } from "~/composables/useAddressAutocomplete";
import { ref } from "vue";

// Mock useFetch
const { mockUseFetch } = vi.hoisted(() => ({
  mockUseFetch: vi.fn(),
}));
mockNuxtImport("useFetch", () => mockUseFetch);

// Mock useRuntimeConfig
mockNuxtImport("useRuntimeConfig", () => () => ({
  geoapifyApiKey: "test-api-key",
}));

// Mock useValidCitiesForDelivery
const { mockBoundingBoxCoordinates } = vi.hoisted(() => ({
  mockBoundingBoxCoordinates: {
    value: "8.822251,50.055026,8.899077,50.104327",
  },
}));
mockNuxtImport("useValidCitiesForDelivery", () => () => ({
  validCities: ref(["Obertshausen", "Lämmerspiel", "Hausen"]),
  boundingBoxCoordinates: mockBoundingBoxCoordinates,
}));

describe("useAddressAutocomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty suggestions for short input", async () => {
    const { getSuggestions } = useAddressAutocomplete();
    const suggestions = await getSuggestions("ab");
    expect(suggestions).toEqual([]);
    expect(mockUseFetch).not.toHaveBeenCalled();
  });

  it("should fetch suggestions from Geoapify", async () => {
    const mockResponse = {
      features: [
        {
          properties: {
            street: "Main St",
            housenumber: "1",
            city: "Obertshausen",
            postcode: "63179",
            formatted: "Main St 1, 63179 Obertshausen, Germany",
          },
        },
      ],
    };

    mockUseFetch.mockResolvedValue({
      data: ref(mockResponse),
    });

    const { getSuggestions } = useAddressAutocomplete();
    const suggestions = await getSuggestions("Main St 1");

    expect(mockUseFetch).toHaveBeenCalledWith(
      "/api/address/autocomplete",
      expect.objectContaining({
        query: expect.objectContaining({
          text: "Main St 1",
          lang: "de",
          limit: 5,
          filter: "rect:8.822251,50.055026,8.899077,50.104327",
        }),
      }),
      expect.any(String),
    );
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toEqual({
      street: "Main St 1",
      city: "Obertshausen",
      zipcode: "63179",
      label: "Main St 1, 63179 Obertshausen, Germany",
    });
  });

  it("should handle missing features in API response", async () => {
    mockUseFetch.mockResolvedValue({
      data: ref({}),
    });

    const { getSuggestions } = useAddressAutocomplete();
    const suggestions = await getSuggestions("Some address");
    expect(suggestions).toEqual([]);
  });

  it("should handle fetch error", async () => {
    mockUseFetch.mockRejectedValue(new Error("Network error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getSuggestions } = useAddressAutocomplete();
    const suggestions = await getSuggestions("Some address");

    expect(suggestions).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
  it("should filter suggestions based on valid cities", async () => {
    const mockResponse = {
      features: [
        {
          properties: {
            street: "Main St",
            housenumber: "1",
            city: "Obertshausen",
            postcode: "63179",
            formatted: "Main St 1, 63179 Obertshausen, Germany",
          },
        },
        {
          properties: {
            street: "Other St",
            housenumber: "2",
            city: "Berlin",
            postcode: "10115",
            formatted: "Other St 2, 10115 Berlin, Germany",
          },
        },
      ],
    };

    mockUseFetch.mockResolvedValue({
      data: ref(mockResponse),
    });

    const { getSuggestions } = useAddressAutocomplete();
    const suggestions = await getSuggestions("Main St 1");

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.city).toBe("Obertshausen");
  });

  it("should not include filter when boundingBoxCoordinates is empty", async () => {
    mockBoundingBoxCoordinates.value = "";
    mockUseFetch.mockResolvedValue({
      data: ref({ features: [] }),
    });

    const { getSuggestions } = useAddressAutocomplete();
    await getSuggestions("Main St 1");

    expect(mockUseFetch).toHaveBeenCalledWith(
      "/api/address/autocomplete",
      expect.objectContaining({
        query: expect.not.objectContaining({
          filter: expect.anything(),
        }),
      }),
      expect.any(String),
    );

    // Reset for other tests
    mockBoundingBoxCoordinates.value = "8.822251,50.055026,8.899077,50.104327";
  });
});
