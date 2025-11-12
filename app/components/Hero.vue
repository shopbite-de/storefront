<script setup lang="ts">
import type { ButtonProps } from "#ui/components/Button.vue";

withDefaults(
  defineProps<{
    title: string;
    description?: string;
    headline?: string;
    backgroundVideo?: string;
    links: ButtonProps[];
    usps?: {
      title?: string;
      subtitle?: string;
      icon?: string;
      link?: string;
    }[];
  }>(),
  {
    description: undefined,
    headline: undefined,
    backgroundVideo: undefined,
    usps: () => [],
  },
);
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
      <source :src="backgroundVideo" type="video/mp4" >
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
        <div v-if="usps" class="flex flex-row gap-2 md:gap-8 justify-center">
          <ULink
            v-for="(usp, index) in usps"
            :key="index"
            as="button"
            :to="usp.link ?? ''"
            class="flex items-center text-left gap-2"
            target="_blank"
          >
            <UIcon
              v-if="usp.icon"
              :name="usp.icon"
              class="text-white text-xl"
            />
            <div class="flex flex-col">
              <span v-if="usp.title" class="text-white font-semibold">{{
                usp.title
              }}</span>
              <span v-if="usp.subtitle" class="text-white/80 text-xs">{{
                usp.subtitle
              }}</span>
            </div>
          </ULink>
        </div>
      </UPageHero>
    </div>
  </div>
</template>
