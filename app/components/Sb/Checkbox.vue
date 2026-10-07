<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from "reka-ui";

/**
 * Checkbox row with label and optional trailing text, e.g. an extra with
 * its surcharge (#440). The whole row is the label, at least 48 px high.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    /** shown at the end of the row, e.g. "+1,00 €" */
    trailing?: string;
    /** second line under the label */
    description?: string;
    disabled?: boolean;
    /** without the bottom rule, e.g. as a single checkbox in a form */
    plain?: boolean;
    /** fixed id, e.g. for links from an error summary */
    id?: string;
    invalid?: boolean;
    describedBy?: string;
  }>(),
  {
    trailing: undefined,
    description: undefined,
    disabled: false,
    plain: false,
    id: undefined,
    invalid: false,
    describedBy: undefined,
  },
);

const model = defineModel<boolean>({ default: false });
const generatedId = useId();
const id = computed(() => props.id ?? generatedId);
</script>

<template>
  <div
    :class="[
      'flex min-h-12 items-center gap-3 font-body text-[15px] text-sb-ink',
      plain ? '' : 'border-b border-sb-line',
    ]"
  >
    <CheckboxRoot
      :id="id"
      v-model="model"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      :aria-describedby="describedBy"
      class="flex size-[22px] shrink-0 items-center justify-center rounded-md border-2 border-sb-control bg-sb-surface text-sb-on-primary transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sb-focus aria-invalid:border-sb-danger data-[state=checked]:border-sb-primary data-[state=checked]:bg-sb-primary"
      :class="description ? 'mt-3.5 self-start' : 'self-center'"
    >
      <CheckboxIndicator>
        <SbIcon name="check" :size="14" />
      </CheckboxIndicator>
    </CheckboxRoot>
    <label :for="id" class="flex flex-1 cursor-pointer items-center gap-3 py-3">
      <span class="flex flex-1 flex-col gap-0.5">
        <span
          ><slot>{{ label }}</slot></span
        >
        <span v-if="description" class="text-[13px] text-sb-ink-muted">{{
          description
        }}</span>
      </span>
      <span v-if="trailing" class="text-sb-ink-muted tabular-nums">{{
        trailing
      }}</span>
    </label>
  </div>
</template>
