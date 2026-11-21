<script setup lang="ts">
import type { Address } from "../../../shared/domain";

definePageMeta({
  layout: "account",
});

useSeoMeta({
  title: "Adressen",
});

// The account's address book through the BFF (ADR 0001, step 6).
const {
  addresses: customerAddresses,
  defaultDeliveryAddress: userDefaultShippingAddress,
  defaultBillingAddress: userDefaultBillingAddress,
  refresh,
  save,
  remove,
  setDefault: setDefaultAddress,
} = useAccountAddresses();

onMounted(() => {
  refresh().catch((error) =>
    console.error("[account] addresses", domainErrorCode(error) ?? "no answer"),
  );
});

// One sheet for editing and adding; results are announced in the page
// (#445).
const sheetOpen = ref(false);
const editedAddress = ref<Address | undefined>();
const notice = ref("");

function openSheet(address?: Address) {
  editedAddress.value = address;
  sheetOpen.value = true;
}

function onSaved() {
  sheetOpen.value = false;
  notice.value = editedAddress.value
    ? "Die Adresse ist gespeichert."
    : "Die Adresse ist angelegt.";
}

async function setDefault(kind: "shipping" | "billing", addressId: string) {
  try {
    await setDefaultAddress(
      addressId,
      kind === "shipping" ? "delivery" : "billing",
    );
    notice.value =
      kind === "shipping"
        ? "Die Lieferadresse ist geändert."
        : "Die Rechnungsadresse ist geändert.";
  } catch (error) {
    console.error(
      "[account] default address",
      domainErrorCode(error) ?? "no answer",
    );
    notice.value = "Die Adresse konnte nicht geändert werden.";
  }
}

const isDefault = (address: Address) =>
  address.id === userDefaultShippingAddress.value?.id ||
  address.id === userDefaultBillingAddress.value?.id;

// Deleting asks first (#445: irreversible actions confirm).
const deleting = ref<Address | null>(null);
const deleteOpen = ref(false);
const deleteBusy = ref(false);
const deleteFailed = ref(false);

function askDelete(address: Address) {
  deleting.value = address;
  deleteFailed.value = false;
  deleteOpen.value = true;
}

async function onDelete() {
  if (!deleting.value?.id) return;
  deleteBusy.value = true;
  deleteFailed.value = false;
  try {
    await remove(deleting.value.id);
    deleteOpen.value = false;
    notice.value = "Die Adresse ist gelöscht.";
  } catch (error) {
    console.error(
      "[account] delete address",
      domainErrorCode(error) ?? "no answer",
    );
    deleteFailed.value = true;
  } finally {
    deleteBusy.value = false;
  }
}
</script>

<template>
  <div class="font-body text-sb-ink">
    <UserAccountHeader title="Adressen" />
    <p
      role="status"
      :class="
        notice
          ? 'mb-4 rounded-sb-control bg-sb-primary-tint p-4 text-sm text-sb-primary-ink'
          : ''
      "
    >
      {{ notice }}
    </p>
    <SbButton class="mb-6" @click="openSheet()">
      <SbIcon name="plus" />
      Neue Adresse
    </SbButton>
    <ul class="grid gap-4 md:grid-cols-2">
      <li
        v-for="address in customerAddresses ?? []"
        :key="address.id ?? address.street"
        class="flex flex-col gap-4 rounded-sb-card border border-sb-line bg-sb-surface p-5"
      >
        <ul
          v-if="isDefault(address)"
          class="flex flex-wrap gap-2"
          aria-label="Verwendung"
        >
          <li
            v-if="address.id === userDefaultShippingAddress?.id"
            class="rounded-sb-control bg-sb-primary-tint px-3 py-1 text-sm font-bold text-sb-primary-ink"
          >
            Lieferadresse
          </li>
          <li
            v-if="address.id === userDefaultBillingAddress?.id"
            class="rounded-sb-control bg-sb-muted px-3 py-1 text-sm font-bold"
          >
            Rechnungsadresse
          </li>
        </ul>
        <AddressDetail :address="address" />
        <div class="mt-auto flex flex-wrap gap-2">
          <SbButton variant="secondary" @click="openSheet(address)">
            Bearbeiten
            <span class="sr-only"
              >: {{ address.street }}, {{ address.city }}</span
            >
          </SbButton>
          <SbButton
            v-if="address.id !== userDefaultShippingAddress?.id"
            variant="ghost"
            @click="setDefault('shipping', address.id!)"
            >Als Lieferadresse
            <span class="sr-only"
              >: {{ address.street }}, {{ address.city }}</span
            ></SbButton
          >
          <SbButton
            v-if="address.id !== userDefaultBillingAddress?.id"
            variant="ghost"
            @click="setDefault('billing', address.id!)"
            >Als Rechnungsadresse
            <span class="sr-only"
              >: {{ address.street }}, {{ address.city }}</span
            ></SbButton
          >
          <SbButton
            v-if="!isDefault(address)"
            variant="ghost"
            @click="askDelete(address)"
            >Löschen
            <span class="sr-only"
              >: {{ address.street }}, {{ address.city }}</span
            ></SbButton
          >
        </div>
      </li>
    </ul>
    <SbSheet
      v-if="sheetOpen"
      v-model:open="sheetOpen"
      :title="editedAddress ? 'Adresse bearbeiten' : 'Neue Adresse'"
    >
      <AddressForm
        :key="editedAddress?.id ?? 'neu'"
        :address="editedAddress"
        :save="save"
        @submit-success="onSaved"
      />
    </SbSheet>
    <SbConfirmDialog
      v-if="deleteOpen"
      v-model:open="deleteOpen"
      title="Adresse löschen?"
      :description="`${deleting?.street}, ${deleting?.postalCode} ${deleting?.city}`"
      confirm-label="Adresse löschen"
      :loading="deleteBusy"
      @confirm="onDelete"
    >
      <p v-if="deleteFailed" role="alert" class="text-sm font-semibold">
        Die Adresse konnte nicht gelöscht werden. Bitte versuchen Sie es später
        noch einmal.
      </p>
    </SbConfirmDialog>
  </div>
</template>
