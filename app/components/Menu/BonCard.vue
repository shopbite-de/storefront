<script setup lang="ts">
import type { Dish } from "../../../shared/domain";

/**
 * Menu item of the presets (#441): the "bon". The menu number sits on a
 * strip with a perforation, like on a kitchen ticket; `photo` puts the
 * dish's image on top (grill preset). The name is a link stretched over the
 * card and opens the dish sheet; the button adds a dish without variants
 * straight to the cart and shows the quantity once it is in there.
 */
const props = defineProps<{
  dish: Dish;
  href?: string;
  photo?: boolean;
}>();

const emit = defineEmits<{
  select: [dish: Dish];
}>();

const { t } = useI18n();
const name = computed(() => props.dish.name);
const ingredients = computed(() =>
  props.dish.ingredients.map((ingredient) => ingredient.name).join(", "),
);
const diets = computed(() => dietLabels(props.dish.diets, t));
// Read before the name; the strip with the number is aria-hidden. Built in
// script: a trailing space in the template would be condensed away.
// The strip has a fixed width so the cards line up (#441); menu numbers
// are "21" in most shops, but can be "LF-30" or "LF-35-normal": the type
// shrinks, very long numbers wrap.
const numberSize = computed(() => {
  const length = props.dish.number.length;
  if (length <= 2) return "text-2xl sm:text-[28px] whitespace-nowrap";
  if (length === 3) return "text-xl sm:text-[22px] whitespace-nowrap";
  if (length <= 5) return "text-[15px] sm:text-lg whitespace-nowrap";
  if (length === 6) return "text-[13px] sm:text-[15px] whitespace-nowrap";
  // Variant numbers like "LF-35-normal": two lines, broken anywhere.
  return "text-xs sm:text-[13px] leading-tight [overflow-wrap:anywhere]";
});
const numberLabel = computed(
  () => `${t("menu.shared.number", { number: props.dish.number })} `,
);
const cover = computed(() => (props.photo ? props.dish.media : null));

const needsChoice = computed(() => props.dish.needsChoice);
const available = computed(() => props.dish.available);

const { getFormattedMoney } = useCommercePrice();
const price = computed(() => {
  const formatted = getFormattedMoney(props.dish.price);
  return props.dish.priceFrom
    ? t("menu.shared.priceFrom", { price: formatted })
    : formatted;
});

const { quantity } = useProductCartQuantity(() => props.dish.id);
const { setSelectedDish, addToCart, isLoading } = useAddToCart();
// paused or switched off: the backend would take the cart line but refuse
// the order, so nothing goes into the cart (a dish with choices still opens)
const { acceptsOrders } = useShopConfig();

const buttonLabel = computed(() => {
  if (needsChoice.value) return t("menu.bonCard.choose", { name: name.value });
  if (quantity.value > 0)
    return t("menu.bonCard.addAnother", {
      name: name.value,
      quantity: quantity.value,
    });
  return t("menu.bonCard.add", { name: name.value });
});

function select() {
  emit("select", props.dish);
}

async function add() {
  if (needsChoice.value) {
    select();
    return;
  }
  setSelectedDish(props.dish);
  await addToCart();
}

function onLinkClick(event: MouseEvent) {
  // A modified click opens the deep link in a new tab or window.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  select();
}
</script>

<template>
  <article
    class="relative flex flex-col overflow-hidden rounded-sb-card bg-sb-surface text-sb-ink has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-sb-focus"
  >
    <img
      v-if="cover?.url"
      :src="cover.url"
      :srcset="mediaSrcSet(cover)"
      sizes="(min-width: 1024px) 360px, 100vw"
      :width="mediaSize(cover)?.width"
      :height="mediaSize(cover)?.height"
      alt=""
      loading="lazy"
      decoding="async"
      class="aspect-[4/3] w-full object-cover"
    />
    <div
      class="grid flex-1 grid-cols-[60px_minmax(0,1fr)] sm:grid-cols-[72px_minmax(0,1fr)]"
    >
      <span
        aria-hidden="true"
        :class="[
          'flex items-center justify-center border-r-2 border-dashed border-sb-line bg-sb-muted px-1.5 text-center font-display tabular-nums',
          numberSize,
        ]"
      >
        {{ dish.number }}
      </span>
      <div class="flex min-w-0 flex-col gap-1.5 py-4 pr-4 pl-4 sm:pl-[18px]">
        <h3
          class="font-body text-[16.5px] leading-snug font-bold hyphens-auto [overflow-wrap:anywhere]"
        >
          <a
            v-if="href"
            :href="href"
            aria-haspopup="dialog"
            class="after:absolute after:inset-0 hover:underline hover:underline-offset-4 focus-visible:outline-none"
            @click="onLinkClick"
            ><span class="sr-only">{{ numberLabel }}</span
            >{{ name }}</a
          >
          <template v-else>
            <span class="sr-only">{{ numberLabel }}</span>{{ name }}
          </template>
        </h3>
        <p
          v-if="diets.length"
          class="text-[13px] font-semibold text-sb-primary-ink"
        >
          {{ diets.join(" · ") }}
        </p>
        <p v-if="ingredients" class="text-sm leading-snug text-sb-ink-muted">
          {{ ingredients }}
        </p>
        <div class="mt-auto flex items-center justify-between pt-1.5">
          <span class="text-base font-bold tabular-nums">{{ price }}</span>
          <span
            v-if="!available"
            class="text-sm font-semibold text-sb-ink-muted"
            >{{ $t("menu.shared.soldOut") }}</span
          >
          <span
            v-else-if="!acceptsOrders && !needsChoice"
            class="text-sm font-semibold text-sb-ink-muted"
            >{{ $t("menu.bonCard.notOrdering") }}</span
          >
          <!-- above the stretched link, so it adds instead of opening -->
          <SbIconButton
            v-else
            :label="buttonLabel"
            :variant="quantity > 0 && !needsChoice ? 'primary' : 'tint'"
            :disabled="isLoading"
            :aria-haspopup="needsChoice ? 'dialog' : undefined"
            class="z-10"
            data-testid="menu-add"
            @click="add"
          >
            <SbIcon v-if="needsChoice" name="chevron-right" />
            <template v-else-if="quantity > 0">{{ quantity }}</template>
            <SbIcon v-else name="plus" />
          </SbIconButton>
        </div>
      </div>
    </div>
  </article>
</template>
