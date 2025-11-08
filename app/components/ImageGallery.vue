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
    url: "https://shopware.shopbite.de/media/71/2a/1a/1762465670/restaurant1.webp",
    alt: "La Fattoria Restaurant Innenbereich 1",
  },
  {
    url: "https://shopware.shopbite.de/media/61/ea/77/1762465670/restaurant2.webp",
    alt: "La Fattoria Restaurant Innenbereich 2",
  },
  {
    url: "https://shopware.shopbite.de/media/6d/ac/ca/1762465670/restaurant3.webp",
    alt: "La Fattoria Restaurant Innenbereich 3",
  },
  {
    url: "https://shopware.shopbite.de/media/af/d6/da/1762465670/restaurant4.webp",
    alt: "La Fattoria Restaurant Innenbereich 4",
  },
  {
    url: "https://shopware.shopbite.de/media/6a/ff/e2/1762465670/restaurant5.webp",
    alt: "La Fattoria Restaurant Innenbereich 5",
  },
  {
    url: "https://shopware.shopbite.de/media/80/76/d0/1762465670/restaurant6.webp",
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
  <UPageSection headline="ALTE SCHMIEDE" title="Restaurant" :links="links">
    <template #body>
      <UCarousel
        v-slot="{ item }"
        :items="images"
        class="mx-auto w-full"
        auto-height
        arrows
        loop
      >
        <img :src="item.url" :alt="item.alt" class="rounded-lg w-full" >
      </UCarousel>
    </template>
  </UPageSection>
</template>
