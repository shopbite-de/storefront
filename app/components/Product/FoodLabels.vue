<script setup lang="ts">
import type { Schemas } from "#shopware";
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
const props = defineProps<{ product: Schemas["Product"] }>();

const { site } = useRuntimeConfig().public;
const labels = computed(() =>
  getFoodLabels(
    props.product.sortedProperties as Schemas["PropertyGroup"][] | undefined,
  ),
);
const checked = computed(() => allergensChecked(props.product));
const text = computed(() => foodLabelText(labels.value));
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger as-child>
      <SbIconButton label="Allergene und Zusatzstoffe">
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
        <p class="mb-1 font-semibold">Allergene und Zusatzstoffe</p>
        <p class="text-sb-ink-muted">
          <template v-if="text">{{ text }}</template>
          <template v-else-if="checked"
            >Ohne kennzeichnungspflichtige Allergene und Zusatzstoffe.</template
          >
          <template v-else>
            Angaben erhalten Sie im Restaurant<template v-if="site.telephone"
              >:
              <a
                :href="toTelHref(site.telephone)"
                class="font-semibold text-sb-ink underline underline-offset-4"
                >{{ site.telephone }}</a
              ></template
            >.
          </template>
        </p>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
