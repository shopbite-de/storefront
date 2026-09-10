<script setup lang="ts">
import type { ButtonProps } from "#ui/components/Button.vue";

const props = withDefaults(
  defineProps<{
    title: string;
    description?: string;
    headline?: string;
    backgroundVideo?: string;
    /** First frame of the video as an image; the LCP element (#273). */
    poster?: string;
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
    poster: undefined,
    usps: () => [],
  },
);

// The poster is server-rendered and preloaded, so the largest paint is a
// small image instead of a multi-megabyte video. The video only joins on
// wide screens after hydration; phones never request it (#273).
const VIDEO_MEDIA_QUERY = "(min-width: 768px)";
const showVideo = ref(false);
const videoRef = ref<HTMLVideoElement>();

useHead(() => ({
  link: props.poster
    ? [
        {
          key: "hero-poster-preload",
          rel: "preload",
          as: "image",
          href: props.poster,
          fetchpriority: "high",
        },
      ]
    : [],
}));

onMounted(() => {
  const wide = props.backgroundVideo
    ? window.matchMedia?.(VIDEO_MEDIA_QUERY)
    : undefined;
  if (wide) {
    showVideo.value = wide.matches;
    wide.addEventListener("change", (event) => {
      showVideo.value = event.matches;
    });
  }

  // Handle video playback on bfcache restore
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && videoRef.value) {
      videoRef.value.play();
    }
  });
});
</script>

<template>
  <div class="relative isolate overflow-hidden">
    <!-- No CSS blur on the poster: blur the image file itself (see docs);
         a filter on a full-screen image delays the first paint on phones. -->
    <img
      v-if="poster"
      :src="poster"
      alt=""
      fetchpriority="high"
      class="absolute inset-0 w-full h-full object-cover -z-20"
    />
    <video
      v-if="showVideo"
      ref="videoRef"
      autoplay
      loop
      muted
      playsinline
      preload="metadata"
      :poster="poster"
      class="absolute inset-0 w-full h-full object-cover -z-10 blur-sm scale-105"
    >
      <source :src="backgroundVideo" type="video/mp4" />
    </video>
    <div class="bg-black/50">
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
            class="flex flex-col md:flex-row items-center text-center md:text-left gap-2"
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
