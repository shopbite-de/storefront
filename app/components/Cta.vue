<script setup lang="ts">
import type { ButtonProps } from "#ui/components/Button.vue";

defineProps<{
  title: string;
  description?: string | undefined;
  backgroundImage?: string | undefined;
  links?: ButtonProps[] | undefined;
}>();
</script>

<template>
  <div class="relative overflow-hidden">
    <NuxtImg
      v-if="backgroundImage"
      :src="backgroundImage"
      class="absolute inset-0 z-0 w-full h-full object-cover opacity-40"
      alt="CTA Background"
    />
    <UPageCTA
      variant="soft"
      :title="title"
      :description="description"
      :links="links"
      class="relative z-10"
    />
  </div>
</template>
