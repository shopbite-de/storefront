<script setup lang="ts">
import type { PaymentMethod } from "~/types/commerce/checkout";

const {
  public: { site, storeUrl },
} = useRuntimeConfig();

useSeoMeta({
  title: `Zahlung fehlgeschlagen | ${site.name}`,
  robots: "noindex, nofollow",
});

const route = useRoute();
const orderId = route.params.id as string;

const { order, loadOrderDetails, status } = useCommerceOrderDetails(orderId);
const { paymentMethods, getPaymentMethods } = useCommerceCheckout();

onMounted(async () => {
  await Promise.all([loadOrderDetails(), getPaymentMethods()]);
});

const orderRef = computed(() => order.value);
const { handlePayment, paymentUrl, changePaymentMethod } =
  useCommerceOrderPayment(orderRef);

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
  paymentMethods.value?.map((m: PaymentMethod) => ({
    label: m.distinguishableName ?? m.name,
    value: m.id,
  })),
);

const isRetrying = ref(false);

async function retryPayment() {
  isRetrying.value = true;
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
  } finally {
    isRetrying.value = false;
  }
}
</script>

<template>
  <UPageSection>
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
