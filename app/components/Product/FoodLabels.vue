<script setup lang="ts">
import type { Schemas } from "#shopware";

/**
 * Allergens and additives in the product sheet (#485). Without the
 * restaurant's confirmation an empty list is "not entered yet", so the
 * sheet never claims "free of allergens" then and points to the phone.
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
  <p class="text-sm text-sb-ink-muted" data-testid="food-labels">
    <template v-if="text">{{ text }}</template>
    <template v-else-if="checked"
      >Ohne kennzeichnungspflichtige Allergene und Zusatzstoffe.</template
    >
    <template v-else>
      Angaben zu Allergenen und Zusatzstoffen erhalten Sie im
      Restaurant<template v-if="site.telephone"
        >:
        <a
          :href="toTelHref(site.telephone)"
          class="font-semibold text-sb-ink underline underline-offset-4"
          >{{ site.telephone }}</a
        ></template
      >.
    </template>
  </p>
</template>
