<script setup>
const route = useRoute();
// Server route instead of queryCollection(): keeps the SQLite WASM client
// out of client-side navigations (#314).
const { data: page, error } = await useAsyncData(
  `landingpages-${route.path}`,
  () => $fetch("/api/content/page", { query: { path: route.path } }),
);

// A failing content server is a real error and stays fatal (logged); 4xx
// means there is no such page (the route rejects over-long paths with 400).
if ((error.value?.statusCode ?? 0) >= 500) {
  throw createError({
    statusCode: 500,
    statusMessage: "Page could not be loaded",
    fatal: true,
  });
}

if (!page.value) {
  throw createNotFoundError(`Page ${route.path} not found!`);
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
