<script setup lang="ts">
import type { Extra, ExtraGroup } from "../../../shared/domain";

// The extras come with the dish sheet (DishDetail), so the list renders
// once and stays put when a variant is switched.
const props = defineProps<{
  groups: readonly ExtraGroup[];
  // Menu numbers of extras selected via the dish sheet URL (#411).
  initialExtras?: string[];
}>();

const emit = defineEmits<{
  "extras-selected": [selectedExtras: Extra[]];
}>();

// Long extras lists made the quick view a long scroll: a group shows its first
// entries, the rest on request, and a search field once the list is long.
const PREVIEW_LIMIT = 6;
const SEARCH_THRESHOLD = 15;

const { getFormattedMoney } = useCommercePrice();

// Each extra once, also if it is in several groups.
const selectedExtras = ref<Extra[]>([
  ...new Map(
    props.groups
      .flatMap((group) => group.extras)
      .filter((extra) => props.initialExtras?.includes(extra.number))
      .map((extra) => [extra.id, extra]),
  ).values(),
]);
// Only the first group starts open, the others show their selection summary.
const openGroups = ref<string[]>(props.groups[0] ? [props.groups[0].name] : []);
const expandedGroups = ref<string[]>([]);
const queries = ref<Record<string, string>>({});

const isSelected = (extra: Extra) =>
  selectedExtras.value.some((selected) => selected.id === extra.id);

function setSelected(extra: Extra, selected: boolean) {
  selectedExtras.value = selected
    ? [...selectedExtras.value, extra]
    : selectedExtras.value.filter((item) => item.id !== extra.id);
}

function toggleGroup(label: string) {
  openGroups.value = openGroups.value.includes(label)
    ? openGroups.value.filter((open) => open !== label)
    : [...openGroups.value, label];
}

function visibleExtras(group: ExtraGroup) {
  const query = queries.value[group.name]?.trim().toLowerCase();
  if (query) {
    return group.extras.filter((extra) =>
      extra.name.toLowerCase().includes(query),
    );
  }
  // Hiding one or two entries behind a button saves less than the button costs.
  const collapsed =
    group.extras.length > PREVIEW_LIMIT + 2 &&
    !expandedGroups.value.includes(group.name);
  return collapsed ? group.extras.slice(0, PREVIEW_LIMIT) : group.extras;
}

function hiddenCount(group: ExtraGroup) {
  if (queries.value[group.name]?.trim()) return 0;
  return group.extras.length - visibleExtras(group).length;
}

function summary(group: ExtraGroup) {
  const selected = group.extras.filter(isSelected);
  const [first] = selected;
  if (!first) return "optional";
  const price = sumMoney(
    selected.map((extra) => extra.price),
    first.price.currency,
  );
  return `${selected.length} gewählt · +${getFormattedMoney(price)}`;
}

const baseId = useId();

// Presets render the list with the base components (#442).
const groupId = (index: number) => `${baseId}-extras-${index}`;

watch(selectedExtras, () => emit("extras-selected", selectedExtras.value), {
  immediate: selectedExtras.value.length > 0,
});
</script>

<template>
  <div>
    <div v-for="(group, index) in groups" :key="group.id" class="flex flex-col">
      <button
        type="button"
        class="flex min-h-11 items-center gap-2 text-start font-body text-sb-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sb-focus"
        :aria-expanded="openGroups.includes(group.name)"
        :aria-controls="groupId(index)"
        @click="toggleGroup(group.name)"
      >
        <SbIcon
          name="chevron-down"
          class="text-sb-ink-muted transition-transform motion-reduce:transition-none"
          :class="{ '-rotate-90': !openGroups.includes(group.name) }"
        />
        <span class="font-bold">{{ group.name }}</span>
        <span
          class="ms-auto rounded-full px-2.5 py-0.5 text-xs font-semibold"
          :class="
            group.extras.some(isSelected)
              ? 'bg-sb-primary-tint text-sb-primary-ink'
              : 'bg-sb-muted text-sb-ink-muted'
          "
        >
          {{ summary(group) }}
        </span>
      </button>

      <div
        v-if="openGroups.includes(group.name)"
        :id="groupId(index)"
        class="flex flex-col pt-1"
      >
        <SbField
          v-if="group.extras.length > SEARCH_THRESHOLD"
          v-slot="{ id }"
          :label="`${group.name} durchsuchen`"
          hide-label
          class="mb-1"
        >
          <SbInput
            :id="id"
            v-model="queries[group.name]"
            type="search"
            :placeholder="`${group.extras.length} ${group.name} durchsuchen`"
          />
        </SbField>
        <div role="group" :aria-label="group.name">
          <SbCheckbox
            v-for="extra in visibleExtras(group)"
            :key="extra.id"
            :label="extra.name"
            :trailing="`+${getFormattedMoney(extra.price)}`"
            :model-value="isSelected(extra)"
            @update:model-value="setSelected(extra, $event)"
          />
        </div>
        <p
          v-if="
            queries[group.name]?.trim() && visibleExtras(group).length === 0
          "
          class="py-2 text-sm text-sb-ink-muted"
          role="status"
        >
          Keine Treffer
        </p>
        <SbButton
          v-if="hiddenCount(group) > 0"
          variant="ghost"
          class="self-start"
          @click="expandedGroups = [...expandedGroups, group.name]"
        >
          Alle {{ group.extras.length }} anzeigen
          <template #trailing><SbIcon name="chevron-down" /></template>
        </SbButton>
      </div>
    </div>
  </div>
</template>
