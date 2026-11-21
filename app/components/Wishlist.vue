<script setup lang="ts">
import type { LocationQueryRaw } from "vue-router";
import type { Dish, DishDetail, Extra } from "../../shared/domain";
import type { WishlistEntry } from "~/composables/useWishlistEntries";
import type { OrderableDish } from "~/utils/dish";
import { withQuickViewConfiguration } from "~/utils/productUrl";

/**
 * The wishlist with configured dishes (#467). Each row names the dish with
 * its configuration ("+Extra Salami, ohne Pilze"), shows today's price of
 * dish and extras, adds it to the cart as the dish sheet would (same
 * container line item, `useAddToCart`) and opens the sheet with the saved
 * configuration ("Anpassen", the dish sheet URL of #411 on this page). The
 * dishes come from the BFF's dish sheets (`/api/menu/dishes/[dishId]`).
 */
withDefaults(defineProps<{ showMenuButton?: boolean }>(), {
  showMenuButton: false,
});

const route = useRoute();
const { getFormattedMoney } = useCommercePrice();
const { entries, loaded, remove, clear } = useWishlistEntries();
const {
  setSelectedDish,
  setSelectedExtras,
  setRemovedIngredients,
  selectedQuantity,
  addToCart,
} = useAddToCart();

/** The dish sheet of each saved dish or variant, by its id. */
const details = ref<Record<string, DishDetail>>({});
const loadingDishes = ref(false);

async function loadDishes(list: WishlistEntry[]) {
  const ids = [...new Set(list.map((entry) => entry.productId))];
  if (!ids.length) {
    details.value = {};
    return;
  }
  loadingDishes.value = true;
  try {
    const answers = await Promise.allSettled(
      ids.map((id) => $fetch<DishDetail>(`/api/menu/dishes/${id}`)),
    );
    const found: Record<string, DishDetail> = {};
    answers.forEach((answer, index) => {
      if (answer.status === "fulfilled") found[ids[index]!] = answer.value;
      // a dish taken off the menu leaves its row out
      else console.error("[wishlist][loadDishes]", answer.reason);
    });
    details.value = found;
  } finally {
    loadingDishes.value = false;
  }
}

watch(
  () => entries.value.map((entry) => entry.id).join(),
  () => loadDishes(entries.value),
  { immediate: true },
);

type Row = {
  entry: WishlistEntry;
  /** What the row and the dish sheet show: the dish or the saved variant. */
  dish: Dish;
  /** The dish the saved variant belongs to. */
  dishId: string;
  orderable: OrderableDish;
  extras: Extra[];
  configuration: string;
  price: Dish["price"];
  // a parent with variants (saved before #467) needs a choice first
  needsChoice: boolean;
};

const rows = computed<Row[]>(() =>
  entries.value.flatMap((entry) => {
    const detail = details.value[entry.productId];
    if (!detail) return [];
    const variant = detail.variants.find(
      (candidate) => candidate.id === entry.productId,
    );
    const dish = variant ? variantAsDish(detail, variant) : detail;
    const offered = detail.extraGroups.flatMap((group) => group.extras);
    const chosenExtras = entry.extras
      .map((number) => offered.find((extra) => extra.number === number))
      .filter((extra): extra is Extra => !!extra);
    const configuration = [
      ...chosenExtras.map((extra) => `+${extra.name}`),
      ...entry.without.map((name) => `ohne ${name}`),
    ].join(", ");
    return [
      {
        entry,
        dish,
        dishId: detail.id,
        orderable: variant ?? detail,
        extras: chosenExtras,
        configuration,
        price: sumMoney(
          [dish.price, ...chosenExtras.map((extra) => extra.price)],
          dish.price.currency,
        ),
        needsChoice: !variant && detail.variants.length > 0,
      },
    ];
  }),
);

// "Anpassen" opens the dish sheet on this page.
const quickView = useProductQuickView(() => rows.value.map((row) => row.dish));

function customizeLink(row: Row) {
  return {
    query: withQuickViewConfiguration(route.query, {
      productNumber: row.dish.number,
      without: row.entry.without,
      extras: row.entry.extras,
    }) as LocationQueryRaw,
  };
}

function rowLabel(row: Row) {
  return row.configuration
    ? `${row.dish.name} (${row.configuration})`
    : row.dish.name;
}

/** Adds one row with the same cart line the dish sheet creates. */
async function addRow(row: Row) {
  setSelectedDish(row.orderable, row.dishId);
  setSelectedExtras(row.extras);
  setRemovedIngredients(row.entry.without);
  selectedQuantity.value = 1;
  let added = false;
  await addToCart(() => (added = true));
  return added;
}

const addingId = ref<string | null>(null);
const addingAll = ref(false);
const failed = ref<string | null>(null);

async function addOne(row: Row) {
  addingId.value = row.entry.id;
  failed.value = null;
  try {
    if (!(await addRow(row))) failed.value = rowLabel(row);
  } finally {
    addingId.value = null;
  }
}

async function addAll() {
  addingAll.value = true;
  failed.value = null;
  try {
    for (const row of rows.value) {
      if (row.needsChoice) continue;
      if (!(await addRow(row))) {
        failed.value = rowLabel(row);
        return;
      }
    }
  } finally {
    addingAll.value = false;
  }
}

const removingId = ref<string | null>(null);
async function removeRow(row: Row) {
  removingId.value = row.entry.id;
  try {
    await remove(row.entry.id);
  } catch (error) {
    console.error("[wishlist][remove]", error);
  } finally {
    removingId.value = null;
  }
}

const confirmClear = ref(false);
const clearing = ref(false);
async function clearAll() {
  clearing.value = true;
  try {
    await clear();
    confirmClear.value = false;
  } catch (error) {
    console.error("[wishlist][clear]", error);
  } finally {
    clearing.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 font-body text-sb-ink">
    <p
      v-if="!loaded || (loadingDishes && !rows.length)"
      role="status"
      class="text-sb-ink-muted"
    >
      Merkliste wird geladen …
    </p>
    <div
      v-else-if="!rows.length"
      class="flex flex-col items-start gap-4 rounded-sb-card border border-sb-line bg-sb-surface p-6"
    >
      <p>Ihre Merkliste ist leer.</p>
      <p class="text-sm text-sb-ink-muted">
        Im Gericht merken Sie es mit dem Herz, so wie Sie es zusammengestellt
        haben.
      </p>
      <SbButton v-if="showMenuButton" to="/speisekarte/"
        >Zur Speisekarte</SbButton
      >
    </div>
    <template v-else>
      <ul
        class="flex flex-col overflow-hidden rounded-sb-card border border-sb-line bg-sb-surface"
      >
        <li
          v-for="row in rows"
          :key="row.entry.id"
          :aria-label="rowLabel(row)"
          class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 border-b border-sb-line p-4 last:border-b-0"
        >
          <p class="min-w-0">
            <span
              class="block font-bold [overflow-wrap:anywhere] hyphens-auto"
              >{{ row.dish.name }}</span
            >
            <span
              v-if="row.configuration"
              class="block text-sm [overflow-wrap:anywhere]"
              >{{ row.configuration }}</span
            >
            <span class="text-sm text-sb-ink-muted tabular-nums"
              >Nr. {{ row.dish.number }} ·
              {{ getFormattedMoney(row.price) }}</span
            >
          </p>
          <SbIconButton
            :label="`${rowLabel(row)} von der Merkliste entfernen`"
            variant="ghost"
            :disabled="removingId === row.entry.id"
            @click="removeRow(row)"
          >
            <SbIcon name="close" />
          </SbIconButton>
          <div class="col-span-full flex flex-col gap-2 sm:flex-row">
            <SbButton
              v-if="!row.needsChoice"
              variant="tint"
              :loading="addingId === row.entry.id"
              :disabled="addingAll"
              @click="addOne(row)"
            >
              In den Warenkorb
              <span class="sr-only">: {{ rowLabel(row) }}</span>
            </SbButton>
            <SbButton variant="secondary" :to="customizeLink(row)">
              {{ row.needsChoice ? "Auswählen" : "Anpassen" }}
              <span class="sr-only">: {{ rowLabel(row) }}</span>
            </SbButton>
          </div>
        </li>
      </ul>
      <p
        v-if="failed"
        role="alert"
        class="rounded-sb-control border-[1.5px] border-sb-danger p-4 text-sm"
      >
        {{ failed }} konnte nicht in den Warenkorb gelegt werden. Bitte
        versuchen Sie es erneut.
      </p>
      <div class="flex flex-col gap-3 sm:flex-row">
        <SbButton :loading="addingAll" @click="addAll"
          >Alle in den Warenkorb</SbButton
        >
        <SbButton variant="ghost" @click="confirmClear = true"
          >Merkliste leeren</SbButton
        >
      </div>
      <SbConfirmDialog
        v-model:open="confirmClear"
        title="Merkliste leeren?"
        description="Alle gemerkten Gerichte werden entfernt."
        confirm-label="Merkliste leeren"
        :loading="clearing"
        @confirm="clearAll"
      />
    </template>
    <LazyProductQuickView
      v-if="quickView.mounted.value"
      v-model:open="quickView.open.value"
      :dish="quickView.dish.value"
    />
  </div>
</template>
