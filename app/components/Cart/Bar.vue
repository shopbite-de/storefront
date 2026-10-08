<script setup lang="ts">
// Sticky cart bar on phones: appears as soon as the cart holds something and
// opens the cart drawer; hidden on the checkout pages, which show the cart
// themselves. The cart is loaded on the client, so the bar never renders on
// the server (no hydration mismatch). Adding a product pops the bar and
// names the product for a moment; this replaces the add-to-cart toast (#325).
const CHECKOUT_PATH_PREFIX = "/bestellung";
const ADDED_LABEL_MS = 1800;

const route = useRoute();
const { count, subtotal } = useCart();
const { isCheckoutEnabled } = useShopBiteConfig();
const { getFormattedPrice } = useCommercePrice();
const { show } = useCartQuickView();
const { onCartItemAdded } = useProductEvents();

const visible = computed(
  () =>
    isCheckoutEnabled.value &&
    count.value > 0 &&
    !route.path.startsWith(CHECKOUT_PATH_PREFIX),
);

const itemsLabel = computed(() =>
  count.value === 1 ? "1 Artikel" : `${count.value} Artikel`,
);

const addedLabel = ref<string | null>(null);
// Changing the key re-mounts the button, which restarts the pop animation.
const popKey = ref(0);
let addedTimer: ReturnType<typeof setTimeout> | undefined;

onCartItemAdded(({ product, quantity }) => {
  const name = product.translated?.name ?? product.name;
  addedLabel.value = quantity > 1 ? `${quantity}× ${name}` : name;
  popKey.value++;
  clearTimeout(addedTimer);
  addedTimer = setTimeout(() => {
    addedLabel.value = null;
  }, ADDED_LABEL_MS);
});

onBeforeUnmount(() => clearTimeout(addedTimer));
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
        :key="popKey"
        type="button"
        class="flex h-14 w-full items-center gap-3 rounded-sb-card bg-sb-primary px-4 font-body text-sb-on-primary shadow-lg transition-colors hover:bg-sb-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sb-focus"
        :class="{ 'motion-safe:animate-cart-pop': popKey > 0 }"
        aria-haspopup="dialog"
        aria-live="polite"
        data-testid="cart-bar"
        @click="show"
      >
        <SbIcon name="bag" :size="24" />
        <span class="flex min-w-0 flex-1 items-baseline gap-2 text-left">
          <Transition
            mode="out-in"
            enter-active-class="transition duration-150"
            enter-from-class="translate-y-1 opacity-0"
            leave-active-class="transition duration-100"
            leave-to-class="-translate-y-1 opacity-0"
          >
            <span
              v-if="addedLabel"
              key="added"
              class="flex min-w-0 items-baseline gap-2"
            >
              <SbIcon name="check" :size="16" class="self-center" />
              <span class="truncate font-semibold">{{ addedLabel }}</span>
              <span class="shrink-0 text-sm">hinzugefügt</span>
            </span>
            <span v-else key="cart" class="flex min-w-0 items-baseline gap-2">
              <span class="font-semibold">Warenkorb</span>
              <span class="truncate text-sm">
                {{ itemsLabel }} · {{ getFormattedPrice(subtotal) }}
              </span>
            </span>
          </Transition>
        </span>
        <SbIcon name="chevron-up" :size="20" />
      </button>
    </div>
  </Transition>
</template>
