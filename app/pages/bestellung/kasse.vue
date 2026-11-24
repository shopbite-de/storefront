<script setup lang="ts">
import { shopLocale } from "#shopbite-locale";

// One-page checkout (#443): delivery or pickup, time, customer data,
// payment and the order on one page.
const { t } = useI18n();
useSeoMeta({
  title: t("order.checkoutPage.title"),
  robots: "noindex, nofollow",
});

const { isEmpty, refresh } = useCartData();
const { message } = useCheckoutOrderMessage();

// A full navigation right after adding a dish can load this page while the
// write is still landing (also before step 5): look again a few times.
onMounted(() => {
  // a message of an earlier visit of the page is over
  message.value = null;
  if (!cartWrittenWithin(10_000)) return;
  for (const delay of [1500, 3500]) {
    setTimeout(() => {
      if (isEmpty.value) refresh().catch(() => {});
    }, delay);
  }
});
</script>

<template>
  <div class="flex flex-col gap-6 py-2 font-body text-sb-ink sm:gap-8">
    <h1 class="font-display text-4xl leading-none sm:text-5xl">
      {{ $t("order.checkoutPage.title") }}
    </h1>
    <ClientOnly>
      <div v-if="isEmpty" class="flex flex-col gap-4">
        <!-- e.g. the order another tab placed a moment ago -->
        <CheckoutOrderMessage />
        <div
          class="flex flex-col items-start gap-4 rounded-sb-card border border-sb-line bg-sb-surface p-6"
        >
          <p>{{ $t("order.checkoutPage.empty") }}</p>
          <SbButton :to="shopLocale.menuPath">{{
            $t("order.shared.toMenu")
          }}</SbButton>
        </div>
      </div>
      <CheckoutSummary v-else />
      <template #fallback>
        <div
          class="h-96"
          aria-busy="true"
          :aria-label="$t('order.checkoutPage.loading')"
        />
      </template>
    </ClientOnly>
  </div>
</template>
