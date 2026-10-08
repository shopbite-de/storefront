<script setup lang="ts">
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from "reka-ui";

/**
 * Confirmation for actions that cannot be undone (#445), e.g. deleting the
 * customer account. Reka's alert dialog traps the focus and starts on
 * "Abbrechen"; the confirm button runs `confirm` and the dialog stays open
 * until the caller closes it, so a failure can show inside.
 */
withDefaults(
  defineProps<{
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel?: string;
    loading?: boolean;
  }>(),
  { cancelLabel: "Abbrechen", loading: false },
);

const emit = defineEmits<{ confirm: [] }>();
const open = defineModel<boolean>("open", { default: false });
</script>

<template>
  <AlertDialogRoot v-model:open="open">
    <AlertDialogPortal>
      <AlertDialogOverlay
        class="fixed inset-0 z-50 bg-black/45 motion-safe:data-[state=open]:animate-[sb-fade-in_150ms_ease-out]"
      />
      <AlertDialogContent
        class="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-sb-card bg-sb-surface p-6 font-body text-sb-ink shadow-2xl focus:outline-none motion-safe:data-[state=open]:animate-[sb-fade-in_150ms_ease-out]"
      >
        <AlertDialogTitle class="font-display text-2xl leading-tight">
          {{ title }}
        </AlertDialogTitle>
        <AlertDialogDescription class="text-sb-ink-muted">
          {{ description }}
        </AlertDialogDescription>
        <slot />
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <AlertDialogCancel as-child>
            <SbButton variant="secondary">{{ cancelLabel }}</SbButton>
          </AlertDialogCancel>
          <SbButton :loading="loading" @click="emit('confirm')">{{
            confirmLabel
          }}</SbButton>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
