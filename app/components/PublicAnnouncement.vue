<script setup lang="ts">
import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";

defineProps<{
  message?: string;
}>();
</script>

<template>
  <div
    v-if="message"
    class="bg-red-100 z-50 text-blackish flex p-8 gap-4 shadow-md rounded-md my-4"
  >
    <ExclamationTriangleIcon class="w-14 h-14 min-w-12" />
    <div>{{ message }}</div>
  </div>
</template>
