<script setup lang="ts">
interface Props {
  size?: "sm" | "md" | "lg";
  text?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  text: "Loading...",
});

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
} as const;

const spinnerSize = computed(() => sizeClasses[props.size]);
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 p-8">
    <div
      class="animate-spin rounded-full border-2 border-gray-300 border-t-primary"
      :class="spinnerSize"
    />
    <p v-if="text" class="text-gray-600">{{ text }}</p>
  </div>
</template>
