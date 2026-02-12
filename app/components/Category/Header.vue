<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  category: Schemas["Category"];
}>();

const { category: categoryRef } = toRefs(props);

const categoryCover = computed(
  () => categoryRef.value.media?.url ?? "/category-placeholder.webp",
);
</script>

<template>
  <div
    class="relative mb-4 mt-8 min-h-36 w-full overflow-hidden rounded-[0.5rem]"
  >
    <NuxtImg
      :src="categoryCover"
      class="absolute inset-0 h-full w-full object-cover"
      sizes="sm:100vw md:700px"
      :alt="category.name + ' Cover Image'"
      placeholder
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
