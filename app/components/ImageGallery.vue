<script setup lang="ts">
import type { CarouselItem } from "#ui/components/Carousel.vue";
import type { ButtonProps } from "#ui/components/Button.vue";

type ImageProp = {
  image: string;
  alt: string;
};

type ImageCarousel = CarouselItem & ImageProp;

defineProps<{
  title: string;
  description?: string | undefined;
  headline?: string | undefined;
  images: ImageCarousel[] | undefined;
  links?: ButtonProps[] | undefined;
}>();
</script>

<template>
  <UPageSection
    :title="title"
    :description="description"
    :headline="headline"
    :links="links"
  >
    <template #body>
      <UCarousel
        v-slot="{ item }"
        :items="images"
        class="mx-auto w-full"
        auto-height
        arrows
        loop
      >
        <img
          v-if="item"
          :src="item.image"
          :alt="item.alt"
          class="rounded-lg w-full max-h-[50vh] object-contain"
        >
      </UCarousel>
    </template>
  </UPageSection>
</template>
