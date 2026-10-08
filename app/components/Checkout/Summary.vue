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

// The one-page checkout (#443): errors show in the form, next to the order
// button.
const orderError = ref<{ title: string; description: string } | null>(null);

function reportError(message: { title: string; description: string }) {
  orderError.value = message;
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

const shippingMethodName = computed(
  () =>
    selectedShippingMethod.value?.translated?.name ??
    selectedShippingMethod.value?.name ??
    "Die Versandart",
);

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
    if (isShippingMethodBlocked.value) {
      reportError({
        title: `${shippingMethodName.value} ist nicht möglich`,
        description: `${shippingMethodName.value} ist für Ihre Adresse oder Ihren Warenkorb nicht möglich. Bitte wählen Sie oben eine andere Bestellart oder ändern Sie Ihre Adresse.`,
      });
      return false;
    }
    reportError({
      title: `Keine ${blockedMethodLabel.value} verfügbar`,
      description: `Für deine Bestellung ist aktuell keine ${blockedMethodLabel.value} verfügbar. Bitte prüfe deine Adresse und deinen Warenkorb.`,
    });
  } catch (error) {
    console.error("[checkout][ensureAvailableCheckoutMethods]", error);
    reportError({
      title: "Versand- und Zahlart konnten nicht geprüft werden",
      description: "Bitte versuche es in einem Moment erneut.",
    });
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
    navigateTo(`/bestellung/${order.id}/erfolg`);
  } catch (error) {
    console.error("[checkout][createOrder]", error);
    reportError({
      title: "Bestellung fehlgeschlagen",
      description:
        "Deine Bestellung konnte nicht aufgegeben werden. Bitte prüfe deine Angaben und versuche es erneut.",
    });
    await refreshCart().catch(() => {});
  } finally {
    isPlacingOrder.value = false;
  }
}

const customerDataAvailable = computed<boolean>(
  () => isLoggedIn.value || isGuestSession.value,
);

// Delivery rules need the shipping address: once the guest has saved it,
// the cart tells whether the chosen method works there.
watch(
  () => customerDataAvailable.value,
  (available, before) => {
    if (!available || before) return;
    ensureAvailableCheckoutMethods().catch((error) => {
      console.error("[checkout][ensureAvailableCheckoutMethods]", error);
    });
  },
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
    return "Bitte zuerst Ihre Angaben speichern";
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

  if (isShippingMethodBlocked.value) {
    return `${shippingMethodName.value} ist hier nicht möglich`;
  }

  if (isPaymentMethodBlocked.value) {
    return `Aktuell ist keine ${blockedMethodLabel.value} verfügbar`;
  }

  return "Zahlungspflichtig bestellen";
});
</script>

<template>
  <div
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
        <template v-if="section.id === 'versand'">
          <CheckoutPaymentAndDelivery part="shipping" />
          <p
            v-if="isShippingMethodBlocked && customerDataAvailable"
            role="alert"
            class="mt-3 flex gap-3 rounded-sb-control border-[1.5px] border-sb-danger p-4 text-sm"
          >
            <span class="font-bold text-sb-danger" aria-hidden="true">!</span>
            <span
              >{{ shippingMethodName }} ist für Ihre Adresse oder Ihren
              Warenkorb leider nicht möglich. Bitte wählen Sie eine andere
              Bestellart oder ändern Sie Ihre Adresse.</span
            >
          </p>
          <p
            v-else-if="isShippingMethodBlocked"
            class="mt-3 text-sm text-sb-ink-muted"
          >
            Ob {{ shippingMethodName }} an Ihre Adresse möglich ist, sehen Sie,
            sobald Sie Ihre Angaben gespeichert haben.
          </p>
        </template>
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
</template>
