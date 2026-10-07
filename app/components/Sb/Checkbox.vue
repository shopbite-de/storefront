<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from "reka-ui";

/**
 * Checkbox row with label and optional trailing text, e.g. an extra with
 * its surcharge (#440). The whole row is the label, at least 48 px high.
 */
withDefaults(
  defineProps<{
    label: string;
    /** shown at the end of the row, e.g. "+1,00 €" */
    trailing?: string;
    disabled?: boolean;
  }>(),
  { trailing: undefined, disabled: false },
);

const model = defineModel<boolean>({ default: false });
const id = useId();
</script>

<template>
  <div
    class="flex min-h-12 items-center gap-3 border-b border-sb-line font-body text-[15px] text-sb-ink"
  >
    <CheckboxRoot
      :id="id"
      v-model="model"
      :disabled="disabled"
      class="flex size-[22px] shrink-0 items-center justify-center rounded-md border-2 border-sb-control bg-sb-surface text-sb-on-primary transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sb-focus data-[state=checked]:border-sb-primary data-[state=checked]:bg-sb-primary"
    >
      <CheckboxIndicator>
        <SbIcon name="check" :size="14" />
      </CheckboxIndicator>
    </CheckboxRoot>
    <label :for="id" class="flex flex-1 cursor-pointer items-center gap-3 py-3">
      <span class="flex-1">{{ label }}</span>
      <span v-if="trailing" class="text-sb-ink-muted tabular-nums">{{
        trailing
      }}</span>
    </label>
  </div>
</template>
