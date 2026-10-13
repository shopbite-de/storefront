<script setup lang="ts">
import type { Schemas } from "#shopware";

/**
 * Menu item of the presets (#441): the "bon". The menu number sits on a
 * strip with a perforation, like on a kitchen ticket; `photo` puts the
 * cover on top (grill preset). The name is a link stretched over the card
 * and opens the quick view; the button adds a product without variants
 * straight to the cart and shows the quantity once it is in there.
 */
const props = defineProps<{
  product: Schemas["Product"];
  href?: string;
  photo?: boolean;
}>();

const emit = defineEmits<{
  select: [product: Schemas["Product"]];
}>();

const name = computed(
  () => props.product.translated?.name ?? props.product.name ?? "",
);
const sortedProperties = computed(
  () =>
    props.product.sortedProperties as Schemas["PropertyGroup"][] | undefined,
);
const ingredients = computed(() =>
  getMainIngredients(sortedProperties.value)
    .map((option) => option.translated?.name ?? option.name)
    .join(", "),
);
const diets = computed(() =>
  getDiets(sortedProperties.value).map((diet) =>
    diet === "vegan" ? "Vegan" : "Vegetarisch",
  ),
);
// Read before the name; the strip with the number is aria-hidden. Built in
// script: a trailing space in the template would be condensed away.
// The strip has a fixed width so the cards line up (#441); menu numbers
// are "21" in most shops, but can be "LF-30" or "LF-35-normal": the type
// shrinks, very long numbers wrap.
const numberSize = computed(() => {
  const length = props.product.productNumber.length;
  if (length <= 2) return "text-2xl sm:text-[28px] whitespace-nowrap";
  if (length === 3) return "text-xl sm:text-[22px] whitespace-nowrap";
  if (length <= 5) return "text-[15px] sm:text-lg whitespace-nowrap";
  if (length === 6) return "text-[13px] sm:text-[15px] whitespace-nowrap";
  // Variant numbers like "LF-35-normal": two lines, broken anywhere.
  return "text-xs sm:text-[13px] leading-tight [overflow-wrap:anywhere]";
});
const numberLabel = computed(() => `Nr. ${props.product.productNumber} `);
const cover = computed(() =>
  props.photo ? props.product.cover?.media : undefined,
);

const needsChoice = computed(() => productNeedsChoice(props.product));
const available = computed(() => productIsAvailable(props.product));

const { getFormattedPrice } = useCommercePrice();
const price = computed(() => {
  const formatted = getFormattedPrice(
    props.product.calculatedPrice?.totalPrice,
  );
  return needsChoice.value ? `ab ${formatted}` : formatted;
});

const { quantity } = useProductCartQuantity(() => props.product.id);
const { setSelectedProduct, addToCart, isLoading } = useAddToCart();

const buttonLabel = computed(() => {
  if (needsChoice.value) return `${name.value} auswählen`;
  if (quantity.value > 0)
    return `${name.value}, ${quantity.value} im Warenkorb, noch eine hinzufügen`;
  return `${name.value} hinzufügen`;
});

function select() {
  emit("select", props.product);
}

async function add() {
  if (needsChoice.value) {
    select();
    return;
  }
  setSelectedProduct(props.product);
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
        {{ product.productNumber }}
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
            <span class="sr-only">{{ numberLabel }}</span
            >{{ name }}
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
            >Ausverkauft</span
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
