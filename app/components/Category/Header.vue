<script setup lang="ts">
import type { Schemas } from "#shopware";

defineProps<{
  category: Schemas["Category"];
}>();
</script>

<template>
  <div
    v-if="category.media?.url"
    class="relative mb-4 mt-8 h-40 w-full overflow-hidden rounded-lg"
  >
    <NuxtImg
      v-if="category.media?.url"
      :src="category.media.url"
      class="absolute inset-0 h-full w-full object-cover"
      sizes="sm:100vw md:700px"
      alt="Pizza Kategorie"
      placeholder
    />
    <div
      v-if="category.media?.url"
      class="absolute inset-0 bg-gradient-to-t from-black/50 to-black/10"
    />

    <div v-else class="absolute inset-0 bg-primary" />

    <div class="relative p-4">
      <h2
        class="text-pretty font-semibold text-3xl md:text-4xl text-white drop-shadow"
      >
        {{ category.name }}
      </h2>
      <h3
        v-if="category.description"
        class="text-white/90 text-[15px] text-pretty mt-1"
      >
        {{ category.description }}
      </h3>
    </div>
  </div>
  <UPageCard
    v-else
    :title="category.translated.name ?? category.name"
    :description="category.translated.description ?? category.description"
    variant="soft"
    class="my-4"
    :ui="{
      title: 'text-3xl md:text-4xl',
    }"
  />
</template>
