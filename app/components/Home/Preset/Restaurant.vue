<script setup lang="ts">
/**
 * Restaurant band of the presets (#444): dark brand band with the first
 * gallery photo, title, text, the opening hours (in the SSR HTML, local
 * SEO #290), the gallery links and the address.
 */
type GalleryLink = { label: string; to: string };

const props = defineProps<{
  title?: string;
  description?: string;
  headline?: string;
  image?: string;
  links?: GalleryLink[];
}>();

const titleParts = computed(() => splitHighlight(props.title ?? ""));

const { site } = useRuntimeConfig().public;
const { businessHours, refresh } = useBusinessHours();
onServerPrefetch(() => refresh());

const openingHours = computed(() =>
  groupOpeningHours(businessHours.value ?? []),
);

const address = [
  site.address.street,
  [site.address.postalCode, site.address.city].filter(Boolean).join(" "),
]
  .filter(Boolean)
  .join(", ");
</script>

<template>
  <section
    id="restaurant"
    aria-labelledby="home-restaurant-title"
    class="bg-sb-band text-sb-on-band"
  >
    <div
      class="mx-auto grid max-w-[1248px] items-center gap-10 px-5 py-14 sm:px-8 sm:py-28 lg:grid-cols-2 lg:gap-20"
    >
      <img
        v-if="image"
        :src="image"
        alt=""
        loading="lazy"
        decoding="async"
        class="aspect-[4/3] w-full rounded-[20px] object-cover"
      />
      <div class="flex flex-col gap-5 font-body">
        <span
          v-if="headline"
          class="text-xs font-bold tracking-[0.14em] uppercase opacity-80"
          >{{ headline }}</span
        >
        <h2
          id="home-restaurant-title"
          class="font-display text-[34px] leading-[1.08] sm:text-[56px] sm:leading-[1.05]"
        >
          <template v-for="(part, index) in titleParts" :key="index">
            <span v-if="part.highlight" class="opacity-80">{{
              part.text
            }}</span>
            <template v-else>{{ part.text }}</template>
          </template>
        </h2>
        <p v-if="description" class="text-[17px] leading-relaxed opacity-85">
          {{ description }}
        </p>
        <dl
          v-if="openingHours.length"
          class="grid grid-cols-[auto_1fr] text-[15px] tabular-nums"
        >
          <template v-for="row in openingHours" :key="row.days">
            <dt class="border-b border-current/15 py-2.5">{{ row.days }}</dt>
            <dd class="border-b border-current/15 py-2.5 text-right">
              {{ row.intervals.length ? row.intervals.join(" · ") : "Ruhetag" }}
            </dd>
          </template>
        </dl>
        <div class="flex flex-col gap-2.5 pt-1 sm:flex-row sm:flex-wrap">
          <NuxtLink
            v-for="(link, index) in links ?? []"
            :key="link.to"
            :to="link.to"
            :class="[
              'inline-flex min-h-13 items-center justify-center gap-2 rounded-sb-control px-6 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sb-on-band',
              index === 0
                ? 'bg-sb-on-band text-sb-band'
                : 'border-[1.5px] border-current/40',
            ]"
          >
            {{ link.label }}
          </NuxtLink>
        </div>
        <p v-if="address" class="text-[14.5px] opacity-85">{{ address }}</p>
      </div>
    </div>
  </section>
</template>
