<script setup lang="ts">
/**
 * Text input in the preset style (#440), 50 px high, 16 px text so iOS
 * does not zoom in. Use inside SbField and bind its `id`, `describedBy`
 * and `invalid`.
 */
withDefaults(
  defineProps<{
    invalid?: boolean;
  }>(),
  { invalid: false },
);

const model = defineModel<string>({ default: "" });
</script>

<template>
  <input
    v-model="model"
    :aria-invalid="invalid || undefined"
    class="min-h-[50px] w-full rounded-sb-control border-[1.5px] border-sb-control bg-sb-surface px-3.5 font-body text-base text-sb-ink placeholder:text-sb-ink-muted focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-sb-focus aria-invalid:border-sb-danger"
  />
</template>
