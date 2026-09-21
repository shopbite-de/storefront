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
    /** The first link is the one primary action, the others are quiet (#327). */
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

// Live status line: opening state from the business hours (client only, the
// browser's clock decides, #275) and the delivery time from the plugin.
const { status } = useStoreStatus();
const { deliveryTime, isCheckoutEnabled } = useShopBiteConfig();

const statusLabel = computed(() => {
  if (!status.value) return undefined;
  if (status.value.open) return `Geöffnet bis ${status.value.closesAt}`;
  return status.value.nextOpening
    ? `Geschlossen · öffnet ${status.value.nextOpening}`
    : "Geschlossen";
});

const primaryLink = computed(() => props.links[0]);
const secondaryLinks = computed(() => props.links.slice(1));
</script>

<template>
  <!-- Direction A of the canvas "Startseite Hero": full-bleed photo with a
       bottom-to-top gradient instead of a flat overlay, the content bottom
       left inside the container width, one primary action (#327). -->
  <div
    class="relative isolate flex min-h-[520px] flex-col justify-end overflow-hidden bg-neutral-950 sm:min-h-[560px]"
  >
    <!-- No CSS blur on the poster: blur the image file itself (see docs);
           a filter on a full-screen image delays the first paint on phones. -->
    <img
      v-if="poster"
      :src="poster"
      alt=""
      fetchpriority="high"
      class="absolute inset-0 -z-20 h-full w-full object-cover"
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
      class="absolute inset-0 -z-10 h-full w-full scale-105 object-cover blur-sm"
    >
      <source :src="backgroundVideo" type="video/mp4" />
    </video>
    <div
      class="absolute inset-0 -z-10 bg-gradient-to-b from-neutral-950/15 via-neutral-950/35 to-neutral-950/85"
      aria-hidden="true"
    />

    <UContainer>
      <div
        class="flex max-w-2xl flex-col gap-4 py-6 text-white sm:gap-5 sm:py-10 lg:py-14"
      >
        <div
          v-if="usps.length > 0"
          class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
        >
          <component
            :is="usp.link ? 'a' : 'span'"
            v-for="(usp, index) in usps"
            :key="index"
            :href="usp.link"
            :target="usp.link ? '_blank' : undefined"
            :rel="usp.link ? 'noopener' : undefined"
            class="inline-flex items-center gap-1.5 text-white/90"
          >
            <UIcon v-if="usp.icon" :name="usp.icon" class="size-4 shrink-0" />
            <span v-if="usp.title" class="font-semibold text-white">
              {{ usp.title }}
            </span>
            <span v-if="usp.subtitle" class="text-white/80">
              {{ usp.subtitle }}
            </span>
          </component>
        </div>

        <div class="flex flex-col gap-2">
          <span
            v-if="headline"
            class="text-xs font-semibold tracking-widest text-white/80 uppercase"
          >
            {{ headline }}
          </span>
          <h1
            class="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl"
          >
            {{ title }}
          </h1>
          <p
            v-if="description"
            class="text-base text-pretty text-white/90 sm:text-lg"
          >
            {{ description }}
          </p>
        </div>

        <!-- Fixed height: the status arrives after mounting (#327, #365).
             Phones get one row each for status and delivery, so a long
             status cannot wrap the line; from sm both share one row and the
             delivery time waits for the status. -->
        <div
          class="grid items-center text-sm text-white/90 sm:flex sm:min-h-6 sm:gap-x-4"
          :class="
            isCheckoutEnabled
              ? 'grid-rows-[1.5rem_1.5rem]'
              : 'grid-rows-[1.5rem]'
          "
          aria-live="polite"
        >
          <span
            v-if="statusLabel"
            class="row-start-1 flex min-w-0 items-center gap-2"
            data-testid="hero-status"
          >
            <span
              class="size-2 shrink-0 rounded-full"
              :class="
                status?.open
                  ? 'bg-green-400 shadow-[0_0_0_3px_rgba(74,222,128,0.3)]'
                  : 'bg-neutral-400'
              "
              aria-hidden="true"
            />
            <span class="truncate">{{ statusLabel }}</span>
          </span>
          <span
            v-if="isCheckoutEnabled"
            class="row-start-2 inline-flex items-center gap-1.5"
            :class="{ 'sm:hidden': !statusLabel }"
            data-testid="hero-delivery"
          >
            <UIcon name="i-lucide-bike" class="size-4" />
            Lieferung ca. {{ deliveryTime }} Min
          </span>
        </div>

        <div
          v-if="links.length > 0"
          class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
        >
          <UButton
            v-if="primaryLink"
            v-bind="primaryLink"
            color="primary"
            variant="solid"
            size="xl"
            class="justify-center px-6 shadow-lg shadow-primary/30"
          />
          <UButton
            v-for="(link, index) in secondaryLinks"
            :key="index"
            v-bind="link"
            color="neutral"
            variant="ghost"
            size="xl"
            class="justify-center bg-transparent text-white hover:bg-white/10 active:bg-white/10"
          />
        </div>
      </div>
    </UContainer>
  </div>
</template>
