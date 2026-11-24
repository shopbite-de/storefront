<script setup lang="ts">
import type { LocationQueryRaw } from "vue-router";
import type {
  Dish,
  DishDetail,
  Extra,
  WishlistEntry,
} from "../../shared/domain";
import type { OrderableDish } from "~/utils/dish";
import { withQuickViewConfiguration } from "~/utils/productUrl";

/**
 * The wishlist with configured dishes (#467). Each row names the dish with
 * its configuration ("+Extra Salami, ohne Pilze"), shows today's price of
 * dish and extras, adds it to the cart as the dish sheet would (same
 * container line item, `useAddToCart`) and opens the sheet with the saved
 * configuration ("Anpassen", the dish sheet URL of #411 on this page). The
 * dishes come from the BFF's dish sheets (`/api/menu/dishes/[dishId]`);
 * an entry names extras and removed ingredients by id (ADR 0001, step 7).
 */
withDefaults(defineProps<{ showMenuButton?: boolean }>(), {
  showMenuButton: false,
});

const route = useRoute();
const { getFormattedMoney } = useCommercePrice();
const { entries, loaded, remove, clear } = useWishlistEntries();
// paused or switched off: rows stay, but nothing goes into the cart
const { acceptsOrders } = useShopConfig();
const {
  setSelectedDish,
  setSelectedExtras,
  setRemovedIngredients,
  selectedQuantity,
  addToCart,
} = useAddToCart();

/** The dish sheet of each saved dish, by its id. */
const details = ref<Record<string, DishDetail>>({});
const loadingDishes = ref(false);

async function loadDishes(list: WishlistEntry[]) {
  const ids = [...new Set(list.map((entry) => entry.configuration.dishId))];
  if (!ids.length) {
    details.value = {};
    return;
  }
  loadingDishes.value = true;
  try {
    const answers = await Promise.allSettled(
      ids.map((id) =>
        $fetch<DishDetail>(`/api/menu/dishes/${encodeURIComponent(id)}`),
      ),
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
  /** The removed main ingredients by name, as the dish sheet's URL. */
  without: string[];
  configuration: string;
  price: Dish["price"];
  // a dish with variants saved without one (before #467) needs a choice
  needsChoice: boolean;
};

const rows = computed<Row[]>(() =>
  entries.value.flatMap((entry) => {
    const { configuration } = entry;
    const detail = details.value[configuration.dishId];
    if (!detail) return [];
    const variant = configuration.variantId
      ? detail.variants.find(
          (candidate) => candidate.id === configuration.variantId,
        )
      : undefined;
    // a variant the dish no longer has
    if (configuration.variantId && !variant) return [];
    const dish = variant ? variantAsDish(detail, variant) : detail;
    const offered = detail.extraGroups.flatMap((group) => group.extras);
    const chosenExtras = configuration.extraIds
      .map((id) => offered.find((extra) => extra.id === id))
      .filter((extra): extra is Extra => !!extra);
    const ingredients = (variant ?? detail).ingredients;
    const without = configuration.removedIngredientIds.flatMap((id) => {
      const ingredient = ingredients.find((candidate) => candidate.id === id);
      return ingredient ? [ingredient.name] : [];
    });
    const label = [
      ...chosenExtras.map((extra) => `+${extra.name}`),
      ...without.map((name) => `ohne ${name}`),
    ].join(", ");
    return [
      {
        entry,
        dish,
        dishId: detail.id,
        orderable: variant ?? detail,
        extras: chosenExtras,
        without,
        configuration: label,
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
      without: row.without,
      extras: row.extras.map((extra) => extra.number),
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
  setRemovedIngredients(row.without);
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
      <p
        v-if="!acceptsOrders"
        role="status"
        class="rounded-sb-control bg-sb-muted p-4 text-sm font-semibold"
      >
        Es werden aktuell keine weiteren Bestellungen mehr aufgenommen.
      </p>
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
              v-if="acceptsOrders && !row.needsChoice"
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
        <SbButton v-if="acceptsOrders" :loading="addingAll" @click="addAll"
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
