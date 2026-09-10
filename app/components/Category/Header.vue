<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  category: Schemas["Category"];
}>();

const { category: categoryRef } = toRefs(props);

const categoryCover = computed(
  () => categoryRef.value.media?.url ?? "/category-placeholder.webp",
);

// Shopware thumbnails (400/800/1920 px) instead of the original, which is
// several thousand pixels wide (#273). The box is 700 px at most.
const srcset = computed(() => mediaSrcSet(categoryRef.value.media));
</script>

<template>
  <div
    class="relative mb-4 mt-8 min-h-36 w-full overflow-hidden rounded-[0.5rem]"
  >
    <img
      :src="categoryCover"
      :srcset="srcset"
      sizes="(min-width: 768px) 700px, 100vw"
      fetchpriority="high"
      decoding="async"
      class="absolute inset-0 h-full w-full object-cover"
      :alt="category.name + ' Cover Image'"
    />
    <div class="absolute inset-0 bg-linear-to-t from-black/50 to-black/10" />

    <div class="relative p-4">
      <h1
        class="text-white text-4xl md:text-5xl lg:text-6xl font-extrabold leading-none tracking-tighter mb-3"
      >
        {{ categoryRef.name }}
      </h1>
      <p
        v-if="categoryRef.description"
        class="text-white/90 text-[16px] text-pretty mt-1"
      >
        {{ categoryRef.description }}
      </p>
    </div>
  </div>
</template>
