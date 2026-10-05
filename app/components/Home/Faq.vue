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
  <UPageSection
    id="faq"
    :title="title"
    :description="description"
    :headline="headline"
    :ui="{ container: 'py-12 sm:py-16 lg:py-20' }"
  >
    <div
      class="mx-auto w-full max-w-3xl divide-y divide-default rounded-xl ring ring-default"
      data-testid="faq"
    >
      <details v-for="item in items" :key="item.question" class="group">
        <summary
          class="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 font-semibold text-highlighted focus-visible:outline-2 focus-visible:outline-primary sm:px-6 [&::-webkit-details-marker]:hidden"
        >
          {{ item.question }}
          <UIcon
            name="i-lucide-chevron-down"
            class="size-5 shrink-0 text-muted transition-transform group-open:rotate-180"
          />
        </summary>
        <p class="px-4 pb-4 text-default sm:px-6">{{ item.answer }}</p>
      </details>
    </div>
  </UPageSection>
</template>
