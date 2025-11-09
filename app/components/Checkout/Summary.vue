<script setup lang="ts">
import QuickView from "~/components/Cart/QuickView.vue";
import { useIntervalFn } from "@vueuse/core";
import { useTrackEvent } from "#imports";

const { selectedPaymentMethod, selectedShippingMethod } = useCheckout();
const { createOrder } = useCheckout();
const { refreshCart } = useCart();
const { isLoggedIn, isGuestSession } = useUser();
const { isCheckoutEnabled, refresh } = usePizzaToppings();

const toast = useToast();

onMounted(() => {
  refresh();
});

watch(isCheckoutEnabled, () => console.log(isCheckoutEnabled.value));

useIntervalFn(refresh, 10000);

async function handleCreateOrder() {
  const order = await createOrder({
    customerComment: "Wunschlieferzeit: " + selectedDeliveryTime.value,
  });

  useTrackEvent("checkout", {
    revenue: {
      currency: "EUR",
      amount: order.amountTotal as number,
    },
  });

  await refreshCart();
  toast.add({
    title: "Bestellung aufgegeben!",
    icon: "i-lucide-shopping-cart",
    color: "success",
    progress: false,
  });
  navigateTo("/order/" + order.id);
}

const customerDataAvailable = computed<boolean>(
  () => isLoggedIn.value || isGuestSession.value,
);

const isValidToProceed = computed(
  () =>
    customerDataAvailable.value && isCheckoutEnabled.value && isValidTime.value,
);

const selectedDeliveryTime = ref("");
const isValidTime = ref(true);

watch(selectedDeliveryTime, (newValue) => {
  console.log(newValue);
});

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
  <UContainer class="my-16">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="flex flex-col gap-4">
        <h3 class="text-xl font-bold">Kundendaten</h3>
        <UserDetail v-if="customerDataAvailable" />
        <div v-else>Bitte vorher einloggen oder Kundendaten erfassen</div>
        <div class="flex flex-col gap-4">
          <h3 class="text-xl font-bold">Versand- und Zahlung</h3>
          <CheckoutPaymentMethod :payment-method="selectedPaymentMethod" />
          <CheckoutShippingMethod :shipping-method="selectedShippingMethod" />
          <CheckoutDeliveryTimeSelect
            v-model:valid="isValidTime"
            v-model="selectedDeliveryTime"
          />
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <h3 class="text-xl font-bold">Warenkorb</h3>
        <div class="rounded-lg flex flex-col gap-4">
          <QuickView
            :with-quantity-input="false"
            :with-delete-button="false"
            class="p-6 bg-elevated"
          />
          <UButton
            :icon="
              isValidToProceed ? 'i-lucide-shopping-cart' : 'i-lucide-lock'
            "
            :disabled="!isValidToProceed"
            :label="checkoutButtonLabel"
            size="xl"
            block
            @click="handleCreateOrder"
          />
          <p class="font-light text-muted">
            Mit Klick auf den Button "Jetzt bestellen!" erklärst du dich mit
            unseren
            <ULink to="/agb" class="text-primary font-medium">AGB</ULink> und
            <ULink to="/datenschutz" class="text-primary font-medium"
              >Datenschutzbestimmungen</ULink
            >
            einverstanden.
          </p>
        </div>
      </div>
    </div>
  </UContainer>
</template>
