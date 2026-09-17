<script setup lang="ts">
import type {
  AssociationItem,
  AssociationItemProduct,
} from "~/types/Association";

// The extras are loaded by useProductDetail together with the product, so
// the list renders once and stays put when a variant is switched.
const props = defineProps<{
  associations: AssociationItem[];
}>();

const emit = defineEmits<{
  "extras-selected": [selectedExtras: AssociationItemProduct[]];
}>();

// Long extras lists made the quick view a long scroll: a group shows its first
// entries, the rest on request, and a search field once the list is long.
const PREVIEW_LIMIT = 6;
const SEARCH_THRESHOLD = 15;

const { getFormattedPrice } = useCommercePrice();

const selectedExtras = ref<AssociationItemProduct[]>([]);
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
const groupId = (index: number) => `${baseId}-extras-${index}`;

watch(selectedExtras, () => emit("extras-selected", selectedExtras.value));
</script>

<template>
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
