<script setup lang="ts">
import type { Schemas } from "#shopware";

defineProps<{
  category: Schemas["Category"];
}>();
</script>

<template>
  <div class="relative mb-4 mt-8 h-40 w-full overflow-hidden rounded-lg">
    <NuxtImg
      v-if="category.media?.url"
      :src="category.media.url"
      class="absolute inset-0 h-full w-full object-cover"
      sizes="sm:100vw md:700px"
      alt="Pizza Kategorie"
      placeholder
    />
    <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-black/10" />
    <div class="relative z-10 p-4">
      <h2 class="text-3xl md:text-4xl text-white drop-shadow">
        {{ category.name }}
      </h2>
      <h3 v-if="category.description" class="text-white/90">
        {{ category.description }}
      </h3>
    </div>
  </div>
</template>
