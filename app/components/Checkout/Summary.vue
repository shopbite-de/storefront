<script setup lang="ts">
import QuickView from "~/components/Cart/QuickView.vue";
import { useIntervalFn } from "@vueuse/core";

const { createOrder, selectedPaymentMethod, selectedShippingMethod } =
  useCommerceCheckout();
const { refreshCart } = useCommerceCart();
const { isLoggedIn, isGuestSession, refreshUser } = useCommerceUser();
const { isCheckoutEnabled, refresh } = useShopBiteConfig();
const { trackOrder } = useTrackEvent();

const {
  public: { storeUrl },
} = useRuntimeConfig();

const toast = useToast();

onMounted(() => {
  refresh();
  refreshUser({
    associations: {
      defaultShippingAddress: {},
      defaultBillingAddress: {},
      activeShippingAddress: {},
      activeBillingAddress: {},
    },
  });
});

useIntervalFn(refresh, 10000);

const createdOrder = ref<Awaited<ReturnType<typeof createOrder>> | null>(null);
const { handlePayment, paymentUrl } = useCommerceOrderPayment(
  computed(() => createdOrder.value),
);

async function handleCreateOrder() {
  isPlacingOrder.value = true;
  try {
    const order = await createOrder({
      customerComment: "Wunschlieferzeit: " + selectedDeliveryTime.value,
    });

    trackOrder(order);
    createdOrder.value = order;

    await handlePayment(
      `${storeUrl}/bestellung/${order.id}/erfolg`,
      `${storeUrl}/bestellung/${order.id}/fehler`,
    );

    if (paymentUrl.value) {
      await navigateTo(paymentUrl.value, { external: true });
      return;
    }

    await refreshCart();
    toast.add({
      title: "Bestellung aufgegeben!",
      icon: "i-lucide-shopping-cart",
      color: "success",
      progress: false,
    });
    navigateTo(`/bestellung/${order.id}/erfolg`);
  } finally {
    isPlacingOrder.value = false;
  }
}

const customerDataAvailable = computed<boolean>(
  () => isLoggedIn.value || isGuestSession.value,
);

const shippingAndPaymentSet = computed(
  () => selectedPaymentMethod.value && selectedShippingMethod.value,
);

const isValidToProceed = computed(
  () =>
    customerDataAvailable.value &&
    isCheckoutEnabled.value &&
    isValidTime.value &&
    shippingAndPaymentSet.value,
);

const isPlacingOrder = ref(false);
const selectedDeliveryTime = ref("");
const isValidTime = ref(true);

const checkoutButtonLabel = computed<string>(() => {
  if (!customerDataAvailable.value) {
    return "Bitte einloggen oder Kundendaten erfassen";
  }

  if (!isValidTime.value) {
    return "Wir haben aktuell leider geschlossen";
  }

  if (!isCheckoutEnabled.value) {
    return "Es werden aktuell keine weiteren Bestellungen mehr aufgenommen";
  }

  return "Jetzt bestellen!";
});
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-4">
        <h3 class="text-lg font-semibold">Kundendaten</h3>
        <UserDetail v-if="customerDataAvailable" />
        <p v-else class="text-muted">
          Bitte vorher einloggen oder Kundendaten erfassen
        </p>
      </div>
      <div class="flex flex-col gap-4">
        <h3 class="text-lg font-semibold">Versand & Zahlung</h3>
        <CheckoutPaymentMethod :payment-method="selectedPaymentMethod" />
        <CheckoutShippingMethod :shipping-method="selectedShippingMethod" />
        <CheckoutDeliveryTimeSelect
          v-model:valid="isValidTime"
          v-model="selectedDeliveryTime"
        />
      </div>
    </div>
    <div class="flex flex-col gap-4">
      <h3 class="text-lg font-semibold">Warenkorb</h3>
      <UCard>
        <QuickView :with-quantity-input="false" :with-delete-button="false" />
      </UCard>
      <CheckoutVoucherInput />
      <UButton
        :icon="isValidToProceed ? 'i-lucide-shopping-cart' : 'i-lucide-lock'"
        :disabled="!isValidToProceed || isPlacingOrder"
        :loading="isPlacingOrder"
        :label="checkoutButtonLabel"
        size="xl"
        block
        @click="handleCreateOrder"
      />
      <p class="text-sm text-muted">
        Mit Klick auf "Jetzt bestellen!" erklärst du dich mit unseren
        <ULink to="/agb" class="text-primary font-medium">AGB</ULink> und
        <ULink to="/datenschutz" class="text-primary font-medium"
          >Datenschutzbestimmungen</ULink
        >
        einverstanden.
      </p>
    </div>
  </div>
</template>
