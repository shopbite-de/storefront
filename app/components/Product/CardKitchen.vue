<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  sortedProperties: Schemas["PropertyGroup"][] | undefined;
}>();

const kitchen = computed<
  { name: string; mediaUrl?: string; isImage: boolean } | undefined
>(() => {
  const group = props.sortedProperties?.find(
    (propertyGroup) => propertyGroup.translated.name === "Küche",
  );

  const option = group?.options?.[0];
  if (!option) return undefined;

  return {
    name: option.translated.name,
    mediaUrl: option.media?.url,
    isImage: (group?.displayType ?? group?.translated.displayType) === "media",
  };
});
</script>

<template>
  <NuxtImg
    v-if="kitchen?.isImage && kitchen.mediaUrl"
    :src="kitchen.mediaUrl"
    :alt="kitchen.name"
    class="h-4 w-4 object-contain"
  />
  <span v-else-if="kitchen">{{ kitchen.name }}</span>
</template>
