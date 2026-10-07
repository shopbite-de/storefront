<script setup lang="ts">
/**
 * Label, hint and error around a form control (#440). The default slot
 * gets the ids to wire up: `id` for the control, `describedBy` for
 * `aria-describedby` and `invalid` for `aria-invalid`. Errors are words,
 * not only a red border (WCAG 3.3.1).
 */
const props = withDefaults(
  defineProps<{
    label: string;
    hint?: string;
    error?: string;
    /** marks the field as optional; required fields are not marked */
    optional?: boolean;
    hideLabel?: boolean;
  }>(),
  { hint: undefined, error: undefined, optional: false, hideLabel: false },
);

const id = useId();
const hintId = `${id}-hint`;
const errorId = `${id}-error`;

const describedBy = computed(
  () =>
    [props.error ? errorId : null, props.hint ? hintId : null]
      .filter(Boolean)
      .join(" ") || undefined,
);
</script>

<template>
  <div class="flex flex-col gap-1.5 font-body">
    <label
      :for="id"
      :class="hideLabel ? 'sr-only' : 'text-sm font-bold text-sb-ink'"
    >
      {{ label }}
      <span v-if="optional" class="font-medium text-sb-ink-muted"
        >(optional)</span
      >
    </label>
    <slot :id="id" :described-by="describedBy" :invalid="!!error" />
    <p
      v-if="error"
      :id="errorId"
      class="flex items-center gap-1.5 text-sm font-semibold text-sb-danger"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
      {{ error }}
    </p>
    <p v-if="hint" :id="hintId" class="text-[13px] text-sb-ink-muted">
      {{ hint }}
    </p>
  </div>
</template>
