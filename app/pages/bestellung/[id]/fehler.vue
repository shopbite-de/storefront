<script setup lang="ts">
useSeoMeta({
  title: "Zahlung fehlgeschlagen",
  robots: "noindex, nofollow",
});

const route = useRoute();
const orderId = route.params.id as string;

// The order and its payment through the BFF (ADR 0001, step 5).
const { order, load, retryPayment: startPayment } = useOrder(orderId);
const { paymentMethods, loadPaymentMethods } = useCheckoutMethods();

onMounted(async () => {
  await Promise.all([load(), loadPaymentMethods()]).catch((error) => {
    console.error("[order][load]", error);
  });
});

const currentPaymentMethodId = computed(
  () => order.value?.paymentMethod.id ?? "",
);
const selectedPaymentMethodId = ref("");

watch(
  currentPaymentMethodId,
  (id) => {
    if (id && !selectedPaymentMethodId.value) {
      selectedPaymentMethodId.value = id;
    }
  },
  { immediate: true },
);

const selectablePaymentMethods = computed(() =>
  paymentMethods.value.map((method) => ({
    label: method.name,
    value: method.id,
  })),
);

const isRetrying = ref(false);

const retryError = ref(false);

async function retryPayment() {
  isRetrying.value = true;
  retryError.value = false;
  try {
    const redirectUrl = await startPayment(
      selectedPaymentMethodId.value !== currentPaymentMethodId.value
        ? selectedPaymentMethodId.value
        : null,
    );

    if (redirectUrl) {
      await navigateTo(redirectUrl, { external: true });
    } else {
      await navigateTo(`/bestellung/${orderId}/erfolg`);
    }
  } catch (error) {
    console.error("[order][retryPayment]", error);
    retryError.value = true;
  } finally {
    isRetrying.value = false;
  }
}
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-2xl flex-col gap-6 font-body text-sb-ink"
  >
    <header class="flex flex-col gap-3">
      <h1 class="font-display text-4xl leading-tight sm:text-5xl">
        Zahlung fehlgeschlagen
      </h1>
      <p class="text-lg">
        Ihre Bestellung ist gespeichert, aber die Zahlung hat nicht geklappt.
        Wählen Sie eine Zahlungsart und versuchen Sie es noch einmal.
      </p>
    </header>
    <p v-if="!order" role="status" class="text-sb-ink-muted">
      Bestellung wird geladen …
    </p>
    <template v-else>
      <section
        aria-labelledby="zahlung-wiederholen"
        class="flex flex-col gap-4 rounded-sb-card border border-sb-line bg-sb-surface p-6"
      >
        <h2 id="zahlung-wiederholen" class="font-display text-2xl">
          Zahlungsart
        </h2>
        <SbChoiceGroup
          v-model="selectedPaymentMethodId"
          legend="Zahlungsart"
          hide-legend
          variant="cards"
          :options="selectablePaymentMethods ?? []"
        />
        <p
          v-if="retryError"
          role="alert"
          class="rounded-sb-control border-[1.5px] border-sb-danger p-4 text-sm"
        >
          Die Zahlung konnte nicht gestartet werden. Bitte versuchen Sie es noch
          einmal oder rufen Sie uns an.
        </p>
        <SbButton
          block
          size="lg"
          :loading="isRetrying"
          :disabled="!selectedPaymentMethodId || isRetrying"
          @click="retryPayment"
          >Jetzt bezahlen</SbButton
        >
      </section>
      <section
        aria-labelledby="bestellung-details"
        class="rounded-sb-card border border-sb-line bg-sb-surface p-6"
      >
        <h2 id="bestellung-details" class="mb-4 font-display text-2xl">
          Bestellung <span class="tabular-nums">{{ order.number }}</span>
        </h2>
        <OrderDetail :order="order" />
      </section>
    </template>
  </div>
</template>
