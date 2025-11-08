<script setup lang="ts">
import type { ButtonProps } from "#ui/components/Button.vue";

defineProps<{
  title: string;
  description?: string | undefined;
  headline?: string | undefined;
  links: ButtonProps[];
}>();
</script>

<template>
  <div class="relative">
    <video
      autoplay
      loop
      muted
      playsinline
      class="absolute inset-0 w-full h-full object-cover -z-10"
    >
      <source
        src="https://shopware.shopbite.de/media/10/59/96/1762465181/background.mp4"
        type="video/mp4"
      >
    </video>
    <div class="bg-black/50 backdrop-blur-sm">
      <UPageHero
        :title="title"
        :description="description"
        :headline="headline"
        :links="links"
        orientation="vertical"
        :ui="{
          title: 'text-white',
          description: 'text-white',
        }"
      >
        <div class="flex flex-row gap-2 md:gap-8 justify-center">
          <NuxtLink
            to="https://www.google.com/maps/place/?q=place_id:ChIJJ-6VNfcTvUcR2r7Sax3SN2s"
            external
            target="_blank"
            class="flex items-center gap-2 px-4 rounded-lg hover:bg-white/20 transition-colors"
          >
            <UIcon name="i-simple-icons-google" class="text-white text-xl" />
            <div class="flex flex-col">
              <div class="flex items-center gap-1">
                <span class="text-white font-semibold">4.5</span>
                <UIcon name="i-lucide-star" class="text-white text-sm" />
              </div>
              <span class="text-white/80 text-xs">720+ Reviews</span>
            </div>
          </NuxtLink>

          <div class="flex items-center gap-2 px-4 py-2 rounded-lg">
            <UIcon name="i-lucide-award" class="text-white text-xl" />
            <div class="flex flex-col">
              <span class="text-white font-semibold">28 Jahre</span>
              <span class="text-white/80 text-xs">in Obertshausen</span>
            </div>
          </div>

          <div class="flex items-center gap-2 px-4 py-2 rounded-lg">
            <UIcon name="i-lucide-bike" class="text-white text-xl" />
            <div class="flex flex-col">
              <span class="text-white font-semibold">Lieferservice</span>
              <span class="text-white/80 text-xs">Schnell & zuverlässig</span>
            </div>
          </div>
        </div>
      </UPageHero>
    </div>
  </div>
</template>
