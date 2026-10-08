<script setup lang="ts">
import { useOrderPayment, useOrderDetails } from "@shopware/composables";
import type { Schemas } from "#shopware";

const {
  public: { storeUrl },
} = useRuntimeConfig();

useSeoMeta({
  title: "Zahlung fehlgeschlagen",
  robots: "noindex, nofollow",
});

const route = useRoute();
const orderId = route.params.id as string;

const { order, loadOrderDetails, status } = useOrderDetails(orderId);
const { paymentMethods, getPaymentMethods } = useCheckout();

onMounted(async () => {
  await Promise.all([loadOrderDetails(), getPaymentMethods()]);
});

const orderRef = computed(() => order.value);
const { handlePayment, paymentUrl, changePaymentMethod } =
  useOrderPayment(orderRef);

const currentPaymentMethodId = computed(
  () => order.value?.transactions?.at(-1)?.paymentMethodId ?? "",
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
  paymentMethods.value?.map((m: Schemas["PaymentMethod"]) => ({
    label: m.distinguishableName ?? m.name,
    value: m.id,
  })),
);

const isRetrying = ref(false);
const { hasPreset } = useThemePreset();

const retryError = ref(false);

async function retryPayment() {
  isRetrying.value = true;
  retryError.value = false;
  try {
    if (selectedPaymentMethodId.value !== currentPaymentMethodId.value) {
      await changePaymentMethod(selectedPaymentMethodId.value);
    }

    await handlePayment(
      `${storeUrl}/bestellung/${orderId}/erfolg`,
      `${storeUrl}/bestellung/${orderId}/fehler`,
    );

    if (paymentUrl.value) {
      await navigateTo(paymentUrl.value, { external: true });
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
    v-if="hasPreset"
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
          Bestellung <span class="tabular-nums">{{ order.orderNumber }}</span>
        </h2>
        <OrderDetailPreset :order="order" :status="status ?? undefined" />
      </section>
    </template>
  </div>
  <UPageSection v-else>
    <div class="flex flex-col gap-8">
      <UPageHero
        icon="i-lucide-circle-x"
        title="Zahlung fehlgeschlagen"
        description="Bei der Verarbeitung deiner Zahlung ist ein Fehler aufgetreten. Wähle eine Zahlungsmethode und versuche es erneut."
      />

      <USeparator />

      <div v-if="order" class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="flex flex-col gap-4">
          <p class="text-sm font-semibold text-muted uppercase tracking-wide">
            Bestellung {{ order.orderNumber }}
          </p>
          <UCard>
            <OrderDetail :order="order" :status="status ?? ''" />
          </UCard>
        </div>

        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-3">
            <p class="text-sm font-semibold text-muted uppercase tracking-wide">
              Zahlungsmethode
            </p>
            <URadioGroup
              v-model="selectedPaymentMethodId"
              :items="selectablePaymentMethods"
              variant="card"
            />
          </div>

          <UButton
            label="Jetzt bezahlen"
            icon="i-lucide-refresh-cw"
            size="xl"
            block
            :loading="isRetrying"
            :disabled="!selectedPaymentMethodId"
            @click="retryPayment"
          />
        </div>
      </div>

      <div v-else class="flex justify-center py-16">
        <UIcon
          name="i-lucide-loader-circle"
          class="size-10 animate-spin text-primary"
        />
      </div>
    </div>
  </UPageSection>
</template>
