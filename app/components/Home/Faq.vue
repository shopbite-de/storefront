<script setup lang="ts">
import { buildFaqPageSchema } from "~/utils/schema";

// Frequently asked questions (#404). Native <details> instead of UAccordion:
// the answers are part of the SSR HTML for search engines and AI crawlers
// (Reka unmounts closed panels), and the section needs no JavaScript (#314).
const props = withDefaults(
  defineProps<{
    items: { question: string; answer: string }[];
    title?: string;
    description?: string;
    headline?: string;
  }>(),
  {
    title: "Häufige Fragen",
    description: undefined,
    headline: undefined,
  },
);

// Presets: two columns, questions in the display font (#444).

useHead(() => ({
  script: [
    {
      key: "jsonld-faq",
      type: "application/ld+json",
      innerHTML: JSON.stringify(buildFaqPageSchema(props.items)),
    },
  ],
}));
</script>

<template>
  <section
    id="faq"
    aria-labelledby="home-faq-title"
    class="mx-auto grid w-full max-w-(--sb-container) gap-8 px-4 py-14 font-body text-sb-ink sm:px-6 lg:px-8 sm:py-28 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20"
  >
    <div class="flex flex-col gap-4">
      <span
        v-if="headline"
        class="text-xs font-bold tracking-[0.14em] text-sb-accent uppercase"
        >{{ headline }}</span
      >
      <h2
        id="home-faq-title"
        class="font-display text-[32px] leading-tight sm:text-5xl"
      >
        {{ title }}
      </h2>
      <p v-if="description" class="text-sb-ink-muted">{{ description }}</p>
    </div>
    <div class="border-t-[1.5px] border-sb-ink" data-testid="faq">
      <details
        v-for="(item, index) in items"
        :key="item.question"
        class="group border-b border-sb-line"
        :open="index === 0"
      >
        <summary
          class="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-4 font-display text-xl sm:text-2xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sb-focus [&::-webkit-details-marker]:hidden"
        >
          {{ item.question }}
          <SbIcon
            name="plus"
            class="shrink-0 transition-transform group-open:rotate-45 motion-reduce:transition-none"
          />
        </summary>
        <p class="max-w-[620px] pb-5 leading-relaxed text-sb-ink">
          {{ item.answer }}
        </p>
      </details>
    </div>
  </section>
</template>
