<script setup lang="ts">
import type { FoodLabels } from "../../../shared/domain";
import {
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from "reka-ui";

/**
 * Allergens and additives of a dish behind an info button in the sheet's
 * toolbar (#500): reachable before ordering, shown only to guests who look
 * for them. Without the restaurant's confirmation an empty list is "not
 * entered yet", so it never claims "free of allergens" then and points to
 * the phone (#485). The content stays inside the sheet (no teleport), so
 * the dialog's focus trap keeps working.
 */
const props = defineProps<{ labels: FoodLabels }>();

const { site } = useRuntimeConfig().public;
const checked = computed(() => props.labels.checked);
const { t } = useI18n();
const text = computed(() => foodLabelText(props.labels, t));
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger as-child>
      <SbIconButton :label="$t('menu.foodLabels.title')">
        <SbIcon name="info" />
      </SbIconButton>
    </PopoverTrigger>
    <PopoverPortal disabled>
      <PopoverContent
        side="bottom"
        align="end"
        :side-offset="6"
        :collision-padding="16"
        class="z-50 w-72 max-w-[calc(100vw-32px)] rounded-sb-card border border-sb-line bg-sb-surface p-4 text-sm text-sb-ink shadow-lg focus-visible:outline-none"
        data-testid="food-labels"
      >
        <p class="mb-1 font-semibold">{{ $t("menu.foodLabels.title") }}</p>
        <p class="text-sb-ink-muted">
          <template v-if="text">{{ text }}</template>
          <template v-else-if="checked">{{
            $t("menu.foodLabels.none")
          }}</template>
          <i18n-t
            v-else-if="site.telephone"
            keypath="menu.foodLabels.askWithPhone"
          >
            <template #phone>
              <a
                :href="toTelHref(site.telephone)"
                class="font-semibold text-sb-ink underline underline-offset-4"
                >{{ site.telephone }}</a
              >
            </template>
          </i18n-t>
          <template v-else>{{ $t("menu.foodLabels.ask") }}</template>
        </p>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
