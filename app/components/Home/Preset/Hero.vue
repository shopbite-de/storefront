<script setup lang="ts">
/**
 * Hero of the presets, variant "editorial" (#444): kicker, headline with
 * the highlighted part in the accent colour, text, buttons and the store
 * status; on tablets and up a portrait photo with an arched top and the
 * Google rating on it. Phones get no photo and do not download it.
 */
type HeroLink = { label: string; to: string; target?: string };
type HeroUsp = {
  title?: string;
  subtitle?: string;
  icon?: string;
  link?: string;
};

const props = defineProps<{
  title: string;
  description?: string;
  headline?: string;
  poster?: string;
  links?: HeroLink[];
  usps?: HeroUsp[];
}>();

const titleParts = computed(() => splitHighlight(props.title));

// The Google usp of content/index.yml ("4.5 ⭐", "720+ Reviews") becomes
// the rating card.
const rating = computed(() => {
  const usp = props.usps?.find((item) => item.icon?.includes("google"));
  if (!usp) return null;
  const value = (usp.title ?? "").replace(/[^\d.,]/g, "").replace(".", ",");
  return value ? { value, label: usp.subtitle ?? "", link: usp.link } : null;
});

const { status } = useStoreStatus();
const { deliveryTime } = useShopBiteConfig();

const statusLabel = computed(() => {
  if (!status.value) return "";
  if (status.value.open) return `Jetzt geöffnet bis ${status.value.closesAt}`;
  return status.value.nextOpening
    ? `Geschlossen, öffnet ${status.value.nextOpening}`
    : "Geschlossen";
});

// 1×1 transparent GIF: phones keep the <img> but load nothing (#444).
const BLANK =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
</script>

<template>
  <section
    class="mx-auto grid max-w-[1248px] items-center gap-12 px-5 pt-8 pb-14 sm:px-8 sm:pt-16 sm:pb-20 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-[72px]"
  >
    <div class="flex flex-col gap-5 font-body text-sb-ink sm:gap-7">
      <div v-if="headline" class="flex items-center gap-3.5">
        <span
          class="text-xs font-bold tracking-[0.14em] text-sb-accent uppercase"
          >{{ headline }}</span
        >
        <span class="h-[1.5px] w-16 bg-sb-line" aria-hidden="true" />
      </div>
      <h1
        class="font-display text-[40px] leading-[1.05] sm:text-6xl lg:text-[76px] lg:leading-[1.02]"
      >
        <template v-for="(part, index) in titleParts" :key="index">
          <span v-if="part.highlight" class="text-sb-accent">{{
            part.text
          }}</span>
          <template v-else>{{ part.text }}</template>
        </template>
      </h1>
      <p
        v-if="description"
        class="max-w-[520px] text-base leading-relaxed sm:text-[19px]"
      >
        {{ description }}
      </p>
      <div
        v-if="links?.length"
        class="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap"
      >
        <SbButton
          v-for="(link, index) in links"
          :key="link.to"
          :to="link.to"
          :target="link.target"
          :variant="index === 0 ? 'primary' : 'secondary'"
          size="lg"
        >
          {{ link.label }}
          <template v-if="index === 0" #trailing
            ><SbIcon name="chevron-right"
          /></template>
        </SbButton>
      </div>
      <ClientOnly>
        <p
          v-if="statusLabel"
          class="flex flex-wrap items-center gap-x-5 gap-y-1 text-[14.5px]"
          role="status"
        >
          <span
            class="inline-flex items-center gap-2 font-bold"
            :class="status?.open ? 'text-sb-primary-ink' : ''"
          >
            <span
              class="size-2 rounded-full"
              :class="status?.open ? 'bg-sb-primary' : 'bg-sb-danger'"
              aria-hidden="true"
            />
            {{ statusLabel }}
          </span>
          <span>Lieferung ca. {{ deliveryTime }} Min</span>
        </p>
        <template #fallback>
          <span class="h-6" aria-hidden="true" />
        </template>
      </ClientOnly>
      <p
        v-if="rating"
        class="flex items-center gap-2 border-t border-sb-line pt-3 text-sm sm:hidden"
      >
        <span class="font-bold">{{ rating.value }} von 5</span>
        <span class="text-sb-ink-muted">· {{ rating.label }} bei Google</span>
      </p>
    </div>

    <div v-if="poster" class="relative hidden sm:block">
      <picture>
        <source media="(min-width: 640px)" :srcset="poster" />
        <img
          :src="BLANK"
          alt=""
          width="880"
          height="1100"
          fetchpriority="high"
          class="block aspect-[4/5] w-full rounded-[999px_999px_20px_20px] object-cover"
        />
      </picture>
      <component
        :is="rating.link ? 'a' : 'div'"
        v-if="rating"
        :href="rating.link"
        :target="rating.link ? '_blank' : undefined"
        :rel="rating.link ? 'noopener' : undefined"
        class="absolute bottom-10 -left-7 flex items-center gap-3.5 rounded-sb-card bg-sb-surface px-5 py-4 text-sb-ink shadow-xl focus-visible:outline-3 focus-visible:outline-sb-focus"
      >
        <span class="font-display text-4xl leading-none">{{
          rating.value
        }}</span>
        <span class="flex flex-col gap-0.5 text-[13px]">
          <span class="font-bold">von 5 bei Google</span>
          <span class="text-sb-ink-muted">{{ rating.label }}</span>
        </span>
      </component>
    </div>
  </section>
</template>
