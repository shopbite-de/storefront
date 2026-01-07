import { ref, computed, watch, toValue, onUnmounted } from "vue";
import type { Ref, ComputedRef } from "vue";
import type { AddressSchema } from "~/validation/registrationSchema";
import type { AddressSuggestion } from "~/composables/useAddressAutocomplete";

export function useAddressValidation(
  model: Ref<AddressSchema>,
  options: {
    isShipping?: Ref<boolean> | ComputedRef<boolean> | boolean;
    getSuggestions: (query: string) => Promise<AddressSuggestion[] | undefined>;
    validCities: Ref<string[]>;
  },
) {
  const { isShipping = ref(true), getSuggestions, validCities } = options;

  const showCorrection = ref(false);
  const correction = ref<AddressSuggestion | null>(null);

  async function checkAddress() {
    const m = toValue(model);
    if (m.street) {
      const searchText = `${m.street}, ${m.zipcode} ${m.city}`;
      const results = await getSuggestions(searchText);
      if (results && results.length > 0) {
        const bestMatch = results[0];
        // Check if it's different enough to suggest correction
        if (
          bestMatch &&
          (bestMatch.street.toLowerCase() !== m.street.toLowerCase() ||
            bestMatch.city.toLowerCase() !== m.city.toLowerCase() ||
            bestMatch.zipcode !== m.zipcode)
        ) {
          correction.value = bestMatch;
          showCorrection.value = true;
          return true;
        }
      }
    }
    showCorrection.value = false;
    correction.value = null;
    return false;
  }

  const isInvalidCity = computed(() => {
    if (!toValue(isShipping)) {
      return false;
    }
    const m = toValue(model);
    if (!m.city || validCities.value.length === 0) {
      return false;
    }
    return !validCities.value.some(
      (city) => city.toLowerCase() === m.city.toLowerCase(),
    );
  });

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  watch(
    () => ({ ...model.value }),
    () => {
      showCorrection.value = false;
      correction.value = null;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (model.value.street) {
          checkAddress();
        }
      }, 500);
    },
    { deep: true },
  );

  onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  function applyCorrection() {
    if (correction.value) {
      model.value.street = correction.value.street;
      model.value.city = correction.value.city;
      model.value.zipcode = correction.value.zipcode;
      showCorrection.value = false;
    }
  }

  return {
    showCorrection,
    correction,
    isInvalidCity,
    checkAddress,
    applyCorrection,
  };
}
