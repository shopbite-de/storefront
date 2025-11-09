<script setup lang="ts">
import type { ButtonProps } from "#ui/components/Button.vue";

const links = ref<ButtonProps[]>([
  {
    label: "Zur Speisekarte",
    color: "primary",
    to: "/speisekarte",
  },
  {
    label: "Tisch reservieren",
    variant: "outline",
    trailingIcon: "i-lucide-phone",
    to: "+490610471427",
  },
]);
</script>

<template>
  <div class="relative overflow-hidden">
    <NuxtImg
      src="https://shopware.shopbite.de/media/f5/19/4a/1762546880/category-pizza-header.webp"
      class="absolute inset-0 z-0 w-full h-full object-cover opacity-40"
      alt="CTA Background"
    />
    <UPageCTA
      variant="soft"
      title="Trusted and supported by our amazing community"
      description="We've built a strong, lasting partnership. Their trust is our driving force, propelling us towards shared success."
      :links="links"
      class="relative z-10"
    />
  </div>
</template>
