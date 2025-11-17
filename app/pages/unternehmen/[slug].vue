<script setup>
const slug = useRoute().params.slug;
const { data } = await useAsyncData(`unternehmen-${slug}`, () => {
  return queryCollection("unternehmen").path(`/unternehmen/${slug}`).first();
});
</script>

<template>
  <UContainer>
    <ContentRenderer :value="data" class="content my-8" />
  </UContainer>
</template>

<style scoped>
@import "tailwindcss";
@import "@nuxt/ui";

:deep(.content h1) {
  @apply text-4xl font-bold mb-8 text-gray-900 dark:text-gray-100;
}

:deep(.content h2) {
  @apply text-2xl font-semibold mt-8 mb-4 text-gray-800 dark:text-gray-200;
}

:deep(.content h3) {
  @apply text-xl font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-200;
}

:deep(.content p) {
  @apply mb-4 text-gray-700 dark:text-gray-300 leading-relaxed;
}

:deep(.content ul),
:deep(.content ol) {
  @apply mb-4 ml-6 space-y-2;
}

:deep(.content li) {
  @apply text-gray-700 dark:text-gray-300 leading-relaxed;
}

:deep(.content ul li) {
  @apply list-disc;
}

:deep(.content ol li) {
  @apply list-decimal;
}

:deep(.content strong) {
  @apply font-semibold text-gray-900 dark:text-gray-100;
}

/* Unstyle links by default, keep subtle hover */
:deep(.content a) {
  @apply no-underline text-inherit transition-colors;
}
:deep(.content a:hover) {
  @apply text-primary;
}

:deep(.content section) {
  @apply mb-8;
}
</style>
