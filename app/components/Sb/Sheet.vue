<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "reka-ui";

/**
 * Bottom sheet on phones, side panel from 768 px (#440). Built on Reka's
 * dialog: it traps the focus, closes with Esc and returns the focus to the
 * trigger. Mount it on first use (`v-if`), not with the page (#314).
 */
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    /** hide the title visually, it stays the dialog's accessible name */
    hideTitle?: boolean;
  }>(),
  { description: undefined, hideTitle: false },
);

const open = defineModel<boolean>("open", { default: false });
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-black/45 data-[state=open]:animate-[sb-fade-in_150ms_ease-out] motion-reduce:animate-none"
      />
      <DialogContent
        class="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[calc(var(--sb-radius-card)+8px)] bg-sb-surface text-sb-ink shadow-2xl focus:outline-none md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[440px] md:rounded-none md:rounded-l-[calc(var(--sb-radius-card)+8px)] data-[state=open]:animate-[sb-sheet-in_200ms_ease-out] motion-reduce:animate-none"
      >
        <div class="flex justify-center pt-2.5 md:hidden" aria-hidden="true">
          <span class="h-1 w-9 rounded-full bg-sb-line" />
        </div>
        <header class="flex items-start gap-3 px-5 pt-3 pb-2 md:pt-6">
          <div class="min-w-0 flex-1">
            <slot name="header">
              <DialogTitle
                :class="
                  hideTitle
                    ? 'sr-only'
                    : 'font-display text-2xl leading-tight text-sb-ink'
                "
              >
                {{ title }}
              </DialogTitle>
              <DialogDescription
                v-if="description"
                class="mt-1 text-sm text-sb-ink-muted"
              >
                {{ description }}
              </DialogDescription>
            </slot>
          </div>
          <slot name="actions" />
          <DialogClose as-child>
            <SbIconButton label="Schließen">
              <SbIcon name="close" />
            </SbIconButton>
          </DialogClose>
        </header>
        <div
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5"
        >
          <slot />
        </div>
        <footer
          v-if="$slots.footer"
          class="border-t border-sb-line bg-sb-surface px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          <slot name="footer" />
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
