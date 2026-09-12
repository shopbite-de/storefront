<script setup lang="ts">
// Sticky cart bar on phones: appears as soon as the cart holds something and
// opens the cart drawer; hidden on the checkout pages, which show the cart
// themselves. The cart is loaded on the client, so the bar never renders on
// the server (no hydration mismatch) (#325).
const CHECKOUT_PATH_PREFIX = "/bestellung";

const route = useRoute();
const { count, subtotal } = useCart();
const { isCheckoutEnabled } = useShopBiteConfig();
const { getFormattedPrice } = useCommercePrice();
const { show } = useCartQuickView();

const visible = computed(
  () =>
    isCheckoutEnabled.value &&
    count.value > 0 &&
    !route.path.startsWith(CHECKOUT_PATH_PREFIX),
);

const itemsLabel = computed(() =>
  count.value === 1 ? "1 Artikel" : `${count.value} Artikel`,
);
</script>

<template>
  <!-- Keeps the page bottom clear of the fixed bar. -->
  <div v-if="visible" class="h-20 lg:hidden" aria-hidden="true" />
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-y-full"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="translate-y-full"
  >
    <div
      v-if="visible"
      class="fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <button
        type="button"
        class="flex h-14 w-full items-center gap-3 rounded-xl bg-primary px-4 text-inverted shadow-lg transition-colors hover:bg-primary/90 active:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-haspopup="dialog"
        data-testid="cart-bar"
        @click="show"
      >
        <UIcon name="i-lucide-shopping-bag" class="size-6 shrink-0" />
        <span class="flex min-w-0 flex-1 items-baseline gap-2 text-left">
          <span class="font-semibold">Warenkorb</span>
          <span class="truncate text-sm opacity-90">
            {{ itemsLabel }} · {{ getFormattedPrice(subtotal) }}
          </span>
        </span>
        <UIcon name="i-lucide-chevron-up" class="size-5 shrink-0" />
      </button>
    </div>
  </Transition>
</template>
