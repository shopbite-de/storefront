<script setup lang="ts">
import QuickView from "~/components/Cart/QuickView.vue";
import { useIntervalFn } from "@vueuse/core";
import { useOrderPayment } from "@shopware/composables";

const { createOrder, selectedPaymentMethod, selectedShippingMethod } =
  useCheckout();
const { refreshCart } = useCart();
const { isLoggedIn, isGuestSession, refreshUser } = useUser();
const { isCheckoutEnabled, refresh } = useShopBiteConfig();
const { trackOrder } = useTrackEvent();
const { isLoading: isLoadingOpeningHours, hasFailed: hasOpeningHoursFailed } =
  useOpeningHoursData();
const {
  isShippingMethodBlocked,
  isPaymentMethodBlocked,
  ensureAvailableCheckoutMethods,
} = useCheckoutMethodGuard();

const {
  public: { storeUrl },
} = useRuntimeConfig();

const toast = useToast();

// Presets: the one-page checkout (#443). Errors show in the form, next to
// the order button, instead of a toast that disappears.
const { hasPreset } = useThemePreset();
const orderError = ref<{ title: string; description: string } | null>(null);

function reportError(
  message: { title: string; description: string },
  toastOptions: { icon: string },
) {
  if (hasPreset) {
    orderError.value = message;
    return;
  }
  toast.add({ ...message, color: "error", progress: false, ...toastOptions });
}

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
  ensureAvailableCheckoutMethods().catch((error) => {
    console.error("[checkout][ensureAvailableCheckoutMethods]", error);
  });
});

useIntervalFn(refresh, 10000);

const createdOrder = ref<Awaited<ReturnType<typeof createOrder>> | null>(null);
const { handlePayment, paymentUrl } = useOrderPayment(
  computed(() => createdOrder.value),
);

/**
 * The shipping or payment method may have become unavailable since the
 * cart was last loaded (availability rules, order value, address).
 * Re-check and switch before creating the order instead of failing with
 * an invalid cart. Reports problems to the customer itself.
 * See issues #240 and #276.
 */
async function hasAvailableCheckoutMethods(): Promise<boolean> {
  try {
    if (await ensureAvailableCheckoutMethods()) return true;
    reportError(
      {
        title: `Keine ${blockedMethodLabel.value} verfügbar`,
        description: `Für deine Bestellung ist aktuell keine ${blockedMethodLabel.value} verfügbar. Bitte prüfe deine Adresse und deinen Warenkorb.`,
      },
      { icon: blockedMethodIcon.value },
    );
  } catch (error) {
    console.error("[checkout][ensureAvailableCheckoutMethods]", error);
    reportError(
      {
        title: "Versand- und Zahlart konnten nicht geprüft werden",
        description: "Bitte versuche es in einem Moment erneut.",
      },
      { icon: "i-lucide-x-circle" },
    );
  }
  return false;
}

async function handleCreateOrder() {
  isPlacingOrder.value = true;
  orderError.value = null;
  try {
    if (!(await hasAvailableCheckoutMethods())) return;

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
    // the preset confirmation page says it in its heading
    if (!hasPreset) {
      toast.add({
        title: "Bestellung aufgegeben!",
        icon: "i-lucide-shopping-cart",
        color: "success",
        progress: false,
      });
    }
    navigateTo(`/bestellung/${order.id}/erfolg`);
  } catch (error) {
    console.error("[checkout][createOrder]", error);
    reportError(
      {
        title: "Bestellung fehlgeschlagen",
        description:
          "Deine Bestellung konnte nicht aufgegeben werden. Bitte prüfe deine Angaben und versuche es erneut.",
      },
      { icon: "i-lucide-x-circle" },
    );
    await refreshCart().catch(() => {});
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
    shippingAndPaymentSet.value &&
    !isShippingMethodBlocked.value &&
    !isPaymentMethodBlocked.value,
);

const blockedMethodLabel = computed(() =>
  isShippingMethodBlocked.value ? "Versandart" : "Zahlart",
);
const blockedMethodIcon = computed(() =>
  isShippingMethodBlocked.value ? "i-lucide-truck" : "i-lucide-badge-euro",
);

const isPlacingOrder = ref(false);
const selectedDeliveryTime = ref("");
// DeliveryTimeSelect reports `false` during its setup (no time selected before
// the business hours load in the browser). Starting with `true` rendered the
// order button differently on the server and at hydration (#339).
const isValidTime = ref(false);

const checkoutSections = [
  { id: "versand", number: 1, title: "Lieferung oder Abholung" },
  { id: "zeit", number: 2, title: "Wann?" },
  { id: "angaben", number: 3, title: "Ihre Angaben" },
  { id: "bezahlung", number: 4, title: "Bezahlung" },
] as const;

const checkoutButtonLabel = computed<string>(() => {
  if (!customerDataAvailable.value) {
    return hasPreset
      ? "Bitte zuerst Ihre Angaben speichern"
      : "Bitte einloggen oder Kundendaten erfassen";
  }

  // app.vue loads business hours and holidays after mounting. Until then (or
  // when that fails) an invalid time says nothing about the shop being closed
  // (#349, #355).
  if (isLoadingOpeningHours.value) {
    return "Lade Öffnungszeiten …";
  }

  if (hasOpeningHoursFailed.value) {
    return "Öffnungszeiten konnten nicht geladen werden";
  }

  if (!isValidTime.value) {
    return "Wir haben aktuell leider geschlossen";
  }

  if (!isCheckoutEnabled.value) {
    return "Es werden aktuell keine weiteren Bestellungen mehr aufgenommen";
  }

  if (isShippingMethodBlocked.value || isPaymentMethodBlocked.value) {
    return `Aktuell ist keine ${blockedMethodLabel.value} verfügbar`;
  }

  return "Zahlungspflichtig bestellen";
});
</script>

<template>
  <div
    v-if="hasPreset"
    class="grid grid-cols-1 gap-8 font-body text-sb-ink lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12"
  >
    <div class="flex min-w-0 flex-col gap-4">
      <section
        v-for="section in checkoutSections"
        :key="section.id"
        :aria-labelledby="`kasse-${section.id}`"
        class="rounded-sb-card border border-sb-line bg-sb-surface p-5 sm:p-7"
      >
        <h2
          :id="`kasse-${section.id}`"
          class="mb-4 flex items-baseline gap-3 font-display text-2xl leading-tight sm:text-[28px]"
        >
          <span class="text-sb-accent">{{ section.number }}</span>
          {{ section.title }}
        </h2>
        <CheckoutPaymentAndDelivery
          v-if="section.id === 'versand'"
          part="shipping"
        />
        <CheckoutDeliveryTimeSelect
          v-else-if="section.id === 'zeit'"
          v-model:valid="isValidTime"
          v-model="selectedDeliveryTime"
        />
        <template v-else-if="section.id === 'angaben'">
          <UserDetail v-if="customerDataAvailable" :with-edit-button="true" />
          <CheckoutLoginOrRegister v-else />
        </template>
        <CheckoutPaymentAndDelivery
          v-else-if="section.id === 'bezahlung'"
          part="payment"
        />
      </section>
    </div>
    <section
      class="flex h-max flex-col gap-4 rounded-sb-card border border-sb-line bg-sb-surface p-6 lg:sticky lg:top-24"
      aria-labelledby="kasse-bestellung"
    >
      <h2 id="kasse-bestellung" class="font-display text-[28px] leading-none">
        Ihre Bestellung
      </h2>
      <QuickView :with-upsell="true" />
      <CheckoutVoucherInput />
      <div
        v-if="orderError"
        role="alert"
        class="flex gap-3 rounded-sb-control border-[1.5px] border-sb-danger p-4 text-sm"
      >
        <span class="font-bold text-sb-danger">!</span>
        <span>
          <strong class="block">{{ orderError.title }}</strong>
          {{ orderError.description }}
        </span>
      </div>
      <SbButton
        block
        size="lg"
        class="min-h-14"
        :disabled="!isValidToProceed || isPlacingOrder"
        :loading="
          isPlacingOrder || (customerDataAvailable && isLoadingOpeningHours)
        "
        @click="handleCreateOrder"
      >
        {{
          isValidToProceed ? "Zahlungspflichtig bestellen" : checkoutButtonLabel
        }}
      </SbButton>
      <p class="text-sm text-sb-ink-muted">
        Mit der Bestellung akzeptieren Sie unsere
        <NuxtLink to="/agb" class="font-semibold text-sb-primary-ink underline"
          >AGB</NuxtLink
        >
        und die
        <NuxtLink
          to="/datenschutz"
          class="font-semibold text-sb-primary-ink underline"
          >Datenschutzerklärung</NuxtLink
        >.
      </p>
    </section>
  </div>
  <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
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
        <QuickView
          :with-quantity-input="false"
          :with-delete-button="false"
          :with-upsell="true"
        />
      </UCard>
      <CheckoutVoucherInput />
      <UButton
        :icon="isValidToProceed ? 'i-lucide-shopping-cart' : 'i-lucide-lock'"
        :disabled="!isValidToProceed || isPlacingOrder"
        :loading="
          isPlacingOrder || (customerDataAvailable && isLoadingOpeningHours)
        "
        :label="checkoutButtonLabel"
        size="xl"
        block
        @click="handleCreateOrder"
      />
      <p class="text-sm text-muted">
        Mit Klick auf „Zahlungspflichtig bestellen“ erklärst du dich mit unseren
        <ULink to="/agb" class="text-primary font-medium">AGB</ULink> und
        <ULink to="/datenschutz" class="text-primary font-medium"
          >Datenschutzbestimmungen</ULink
        >
        einverstanden.
      </p>
    </div>
  </div>
</template>
