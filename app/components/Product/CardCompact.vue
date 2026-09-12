<script setup lang="ts">
import type { Schemas } from "#shopware";

// Compact card for horizontal rows (top sellers, #327): cover or placeholder,
// number, name, price and a plus. The whole card opens the quick view.
const props = defineProps<{
  product: Schemas["Product"];
}>();

const emit = defineEmits<{
  select: [product: Schemas["Product"]];
}>();

const { getFormattedPrice } = useCommercePrice();

const coverMedia = computed(() => props.product.cover?.media);
const name = computed(
  () => props.product.translated?.name ?? props.product.name,
);
</script>

<template>
  <article
    class="flex w-44 shrink-0 cursor-pointer snap-start flex-col overflow-hidden rounded-xl bg-default shadow-md ring ring-default transition-shadow hover:shadow-lg hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-primary"
    role="button"
    tabindex="0"
    aria-haspopup="dialog"
    :aria-label="`${name} auswählen`"
    @click="emit('select', product)"
    @keydown.enter.prevent="emit('select', product)"
    @keydown.space.prevent="emit('select', product)"
  >
    <img
      v-if="coverMedia?.url"
      :src="coverMedia.url"
      :srcset="mediaSrcSet(coverMedia)"
      sizes="176px"
      :width="mediaSize(coverMedia)?.width"
      :height="mediaSize(coverMedia)?.height"
      :alt="name"
      loading="lazy"
      decoding="async"
      class="h-28 w-full object-cover"
    />
    <div
      v-else
      class="flex h-28 w-full items-center justify-center bg-gradient-to-b from-brand-100 to-brand-200 text-brand-600"
      aria-hidden="true"
    >
      <UIcon name="i-lucide-utensils-crossed" class="size-8" />
    </div>
    <div class="flex flex-1 flex-col gap-1.5 p-3">
      <span class="text-xs font-semibold text-primary">
        #{{ product.productNumber }}
      </span>
      <span class="line-clamp-2 text-base leading-5 font-bold text-highlighted">
        {{ name }}
      </span>
      <div class="mt-auto flex items-center justify-between pt-1">
        <span class="font-bold text-highlighted">
          {{ getFormattedPrice(product.calculatedPrice.totalPrice) }}
        </span>
        <span
          class="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary ring ring-inset ring-primary/25"
          aria-hidden="true"
        >
          <UIcon name="i-lucide-plus" class="size-4" />
        </span>
      </div>
    </div>
  </article>
</template>
