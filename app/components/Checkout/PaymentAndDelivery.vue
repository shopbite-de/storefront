<script setup lang="ts">
import { shopLocale } from "#shopbite-locale";
// The one-page checkout of the presets shows shipping and payment as
// separate numbered sections (#443).
const props = withDefaults(
  defineProps<{ part?: "both" | "shipping" | "payment" }>(),
  { part: "both" },
);

const {
  selection,
  paymentMethods,
  loadPaymentMethods,
  refreshSelection,
  selectPaymentMethod,
  selectShippingMethod,
} = useCheckoutMethods();

const { methods: shippingMethods, load: loadShippingMethods } =
  useShippingMethodChoice();
const { refresh: refreshCart } = useCartData();
const { ensureAvailableCheckoutMethods } = useCheckoutMethodGuard();

// Presets: shipping first (payment rules can depend on it), as cards (#443).
const shippingOptions = computed(() =>
  shippingMethods.value.map((method) => ({
    value: method.id,
    label: method.name,
    description: method.description ?? undefined,
  })),
);
const paymentOptions = computed(() =>
  paymentMethods.value.map((method) => ({
    value: method.id,
    label: method.name,
    description: method.description ?? undefined,
  })),
);
const shippingModel = computed({
  get: () => selectedShippingMethodId.value ?? undefined,
  set: (value: string | undefined) => {
    selectedShippingMethodId.value = value;
  },
});
const paymentModel = computed({
  get: () => selectedPaymentMethodId.value ?? undefined,
  set: (value: string | undefined) => {
    selectedPaymentMethodId.value = value;
  },
});

onMounted(async () => {
  try {
    await Promise.all([
      loadPaymentMethods(),
      loadShippingMethods(),
      selection.value ? undefined : refreshSelection(),
    ]);
    await ensureAvailableCheckoutMethods();
  } catch (error) {
    console.error("[checkout][PaymentAndDelivery][onMounted]", error);
  }
});

const selectedPaymentMethodId = ref<string | undefined>(
  selection.value?.paymentMethodId ?? undefined,
);
const selectedShippingMethodId = ref<string | undefined>(
  selection.value?.shippingMethodId ?? undefined,
);

// Keep the radios in sync when the session's methods change elsewhere
// (e.g. the guard switched away from a blocked method).
watch(
  () => selection.value?.paymentMethodId,
  (id) => {
    selectedPaymentMethodId.value = id ?? undefined;
  },
);
watch(
  () => selection.value?.shippingMethodId,
  (id) => {
    selectedShippingMethodId.value = id ?? undefined;
  },
);

watch(selectedPaymentMethodId, async (newValue: string | undefined) => {
  if (newValue === undefined) return;
  if (!selection.value) return;
  if (newValue === selection.value.paymentMethodId) return;
  await selectPaymentMethod(newValue);
});

watch(selectedShippingMethodId, async (newValue: string | undefined) => {
  if (newValue === undefined) return;
  if (!selection.value) return;
  if (newValue === selection.value.shippingMethodId) return;
  await selectShippingMethod(newValue);
  await refreshCart();
});
</script>

<template>
  <div
    v-if="props.part !== 'both'"
    class="flex flex-col gap-3 font-body text-sb-ink"
  >
    <SbChoiceGroup
      v-if="props.part === 'shipping'"
      v-model="shippingModel"
      legend="Versandarten"
      hide-legend
      variant="cards"
      :options="shippingOptions"
    />
    <SbChoiceGroup
      v-else
      v-model="paymentModel"
      legend="Zahlungsarten"
      hide-legend
      variant="cards"
      :options="paymentOptions"
    />
    <NuxtLink
      :to="shopLocale.contentPaths.shipping"
      class="inline-flex min-h-11 items-center self-start text-sm font-semibold text-sb-primary-ink underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-sb-focus"
    >
      {{
        props.part === "shipping"
          ? "Liefergebiet und Versandkosten"
          : "Mehr zu den Zahlungsarten"
      }}
    </NuxtLink>
  </div>
  <div v-else class="flex flex-col gap-8 font-body text-sb-ink">
    <section class="flex flex-col gap-3" aria-labelledby="checkout-shipping">
      <div class="flex items-center justify-between gap-3">
        <h2 id="checkout-shipping" class="font-display text-[28px]">
          Lieferung oder Abholung
        </h2>
        <SbButton variant="ghost" :to="shopLocale.contentPaths.shipping">
          Versandarten erklärt
        </SbButton>
      </div>
      <SbChoiceGroup
        v-model="shippingModel"
        legend="Versandarten"
        hide-legend
        variant="cards"
        :options="shippingOptions"
      />
    </section>
    <section class="flex flex-col gap-3" aria-labelledby="checkout-payment">
      <div class="flex items-center justify-between gap-3">
        <h2 id="checkout-payment" class="font-display text-[28px]">
          Bezahlung
        </h2>
        <SbButton variant="ghost" :to="shopLocale.contentPaths.shipping">
          Zahlungsarten erklärt
        </SbButton>
      </div>
      <SbChoiceGroup
        v-model="paymentModel"
        legend="Zahlungsarten"
        hide-legend
        variant="cards"
        :options="paymentOptions"
      />
    </section>
  </div>
</template>
