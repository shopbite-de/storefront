<script setup lang="ts">
import type { Schemas } from "#shopware";

defineProps<{
  filter: Schemas["PropertyGroup"];
  modelValue: string[];
}>();

defineEmits<{
  "update:modelValue": [value: string[]];
}>();
</script>

<template>
  <UCollapsible class="flex flex-col gap-2 w-48" :default-open="true">
    <UButton
      :label="filter.translated.name"
      color="neutral"
      variant="subtle"
      trailing-icon="i-lucide-chevron-down"
      block
      :ui="{
        trailingIcon:
          'group-data-[state=open]:rotate-180 transition-transform duration-200',
      }"
    />

    <template #content>
      <UCheckboxGroup
        :model-value="modelValue"
        :items="filter.options"
        value-key="id"
        label-key="translated.name"
        @update:model-value="$emit('update:modelValue', $event)"
      >
        <template
          v-if="
            (filter.displayType ?? filter.translated.displayType) === 'media'
          "
          #label="{ item }"
        >
          <div class="flex items-center gap-1.5">
            <NuxtImg
              v-if="item.media?.url"
              :src="item.media.url"
              :alt="item.translated.name"
              class="h-4 w-4 object-contain"
            />
            <span>{{ item.translated.name }}</span>
          </div>
        </template>
      </UCheckboxGroup>
    </template>
  </UCollapsible>
</template>
