<script setup lang="ts">
import type { CarouselItem } from "#ui/components/Carousel.vue";
import type { ButtonProps } from "#ui/components/Button.vue";

type ImageProp = {
  url: string;
  alt: string;
};

type ImageCarousel = CarouselItem & ImageProp;

const images: ImageCarousel[] = [
  {
    url: "/restaurant/restaurant1.webp",
    alt: "La Fattoria Restaurant Innenbereich 1",
  },
  {
    url: "/restaurant/restaurant2.webp",
    alt: "La Fattoria Restaurant Innenbereich 2",
  },
  {
    url: "/restaurant/restaurant3.webp",
    alt: "La Fattoria Restaurant Innenbereich 3",
  },
  {
    url: "/restaurant/restaurant4.webp",
    alt: "La Fattoria Restaurant Innenbereich 4",
  },
  {
    url: "/restaurant/restaurant5.webp",
    alt: "La Fattoria Restaurant Innenbereich 5",
  },
  {
    url: "/restaurant/restaurant6.webp",
    alt: "La Fattoria Restaurant Innenbereich 6",
  },
];

const links = ref<ButtonProps[]>([
  {
    label: "Tisch reservieren",
    to: "tel:+49610471427",
    color: "primary",
    variant: "subtle",
    trailingIcon: "i-lucide-phone",
  },
]);
</script>

<template>
  <UPageSection
    headline="ALTE SCHMIEDE"
    title="Restaurant"
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
        :autoplay="{ delay: 5000 }"
      >
        <img :src="item.url" :alt="item.alt" class="rounded-lg w-full">
      </UCarousel>
    </template>
  </UPageSection>
</template>
