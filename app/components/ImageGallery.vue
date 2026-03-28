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
      <ClientOnly>
        <UCarousel
          v-slot="{ item, index }"
          arrows
          :items="images"
          class="w-full max-w-2xl mx-auto"
        >
          <img
            :src="item.image"
            :alt="item.alt"
            :fetchpriority="index === 0 ? 'high' : 'auto'"
            class="rounded-lg"
          />
        </UCarousel>
        <template #fallback>
          <div class="w-full max-w-2xl mx-auto">
            <img
              v-if="images?.[0]"
              :src="images[0].image"
              :alt="images[0].alt"
              fetchpriority="high"
              class="rounded-lg"
            />
          </div>
        </template>
      </ClientOnly>
    </template>
  </UPageSection>
</template>
