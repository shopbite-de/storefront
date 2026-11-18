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
  async function getSuggestions(text: string): Promise<AddressSuggestion[]> {
    if (!text || text.length < 3) {
      return [];
    }

    try {
      // The server route applies the configured area
      // (`addressAutocomplete.boundingBox`) itself.
      const query = { text, lang: "de", limit: 5 };

      const { data } = await useFetch<GeoapifyResponse>(
        "/api/address/autocomplete",
        {
          query,
        },
      );

      if (!data.value?.features) {
        return [];
      }

      return data.value.features.map((feature: GeoapifyFeature) => {
        const props = feature.properties;
        return {
          street: props.street
            ? `${props.street}${props.housenumber ? " " + props.housenumber : ""}`
            : props.name || "",
          city: props.city || "",
          zipcode: props.postcode || "",
          label: props.formatted || "",
        };
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
