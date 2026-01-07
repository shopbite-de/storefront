export interface AddressSuggestion {
  street: string;
  city: string;
  zipcode: string;
  label: string;
}

interface GeoapifyAddressProperties {
  street?: string;
  housenumber?: string;
  name?: string;
  city?: string;
  town?: string;
  village?: string;
  postcode?: string;
  formatted?: string;
}

interface GeoapifyFeature {
  properties: GeoapifyAddressProperties;
}

interface GeoapifyResponse {
  features: GeoapifyFeature[];
}

export function useAddressAutocomplete() {
  const { boundingBoxCoordinates, validCities } = useValidCitiesForDelivery();

  async function getSuggestions(text: string): Promise<AddressSuggestion[]> {
    if (!text || text.length < 3) {
      return [];
    }

    try {
      const query: Record<string, string | number> = {
        text,
        lang: "de",
        limit: 5,
      };

      if (boundingBoxCoordinates.value) {
        query.filter = `rect:${boundingBoxCoordinates.value}`;
      }

      const { data } = await useFetch<GeoapifyResponse>(
        "/api/address/autocomplete",
        {
          query,
        },
      );

      if (!data.value?.features) {
        return [];
      }

      return data.value.features
        .map((feature: GeoapifyFeature) => {
          const props = feature.properties;
          return {
            street: props.street
              ? `${props.street}${props.housenumber ? " " + props.housenumber : ""}`
              : props.name || "",
            city: props.city || "",
            zipcode: props.postcode || "",
            label: props.formatted || "",
          };
        })
        .filter((suggestion: AddressSuggestion) => {
          if (validCities.value.length === 0) return true;
          return validCities.value.some(
            (city) => city.toLowerCase() === suggestion.city.toLowerCase(),
          );
        });
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      return [];
    }
  }

  return {
    getSuggestions,
  };
}
