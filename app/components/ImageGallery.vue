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

// The gallery sits below the fold: a fixed aspect ratio reserves the space
// (no layout shift) and the slides load lazily (#273).
const imageClass = "aspect-[4/3] w-full rounded-lg object-cover";
</script>

<template>
  <UPageSection
    :title="title"
    :description="description"
    :headline="headline"
    :links="links"
  >
    <template #body>
      <ClientOnly>
        <UCarousel
          v-slot="{ item }"
          arrows
          :items="images"
          class="w-full max-w-2xl mx-auto"
        >
          <img
            :src="item.image"
            :alt="item.alt"
            loading="lazy"
            decoding="async"
            :class="imageClass"
          />
        </UCarousel>
        <template #fallback>
          <div class="w-full max-w-2xl mx-auto">
            <img
              v-if="images?.[0]"
              :src="images[0].image"
              :alt="images[0].alt"
              loading="lazy"
              decoding="async"
              :class="imageClass"
            />
          </div>
        </template>
      </ClientOnly>
    </template>
  </UPageSection>
</template>
