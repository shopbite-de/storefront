import { ref } from "vue";

interface NominatimAddress {
  road?: string;
  house_number?: string;
  postcode?: string;
  city?: string;
  town?: string;
  suburb?: string;
  neighbourhood?: string;
  village?: string;
}

interface NominatimResult {
  display_name: string;
  address: NominatimAddress;
  lat: string;
  lon: string;
}

interface AddressSuggestion {
  label: string;
  street: string;
  zipcode: string;
  city: string;
}

const ALLOWED_CITIES = {
  obertshausen: {
    name: "Obertshausen",
    zipcode: "63179",
  },
  laemmerspiel: {
    name: "Lämmerspiel",
    zipcode: "63165",
   
    parentCity: "Mühlheim am Main",
    // Tighter boundaries for Lämmerspiel district based on OSM relation 3749769 outline
    // Centroid: 50.0977026, 8.8552101
    
    bounds: {
      minLat: 50.088, // S
      maxLat: 50.107, // N
      minLon: 8.84, // W
      maxLon: 8.87, // E(including the eastern protrusion)
    },
  },
};

export const useAddressAutocomplete = () => {
  const suggestions = ref<AddressSuggestion[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);


  const isValidCity = (city: string): boolean => {
    const normalizedCity = city.toLowerCase().trim();
    return (
      normalizedCity === ALLOWED_CITIES.obertshausen.name.toLowerCase() ||
      normalizedCity === ALLOWED_CITIES.laemmerspiel.name.toLowerCase()
    );
  };

  /**
   * zipcode for a given city
   */
  const getZipcodeForCity = (city: string): string => {
    const normalizedCity = city.toLowerCase().trim();
    if (normalizedCity === ALLOWED_CITIES.obertshausen.name.toLowerCase()) {
      return ALLOWED_CITIES.obertshausen.zipcode;
    }
    if (normalizedCity === ALLOWED_CITIES.laemmerspiel.name.toLowerCase()) {
      return ALLOWED_CITIES.laemmerspiel.zipcode;
    }
    return "";
  };

  /**
   * api call to get addresses
   */
  const searchAddress = async (
    street: string,
    selectedCity: string,
  ): Promise<void> => {
    if (!street || street.length < 3) {
      suggestions.value = [];
      return;
    }

    if (!isValidCity(selectedCity)) {
      error.value = "Bitte wählen Sie zuerst eine gültige Stadt aus.";
      suggestions.value = [];
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const normalizedCity = selectedCity.toLowerCase().trim();
      let searchCity = selectedCity;
      let searchPostcode = getZipcodeForCity(selectedCity);

      // district search
      if (normalizedCity === ALLOWED_CITIES.laemmerspiel.name.toLowerCase()) {
        searchCity = ALLOWED_CITIES.laemmerspiel.parentCity!;
      }

      const streetRef = ref(street);
      const cityRef = ref(searchCity);
      const postcodeRef = ref(searchPostcode);

      const key = computed(() => streetRef.value + cityRef.value + postcodeRef.value);
      const searchText = computed(() => streetRef.value + ', ' + cityRef.value + ', ' + postcodeRef.value);

      const { data: result } = await useAsyncData<NominatimResult>(
        searchText,
        () => $fetch('https://api.geoapify.com/v1/geocode/autocomplete', {
          query: {
            type: 'street',
            filter: {
              countrycode:de,
              city: cityRef.value,
            },
            text: streetRef.value,
            apiKey: '6cf5d4475e4a468883d605d93e843c1f'
          },
        }),
      )

      console.log(result.value)

      // filter
      suggestions.value = results
        .filter((result) => {
          const addr = result.address;
          const resultPostcode = addr.postcode;
          const lat = parseFloat(result.lat);
          const lon = parseFloat(result.lon);

          // obertshausen
          if (
            normalizedCity === ALLOWED_CITIES.obertshausen.name.toLowerCase()
          ) {
            return resultPostcode === ALLOWED_CITIES.obertshausen.zipcode;
          }

          // laemmerspiel boundary check
          if (
            normalizedCity === ALLOWED_CITIES.laemmerspiel.name.toLowerCase()
          ) {
            const hasCorrectZipcode =
              resultPostcode === ALLOWED_CITIES.laemmerspiel.zipcode;

            // boundary check
            const bounds = ALLOWED_CITIES.laemmerspiel.bounds;
            const isWithinBounds =
              lat >= bounds.minLat &&
              lat <= bounds.maxLat &&
              lon >= bounds.minLon &&
              lon <= bounds.maxLon;

            return hasCorrectZipcode && isWithinBounds;
          }

          return false;
        })
        .map((result) => {
          const addr = result.address;
          const street = addr.road
            ? `${addr.road}${addr.house_number ? " " + addr.house_number : ""}`
            : "";
          const zipcode = addr.postcode || getZipcodeForCity(selectedCity);

          return {
            label: result.display_name,
            street,
            zipcode,
            city: selectedCity, 
            originalPostcode: addr.postcode, // original postcode for validation
          };
        })
        .filter((s) => s.street); // results with street names

      if (suggestions.value.length === 0) {
        error.value =
          "Keine gültige Adresse gefunden. Bitte überprüfen Sie Ihre Eingabe.";
      }
    } catch (err) {
      console.error("Address search error:", err);
      error.value =
        "Fehler bei der Adresssuche. Bitte versuchen Sie es erneut.";
      suggestions.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * validate address
   */
  const validateAddress = async (
    street: string,
    city: string,
  ): Promise<boolean> => {
    if (!isValidCity(city)) {
      return false;
    }

    try {
      await searchAddress(street, city);
      return suggestions.value.length > 0;
    } catch {
      return false;
    }
  };

  return {
    suggestions,
    isLoading,
    error,
    searchAddress,
    validateAddress,
    isValidCity,
    getZipcodeForCity,
    allowedCities: [
      ALLOWED_CITIES.obertshausen.name,
      ALLOWED_CITIES.laemmerspiel.name,
    ],
  };
};
