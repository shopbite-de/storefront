<script setup lang="ts">
import { shopLocale } from "#shopbite-locale";
import QuickView from "~/components/Cart/QuickView.vue";
import { useIntervalFn } from "@vueuse/core";

const { t } = useI18n();

const { selectedShippingMethod, selection, refreshSelection } =
  useCheckoutMethods();
const { refresh: refreshCart } = useCartData();
const { orderer, refresh: refreshOrderer } = useCheckoutOrderer();
// a login or an account registration in the checkout (ADR 0001, step 6)
const { isLoggedIn } = useCustomer();
const { acceptsOrders, refresh, checkAcceptsOrders } = useShopConfig();
const { trackOrder } = useTrackEvent();
const { placeOrder } = usePlaceOrder();
const { isLoading: isLoadingOpeningHours, hasFailed: hasOpeningHoursFailed } =
  useOpeningHoursData();
const {
  isShippingMethodBlocked,
  isPaymentMethodBlocked,
  ensureAvailableCheckoutMethods,
} = useCheckoutMethodGuard();

// The one-page checkout (#443): errors show in the form, next to the order
// button.
const { message: orderError } = useCheckoutOrderMessage();

function reportError(message: CheckoutOrderMessage) {
  orderError.value = message;
}

function loadOrderer() {
  refreshOrderer().catch((error) => {
    console.error("[checkout][orderer]", error);
  });
}

// The switch that accepts orders stays live (?fresh=1); the lead times are
// loaded live once after hydration (useLiveShopData).
onMounted(() => {
  refresh();
  loadOrderer();
  if (!selection.value) {
    refreshSelection().catch((error) => {
      console.error("[checkout][selection]", error);
    });
  }
  ensureAvailableCheckoutMethods().catch((error) => {
    console.error("[checkout][ensureAvailableCheckoutMethods]", error);
  });
});

// a login or logout changes who orders and their methods
watch(isLoggedIn, () => {
  loadOrderer();
  refreshSelection().catch((error) => {
    console.error("[checkout][selection]", error);
  });
});

useIntervalFn(refresh, 10000);

const shippingMethodName = computed(
  () =>
    selectedShippingMethod.value?.name ||
    t("order.summary.fallbackShippingMethod"),
);

// the wished time with its service date, as the order carries it
const clock = ref(new Date());
const { wishedTimeFor } = useDeliveryTime(clock);

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
      const method = shippingMethodName.value;
      reportError({
        title: t("order.summary.shippingBlocked.title", { method }),
        description: t("order.summary.shippingBlocked.description", {
          method,
        }),
      });
      return false;
    }
    // the shipping method is fine here: the payment method is not
    reportError({
      title: t("order.summary.noPaymentMethod.title"),
      description: t("order.summary.noPaymentMethod.description"),
    });
  } catch (error) {
    console.error("[checkout][ensureAvailableCheckoutMethods]", error);
    reportError({
      title: t("order.summary.checkFailed.title"),
      description: t("order.summary.checkFailed.description"),
    });
  }
  return false;
}

/**
 * Whether the restaurant accepts orders as the backend has it now
 * (uncached): the page may still show the value of the server render. The
 * ShopBite plugin refuses a paused order as well; asking first gives the
 * guest a clear message instead of a failed order.
 */
async function isCheckoutStillEnabled(): Promise<boolean> {
  const enabled = await checkAcceptsOrders();
  if (enabled) return true;
  reportError({
    title: t("order.summary.notPossible"),
    description: t(
      enabled === false
        ? "order.summary.notAccepting"
        : "order.summary.acceptingUnknown",
    ),
  });
  return false;
}

async function handleCreateOrder() {
  isPlacingOrder.value = true;
  orderError.value = null;
  try {
    if (!(await isCheckoutStillEnabled())) return;
    if (!(await hasAvailableCheckoutMethods())) return;

    clock.value = new Date();
    const wishedTime = wishedTimeFor(selectedDeliveryTime.value);
    if (!wishedTime) throw new Error("no wished time");

    const placed = await placeOrder({ wishedTime });
    trackOrder(placed.order);

    // the order emptied the cart, also before a payment elsewhere
    await refreshCart().catch(() => {});
    if (placed.redirectUrl) {
      await navigateTo(placed.redirectUrl, { external: true });
      return;
    }
    if (placed.paymentFailed) {
      await navigateTo({
        name: "bestellung-id-fehler",
        params: { id: placed.order.id },
      });
      return;
    }

    navigateTo({
      name: "bestellung-id-erfolg",
      params: { id: placed.order.id },
    });
  } catch (error) {
    console.error("[checkout][createOrder]", error);
    const code = domainErrorCode(error);
    const placedId = domainErrorDetails(error).orderId;
    reportError(
      code === "order_already_placed" && typeof placedId === "string"
        ? {
            title: t("order.summary.alreadyPlaced.title"),
            description: t("order.summary.alreadyPlaced.description"),
            link: {
              to: { name: "bestellung-id", params: { id: placedId } },
              label: t("order.summary.alreadyPlaced.link"),
            },
          }
        : code === "order_status_unknown"
          ? {
              title: t("order.summary.statusUnknown.title"),
              description: t("order.summary.statusUnknown.description"),
            }
          : {
              title: t("order.summary.failed.title"),
              description: t("order.summary.failed.description"),
            },
    );
    // an empty cart would replace this page (and the message) with the
    // empty state: keep it for the order already placed
    if (code !== "order_already_placed") await refreshCart().catch(() => {});
  } finally {
    isPlacingOrder.value = false;
  }
}

const customerDataAvailable = computed<boolean>(() => !!orderer.value);

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
  () =>
    !!selection.value?.paymentMethodId && !!selection.value?.shippingMethodId,
);

const isValidToProceed = computed(
  () =>
    customerDataAvailable.value &&
    acceptsOrders.value &&
    isValidTime.value &&
    shippingAndPaymentSet.value &&
    !isShippingMethodBlocked.value &&
    !isPaymentMethodBlocked.value,
);

const isPlacingOrder = ref(false);
const selectedDeliveryTime = ref("");
// DeliveryTimeSelect reports `false` during its setup (no time selected before
// the business hours load in the browser). Starting with `true` rendered the
// order button differently on the server and at hydration (#339).
const isValidTime = ref(false);

const checkoutSections = [
  { id: "versand", number: 1, title: "order.shared.deliveryOrPickup" },
  { id: "zeit", number: 2, title: "order.summary.sections.time" },
  { id: "angaben", number: 3, title: "order.summary.sections.details" },
  { id: "bezahlung", number: 4, title: "order.shared.payment" },
] as const;

const checkoutButtonLabel = computed<string>(() => {
  if (!customerDataAvailable.value) {
    return t("order.summary.button.saveDetailsFirst");
  }

  // app.vue loads business hours and holidays after hydration. Until then (or
  // when that fails) an invalid time says nothing about the shop being closed
  // (#349, #355).
  if (isLoadingOpeningHours.value) {
    return t("order.summary.button.loadingHours");
  }

  if (hasOpeningHoursFailed.value) {
    return t("order.shared.hoursFailed");
  }

  if (!isValidTime.value) {
    return t("order.summary.button.closed");
  }

  if (!acceptsOrders.value) {
    return t("order.summary.button.notAccepting");
  }

  if (isShippingMethodBlocked.value) {
    return t("order.summary.button.shippingBlocked", {
      method: shippingMethodName.value,
    });
  }

  if (isPaymentMethodBlocked.value) {
    return t("order.summary.button.noPaymentMethod");
  }

  return t("order.summary.button.placeOrder");
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
          {{ $t(section.title) }}
        </h2>
        <template v-if="section.id === 'versand'">
          <CheckoutPaymentAndDelivery part="shipping" />
          <p
            v-if="isShippingMethodBlocked && customerDataAvailable"
            role="alert"
            class="mt-3 flex gap-3 rounded-sb-control border-[1.5px] border-sb-danger p-4 text-sm"
          >
            <span class="font-bold text-sb-danger" aria-hidden="true">!</span>
            <span>{{
              $t("order.summary.shippingBlocked.alert", {
                method: shippingMethodName,
              })
            }}</span>
          </p>
          <p
            v-else-if="isShippingMethodBlocked"
            class="mt-3 text-sm text-sb-ink-muted"
          >
            {{
              $t("order.summary.shippingBlocked.hint", {
                method: shippingMethodName,
              })
            }}
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
        {{ $t("order.shared.yourOrder") }}
      </h2>
      <QuickView :with-upsell="true" />
      <CheckoutVoucherInput />
      <CheckoutOrderMessage />
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
          isValidToProceed
            ? $t("order.summary.button.placeOrder")
            : checkoutButtonLabel
        }}
      </SbButton>
      <i18n-t
        keypath="order.summary.legal.text"
        tag="p"
        class="text-sm text-sb-ink-muted"
      >
        <template #terms>
          <NuxtLink
            :to="shopLocale.contentPaths.terms"
            class="font-semibold text-sb-primary-ink underline"
            >{{ $t("order.summary.legal.terms") }}</NuxtLink
          >
        </template>
        <template #privacy>
          <NuxtLink
            :to="shopLocale.contentPaths.privacy"
            class="font-semibold text-sb-primary-ink underline"
            >{{ $t("order.summary.legal.privacy") }}</NuxtLink
          >
        </template>
      </i18n-t>
    </section>
  </div>
</template>
