<script setup>
const route = useRoute();
const { data: page, error } = await useAsyncData(
  `landingpages-${route.path}`,
  () => {
    return queryCollection("landingpages").path(route.path).first();
  },
);

if (error.value || !page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: `Page ${route.path} not found!`,
    fatal: true,
  });
}

useSeoMeta({
  title: page.value?.title,
  description: page.value?.description,
});
</script>

<template>
  <UContainer>
    <ContentRenderer v-if="page" :value="page" class="content my-8" />
  </UContainer>
</template>
