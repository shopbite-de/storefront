<script setup lang="ts">
import type {
  AssociationItem,
  AssociationItemProduct,
} from "~/types/Association";

// The extras are loaded by useProductDetail together with the product, so
// the list renders once and stays put when a variant is switched.
const props = defineProps<{
  associations: AssociationItem[];
  // Product numbers of extras selected via the quick view URL (#411).
  initialExtras?: string[];
}>();

const emit = defineEmits<{
  "extras-selected": [selectedExtras: AssociationItemProduct[]];
}>();

// Long extras lists made the quick view a long scroll: a group shows its first
// entries, the rest on request, and a search field once the list is long.
const PREVIEW_LIMIT = 6;
const SEARCH_THRESHOLD = 15;

const { getFormattedPrice } = useCommercePrice();

// Each extra once, also if it is in several groups.
const selectedExtras = ref<AssociationItemProduct[]>([
  ...new Map(
    props.associations
      .flatMap((association) => association.products)
      .filter(
        (extra) =>
          extra.productNumber &&
          props.initialExtras?.includes(extra.productNumber),
      )
      .map((extra) => [extra.value, extra]),
  ).values(),
]);
// Only the first group starts open, the others show their selection summary.
const openGroups = ref<string[]>(
  props.associations[0] ? [props.associations[0].label] : [],
);
const expandedGroups = ref<string[]>([]);
const queries = ref<Record<string, string>>({});

const isSelected = (extra: AssociationItemProduct) =>
  selectedExtras.value.some((selected) => selected.value === extra.value);

function setSelected(extra: AssociationItemProduct, selected: boolean) {
  selectedExtras.value = selected
    ? [...selectedExtras.value, extra]
    : selectedExtras.value.filter((item) => item.value !== extra.value);
}

function toggleGroup(label: string) {
  openGroups.value = openGroups.value.includes(label)
    ? openGroups.value.filter((open) => open !== label)
    : [...openGroups.value, label];
}

function visibleProducts(association: AssociationItem) {
  const query = queries.value[association.label]?.trim().toLowerCase();
  if (query) {
    return association.products.filter((extra) =>
      extra.label.toLowerCase().includes(query),
    );
  }
  // Hiding one or two entries behind a button saves less than the button costs.
  const collapsed =
    association.products.length > PREVIEW_LIMIT + 2 &&
    !expandedGroups.value.includes(association.label);
  return collapsed
    ? association.products.slice(0, PREVIEW_LIMIT)
    : association.products;
}

function hiddenCount(association: AssociationItem) {
  if (queries.value[association.label]?.trim()) return 0;
  return association.products.length - visibleProducts(association).length;
}

function summary(association: AssociationItem) {
  const selected = association.products.filter(isSelected);
  if (selected.length === 0) return "optional";
  const price = selected.reduce(
    (sum, extra) => sum + (extra.unitPrice ?? 0),
    0,
  );
  return `${selected.length} gewählt · +${getFormattedPrice(price)}`;
}

const baseId = useId();

// Presets render the list with the base components (#442).
const { hasPreset } = useThemePreset();
const groupId = (index: number) => `${baseId}-extras-${index}`;

watch(selectedExtras, () => emit("extras-selected", selectedExtras.value), {
  immediate: selectedExtras.value.length > 0,
});
</script>

<template>
  <template v-if="hasPreset">
    <div
      v-for="(association, index) in associations"
      :key="association.label"
      class="flex flex-col"
    >
      <button
        type="button"
        class="flex min-h-11 items-center gap-2 text-start font-body text-sb-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sb-focus"
        :aria-expanded="openGroups.includes(association.label)"
        :aria-controls="groupId(index)"
        @click="toggleGroup(association.label)"
      >
        <SbIcon
          name="chevron-down"
          class="text-sb-ink-muted transition-transform motion-reduce:transition-none"
          :class="{ '-rotate-90': !openGroups.includes(association.label) }"
        />
        <span class="font-bold">{{ association.label }}</span>
        <span
          class="ms-auto rounded-full px-2.5 py-0.5 text-xs font-semibold"
          :class="
            association.products.some(isSelected)
              ? 'bg-sb-primary-tint text-sb-primary-ink'
              : 'bg-sb-muted text-sb-ink-muted'
          "
        >
          {{ summary(association) }}
        </span>
      </button>

      <div
        v-if="openGroups.includes(association.label)"
        :id="groupId(index)"
        class="flex flex-col pt-1"
      >
        <SbField
          v-if="association.products.length > SEARCH_THRESHOLD"
          v-slot="{ id }"
          :label="`${association.label} durchsuchen`"
          hide-label
          class="mb-1"
        >
          <SbInput
            :id="id"
            v-model="queries[association.label]"
            type="search"
            :placeholder="`${association.products.length} ${association.label} durchsuchen`"
          />
        </SbField>
        <div role="group" :aria-label="association.label">
          <SbCheckbox
            v-for="extra in visibleProducts(association)"
            :key="extra.value"
            :label="extra.label"
            :trailing="`+${extra.price}`"
            :model-value="isSelected(extra)"
            @update:model-value="setSelected(extra, $event)"
          />
        </div>
        <p
          v-if="
            queries[association.label]?.trim() &&
            visibleProducts(association).length === 0
          "
          class="py-2 text-sm text-sb-ink-muted"
          role="status"
        >
          Keine Treffer
        </p>
        <SbButton
          v-if="hiddenCount(association) > 0"
          variant="ghost"
          class="self-start"
          @click="expandedGroups = [...expandedGroups, association.label]"
        >
          Alle {{ association.products.length }} anzeigen
          <template #trailing><SbIcon name="chevron-down" /></template>
        </SbButton>
      </div>
    </div>
  </template>
  <template v-else>
    <div
      v-for="(association, index) in associations"
      :key="association.label"
      class="flex flex-col"
    >
      <button
        type="button"
        class="flex items-center gap-2 py-1 text-start"
        :aria-expanded="openGroups.includes(association.label)"
        :aria-controls="groupId(index)"
        @click="toggleGroup(association.label)"
      >
        <UIcon
          name="i-lucide-chevron-down"
          class="size-5 shrink-0 text-muted transition-transform"
          :class="{ '-rotate-90': !openGroups.includes(association.label) }"
        />
        <span class="font-semibold text-highlighted">{{
          association.label
        }}</span>
        <span
          class="ms-auto text-xs"
          :class="
            association.products.some(isSelected)
              ? 'font-medium text-primary'
              : 'text-muted'
          "
        >
          {{ summary(association) }}
        </span>
      </button>

      <div
        v-if="openGroups.includes(association.label)"
        :id="groupId(index)"
        class="flex flex-col gap-1 pt-2"
      >
        <UInput
          v-if="association.products.length > SEARCH_THRESHOLD"
          v-model="queries[association.label]"
          icon="i-lucide-search"
          :placeholder="`${association.label} durchsuchen`"
          :aria-label="`${association.label} durchsuchen`"
          class="mb-1 w-full"
        />
        <div
          class="flex flex-col divide-y divide-default"
          role="group"
          :aria-label="association.label"
        >
          <UCheckbox
            v-for="extra in visibleProducts(association)"
            :key="extra.value"
            variant="card"
            size="lg"
            :model-value="isSelected(extra)"
            :ui="{
              root: 'items-center rounded-none border-0 px-1 py-2.5',
              wrapper: 'ms-3',
              label: 'flex items-baseline justify-between gap-3 font-normal',
            }"
            @update:model-value="setSelected(extra, $event === true)"
          >
            <template #label>
              <span>{{ extra.label }}</span>
              <span class="shrink-0 text-sm text-muted tabular-nums">
                +{{ extra.price }}
              </span>
            </template>
          </UCheckbox>
        </div>
        <p
          v-if="
            queries[association.label]?.trim() &&
            visibleProducts(association).length === 0
          "
          class="py-2 text-sm text-muted"
        >
          Keine Treffer
        </p>
        <UButton
          v-if="hiddenCount(association) > 0"
          variant="link"
          color="primary"
          trailing-icon="i-lucide-chevron-down"
          class="self-start px-1"
          @click="expandedGroups = [...expandedGroups, association.label]"
        >
          Alle {{ association.products.length }} anzeigen
        </UButton>
      </div>
    </div>
  </template>
</template>
