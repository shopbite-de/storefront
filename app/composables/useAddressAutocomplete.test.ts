import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAddressAutocomplete } from "./useAddressAutocomplete";

// Mock fetch globally
global.fetch = vi.fn();

describe("useAddressAutocomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isValidCity", () => {
    it("should return true for Obertshausen", () => {
      const { isValidCity } = useAddressAutocomplete();
      expect(isValidCity("Obertshausen")).toBe(true);
      expect(isValidCity("obertshausen")).toBe(true);
      expect(isValidCity("OBERTSHAUSEN")).toBe(true);
    });

    it("should return true for Lämmerspiel", () => {
      const { isValidCity } = useAddressAutocomplete();
      expect(isValidCity("Lämmerspiel")).toBe(true);
      expect(isValidCity("lämmerspiel")).toBe(true);
      expect(isValidCity("LÄMMERSPIEL")).toBe(true);
    });

    it("should return false for invalid cities", () => {
      const { isValidCity } = useAddressAutocomplete();
      expect(isValidCity("Frankfurt")).toBe(false);
      expect(isValidCity("Mühlheim am Main")).toBe(false);
      expect(isValidCity("")).toBe(false);
    });
  });

  describe("getZipcodeForCity", () => {
    it("should return correct zipcode for Obertshausen", () => {
      const { getZipcodeForCity } = useAddressAutocomplete();
      expect(getZipcodeForCity("Obertshausen")).toBe("63179");
      expect(getZipcodeForCity("obertshausen")).toBe("63179");
    });

    it("should return correct zipcode for Lämmerspiel", () => {
      const { getZipcodeForCity } = useAddressAutocomplete();
      expect(getZipcodeForCity("Lämmerspiel")).toBe("63165");
      expect(getZipcodeForCity("lämmerspiel")).toBe("63165");
    });

    it("should return empty string for invalid city", () => {
      const { getZipcodeForCity } = useAddressAutocomplete();
      expect(getZipcodeForCity("Frankfurt")).toBe("");
    });
  });

  describe("allowedCities", () => {
    it("should return array with both allowed cities", () => {
      const { allowedCities } = useAddressAutocomplete();
      expect(allowedCities).toEqual(["Obertshausen", "Lämmerspiel"]);
    });
  });

  describe("searchAddress", () => {
    it("should not search if street is too short", async () => {
      const { searchAddress, suggestions } = useAddressAutocomplete();
      await searchAddress("ab", "Obertshausen");

      expect(fetch).not.toHaveBeenCalled();
      expect(suggestions.value).toEqual([]);
    });

    it("should show error if city is invalid", async () => {
      const { searchAddress, error, suggestions } = useAddressAutocomplete();
      await searchAddress("Hauptstraße", "Frankfurt");

      expect(fetch).not.toHaveBeenCalled();
      expect(error.value).toBe(
        "Bitte wählen Sie zuerst eine gültige Stadt aus.",
      );
      expect(suggestions.value).toEqual([]);
    });

    it("should search for addresses in Obertshausen with correct zipcode", async () => {
      const mockResponse = [
        {
          display_name: "Hauptstraße 1, 63179 Obertshausen, Germany",
          address: {
            road: "Hauptstraße",
            house_number: "1",
            postcode: "63179",
            city: "Obertshausen",
          },
          lat: "50.0850",
          lon: "8.8450",
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { searchAddress, suggestions, isLoading } =
        useAddressAutocomplete();

      await searchAddress("Hauptstraße", "Obertshausen");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("nominatim.openstreetmap.org/search"),
        expect.objectContaining({
          headers: {
            "User-Agent": "PizzeriaLaFattoria/1.0",
          },
        }),
      );

      expect(suggestions.value).toHaveLength(1);
      expect(suggestions.value[0]).toEqual({
        label: "Hauptstraße 1, 63179 Obertshausen, Germany",
        street: "Hauptstraße 1",
        zipcode: "63179",
        city: "Obertshausen",
        originalPostcode: "63179",
      });
      expect(isLoading.value).toBe(false);
    });

    it("should filter out addresses with wrong zipcode for Obertshausen", async () => {
      const mockResponse = [
        {
          display_name: "Hauptstraße 1, 63165 Mühlheim, Germany",
          address: {
            road: "Hauptstraße",
            house_number: "1",
            postcode: "63165", // Wrong zipcode
            city: "Mühlheim am Main",
          },
          lat: "50.0850",
          lon: "8.8450",
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { searchAddress, suggestions } = useAddressAutocomplete();

      await searchAddress("Hauptstraße", "Obertshausen");

      expect(suggestions.value).toHaveLength(0);
    });

    it("should filter addresses in Lämmerspiel by coordinates", async () => {
      const mockResponse = [
        {
          display_name: "Steinheimer Straße 1, 63165 Mühlheim, Germany",
          address: {
            road: "Steinheimer Straße",
            house_number: "1",
            postcode: "63165",
            suburb: "Lämmerspiel",
          },
          lat: "50.095", // Within bounds
          lon: "8.850", // Within bounds
        },
        {
          display_name: "Erlenweg 23, 63165 Mühlheim, Germany",
          address: {
            road: "Erlenweg",
            house_number: "23",
            postcode: "63165",
          },
          lat: "50.107844", // Outside bounds (too far north)
          lon: "8.8378571", // Outside bounds (too far west)
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { searchAddress, suggestions } = useAddressAutocomplete();

      await searchAddress("Straße", "Lämmerspiel");

      // Should only include Steinheimer Straße (within bounds)
      expect(suggestions.value).toHaveLength(1);
      expect(suggestions.value[0].street).toBe("Steinheimer Straße 1");
    });

    it("should handle fetch errors gracefully", async () => {
      (fetch as any).mockRejectedValueOnce(new Error("Network error"));

      const { searchAddress, error, suggestions } = useAddressAutocomplete();

      await searchAddress("Hauptstraße", "Obertshausen");

      expect(error.value).toBe(
        "Fehler bei der Adresssuche. Bitte versuchen Sie es erneut.",
      );
      expect(suggestions.value).toEqual([]);
    });

    it("should show error when no valid addresses found", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { searchAddress, error } = useAddressAutocomplete();

      await searchAddress("NonexistentStreet", "Obertshausen");

      expect(error.value).toBe(
        "Keine gültige Adresse gefunden. Bitte überprüfen Sie Ihre Eingabe.",
      );
    });

    it("should filter out results without street names", async () => {
      const mockResponse = [
        {
          display_name: "63179 Obertshausen, Germany",
          address: {
            postcode: "63179",
            city: "Obertshausen",
          },
          lat: "50.0850",
          lon: "8.8450",
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { searchAddress, suggestions } = useAddressAutocomplete();

      await searchAddress("Obertshausen", "Obertshausen");

      expect(suggestions.value).toHaveLength(0);
    });
  });

  describe("validateAddress", () => {
    it("should return false for invalid city", async () => {
      const { validateAddress } = useAddressAutocomplete();
      const result = await validateAddress("Hauptstraße 1", "Frankfurt");

      expect(result).toBe(false);
    });

    it("should return true when valid addresses are found", async () => {
      const mockResponse = [
        {
          display_name: "Hauptstraße 1, 63179 Obertshausen, Germany",
          address: {
            road: "Hauptstraße",
            house_number: "1",
            postcode: "63179",
            city: "Obertshausen",
          },
          lat: "50.0850",
          lon: "8.8450",
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { validateAddress } = useAddressAutocomplete();
      const result = await validateAddress("Hauptstraße 1", "Obertshausen");

      expect(result).toBe(true);
    });

    it("should return false when no valid addresses are found", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { validateAddress } = useAddressAutocomplete();
      const result = await validateAddress("InvalidStreet", "Obertshausen");

      expect(result).toBe(false);
    });
  });

  describe("Lämmerspiel boundary validation", () => {
    it("should accept addresses within Lämmerspiel bounds", async () => {
      const mockResponse = [
        {
          display_name: "Test Street, 63165 Mühlheim, Germany",
          address: {
            road: "Test Street",
            postcode: "63165",
          },
          lat: "50.095", // Within: 50.088 - 50.107
          lon: "8.855", // Within: 8.840 - 8.870
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { searchAddress, suggestions } = useAddressAutocomplete();
      await searchAddress("Test", "Lämmerspiel");

      expect(suggestions.value).toHaveLength(1);
    });

    it("should reject addresses outside Lämmerspiel bounds - too far north", async () => {
      const mockResponse = [
        {
          display_name: "North Street, 63165 Mühlheim, Germany",
          address: {
            road: "North Street",
            postcode: "63165",
          },
          lat: "50.108", // Outside: > 50.107
          lon: "8.855",
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { searchAddress, suggestions } = useAddressAutocomplete();
      await searchAddress("North", "Lämmerspiel");

      expect(suggestions.value).toHaveLength(0);
    });

    it("should reject addresses outside Lämmerspiel bounds - too far west", async () => {
      const mockResponse = [
        {
          display_name: "West Street, 63165 Mühlheim, Germany",
          address: {
            road: "West Street",
            postcode: "63165",
          },
          lat: "50.095",
          lon: "8.835", // Outside: < 8.840
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { searchAddress, suggestions } = useAddressAutocomplete();
      await searchAddress("West", "Lämmerspiel");

      expect(suggestions.value).toHaveLength(0);
    });
  });
});
