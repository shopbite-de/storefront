<script setup>
const route = useRoute();
// Server route instead of queryCollection(): keeps the SQLite WASM client
// out of client-side navigations (#314).
const { data: page, error } = await useAsyncData(
  `landingpages-${route.path}`,
  () => $fetch("/api/content/page", { query: { path: route.path } }),
);

if (error.value || !page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: `Page ${route.path} not found!`,
    fatal: true,
  });
}

usePageSeo({
  title: page.value?.title,
  description: page.value?.description,
});
</script>

<template>
  <UContainer>
    <ContentRenderer v-if="page" :value="page" class="content my-8" />
  </UContainer>
</template>
