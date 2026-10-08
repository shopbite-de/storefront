<script setup lang="ts">
import type { Schemas } from "#shopware";
import type { LocationQueryRaw } from "vue-router";
import type { AssociationItemProduct } from "~/types/Association";
import type { WishlistEntry } from "~/composables/useWishlistEntries";
import { withQuickViewConfiguration } from "~/utils/productUrl";

/**
 * The wishlist with configured dishes (#467). Each row names the dish with
 * its configuration ("+Extra Salami, ohne Pilze"), shows today's price of
 * dish and extras, adds it to the cart as the product sheet would (same
 * container line item, `useAddToCart`) and opens the sheet with the saved
 * configuration ("Anpassen", the quick view URL of #411 on this page).
 */
withDefaults(defineProps<{ showMenuButton?: boolean }>(), {
  showMenuButton: false,
});

const route = useRoute();
const { apiClient } = useShopwareContext();
const { getFormattedPrice } = useCommercePrice();
const { entries, loaded, remove, clear } = useWishlistEntries();
const {
  setSelectedProduct,
  setSelectedExtras,
  setDeselectedIngredients,
  selectedQuantity,
  addToCart,
} = useAddToCart();

const products = ref<Schemas["Product"][]>([]);
const extras = ref<Schemas["Product"][]>([]);
const loadingProducts = ref(false);

async function loadProducts(list: WishlistEntry[]) {
  const productIds = [...new Set(list.map((entry) => entry.productId))];
  const extraNumbers = [...new Set(list.flatMap((entry) => entry.extras))];
  if (!productIds.length) {
    products.value = [];
    extras.value = [];
    return;
  }
  loadingProducts.value = true;
  try {
    const [dishes, extraProducts] = await Promise.all([
      apiClient.invoke("readProduct post /product", {
        // @ts-expect-error sw-inheritance is missing from the generated header type
        headers: { "sw-inheritance": "true" },
        body: { ids: productIds, limit: productIds.length },
      }),
      extraNumbers.length
        ? apiClient.invoke("readProduct post /product", {
            body: {
              filter: [
                {
                  type: "equalsAny",
                  field: "productNumber",
                  value: extraNumbers.join("|"),
                },
              ],
              limit: extraNumbers.length,
            },
          })
        : Promise.resolve(undefined),
    ]);
    products.value = dishes.data.elements ?? [];
    extras.value = extraProducts?.data.elements ?? [];
  } catch (error) {
    console.error("[wishlist][loadProducts]", error);
  } finally {
    loadingProducts.value = false;
  }
}

watch(
  () => entries.value.map((entry) => entry.id).join(),
  () => loadProducts(entries.value),
  { immediate: true },
);

function nameOf(product: Schemas["Product"] | undefined) {
  return product?.translated?.name ?? product?.name ?? "";
}

type Row = {
  entry: WishlistEntry;
  product: Schemas["Product"];
  extras: Schemas["Product"][];
  configuration: string;
  price: number;
  // a parent with variants (saved before #467) needs a choice first
  needsChoice: boolean;
};

const rows = computed<Row[]>(() =>
  entries.value.flatMap((entry) => {
    const product = products.value.find(
      (candidate) => candidate.id === entry.productId,
    );
    if (!product) return [];
    const chosenExtras = entry.extras
      .map((number) =>
        extras.value.find((extra) => extra.productNumber === number),
      )
      .filter((extra): extra is Schemas["Product"] => !!extra);
    const configuration = [
      ...chosenExtras.map((extra) => `+${nameOf(extra)}`),
      ...entry.without.map((name) => `ohne ${name}`),
    ].join(", ");
    const price =
      (product.calculatedPrice?.unitPrice ?? 0) +
      chosenExtras.reduce(
        (sum, extra) => sum + (extra.calculatedPrice?.unitPrice ?? 0),
        0,
      );
    return [
      {
        entry,
        product,
        extras: chosenExtras,
        configuration,
        price,
        needsChoice: (product.childCount ?? 0) > 0,
      },
    ];
  }),
);

// "Anpassen" opens the product sheet on this page.
const quickView = useProductQuickView(products);

function customizeLink(row: Row) {
  return {
    query: withQuickViewConfiguration(route.query, {
      productNumber: row.product.productNumber,
      without: row.entry.without,
      extras: row.entry.extras,
    }) as LocationQueryRaw,
  };
}

function rowLabel(row: Row) {
  return row.configuration
    ? `${nameOf(row.product)} (${row.configuration})`
    : nameOf(row.product);
}

const addingId = ref<string | null>(null);
const addingAll = ref(false);
const failed = ref<string | null>(null);

function asExtra(extra: Schemas["Product"]): AssociationItemProduct {
  return {
    label: nameOf(extra),
    value: extra.id,
    productNumber: extra.productNumber,
    price: getFormattedPrice(extra.calculatedPrice?.unitPrice),
    unitPrice: extra.calculatedPrice?.unitPrice,
  };
}

/** Adds one row with the same line item the product sheet creates. */
async function addRow(row: Row) {
  setSelectedProduct(row.product);
  setSelectedExtras(row.extras.map(asExtra));
  setDeselectedIngredients(row.entry.without);
  selectedQuantity.value = 1;
  let added = false;
  await addToCart(() => (added = true));
  return added;
}

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
      v-if="!loaded || (loadingProducts && !rows.length)"
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
              >{{ nameOf(row.product) }}</span
            >
            <span
              v-if="row.configuration"
              class="block text-sm [overflow-wrap:anywhere]"
              >{{ row.configuration }}</span
            >
            <span class="text-sm text-sb-ink-muted tabular-nums"
              >Nr. {{ row.product.productNumber }} ·
              {{ getFormattedPrice(row.price) }}</span
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
      :product="quickView.product.value"
    />
  </div>
</template>
