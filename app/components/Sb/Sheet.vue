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
        class="fixed inset-0 z-50 bg-black/45 motion-safe:data-[state=open]:animate-[sb-fade-in_150ms_ease-out]"
      />
      <DialogContent
        class="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[calc(var(--sb-radius-card)+8px)] bg-sb-surface text-sb-ink shadow-2xl focus:outline-none md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[440px] md:rounded-none md:rounded-l-[calc(var(--sb-radius-card)+8px)] motion-safe:data-[state=open]:animate-[sb-sheet-in_200ms_ease-out]"
      >
        <div class="flex justify-center pt-2.5 md:hidden" aria-hidden="true">
          <span class="h-1 w-9 rounded-full bg-sb-line" />
        </div>
        <!-- A custom header (the product sheet's bon card) gets the full
             width below a toolbar with the actions and the close button:
             next to three 44 px buttons a long dish name broke after four
             letters on a 393 px phone. -->
        <header
          v-if="$slots.header"
          class="flex flex-col gap-2 px-5 pt-2 pb-2 md:pt-4"
        >
          <div class="flex items-center justify-end gap-2">
            <slot name="actions" />
            <DialogClose as-child>
              <SbIconButton label="Schließen">
                <SbIcon name="close" />
              </SbIconButton>
            </DialogClose>
          </div>
          <div class="min-w-0">
            <slot name="header" />
          </div>
        </header>
        <header v-else class="flex items-start gap-3 px-5 pt-3 pb-2 md:pt-6">
          <div class="min-w-0 flex-1">
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
          </div>
          <slot name="actions" />
          <DialogClose as-child>
            <SbIconButton label="Schließen">
              <SbIcon name="close" />
            </SbIconButton>
          </DialogClose>
        </header>
        <div
          class="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-5"
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
