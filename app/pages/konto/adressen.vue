<script setup lang="ts">
import type { Address } from "../../../shared/domain";

definePageMeta({
  layout: "account",
});

const { t } = useI18n();

useSeoMeta({
  title: t("account.addresses.title"),
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
    ? t("account.addresses.saved")
    : t("account.addresses.created");
}

async function setDefault(kind: "shipping" | "billing", addressId: string) {
  try {
    await setDefaultAddress(
      addressId,
      kind === "shipping" ? "delivery" : "billing",
    );
    notice.value =
      kind === "shipping"
        ? t("account.addresses.deliveryChanged")
        : t("account.addresses.billingChanged");
  } catch (error) {
    console.error(
      "[account] default address",
      domainErrorCode(error) ?? "no answer",
    );
    notice.value = t("account.addresses.changeFailed");
  }
}

// the address a button acts on, for screen readers
const which = (address: Address) =>
  t("account.addresses.which", {
    street: address.street,
    city: address.city,
  });

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
    notice.value = t("account.addresses.deleted");
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
    <UserAccountHeader :title="$t('account.addresses.title')" />
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
      {{ $t("account.addresses.add") }}
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
          :aria-label="$t('account.addresses.usage')"
        >
          <li
            v-if="address.id === userDefaultShippingAddress?.id"
            class="rounded-sb-control bg-sb-primary-tint px-3 py-1 text-sm font-bold text-sb-primary-ink"
          >
            {{ $t("account.shared.deliveryAddress") }}
          </li>
          <li
            v-if="address.id === userDefaultBillingAddress?.id"
            class="rounded-sb-control bg-sb-muted px-3 py-1 text-sm font-bold"
          >
            {{ $t("account.shared.billingAddress") }}
          </li>
        </ul>
        <AddressDetail :address="address" />
        <div class="mt-auto flex flex-wrap gap-2">
          <SbButton variant="secondary" @click="openSheet(address)">
            {{ $t("account.addresses.edit") }}
            <span class="sr-only">{{ which(address) }}</span>
          </SbButton>
          <SbButton
            v-if="address.id !== userDefaultShippingAddress?.id"
            variant="ghost"
            @click="setDefault('shipping', address.id!)"
            >{{ $t("account.addresses.useForDelivery") }}
            <span class="sr-only">{{ which(address) }}</span></SbButton
          >
          <SbButton
            v-if="address.id !== userDefaultBillingAddress?.id"
            variant="ghost"
            @click="setDefault('billing', address.id!)"
            >{{ $t("account.addresses.useForBilling") }}
            <span class="sr-only">{{ which(address) }}</span></SbButton
          >
          <SbButton
            v-if="!isDefault(address)"
            variant="ghost"
            @click="askDelete(address)"
            >{{ $t("account.addresses.delete") }}
            <span class="sr-only">{{ which(address) }}</span></SbButton
          >
        </div>
      </li>
    </ul>
    <SbSheet
      v-if="sheetOpen"
      v-model:open="sheetOpen"
      :title="
        editedAddress
          ? $t('account.addresses.editTitle')
          : $t('account.addresses.addTitle')
      "
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
      :title="$t('account.addresses.deleteTitle')"
      :description="`${deleting?.street}, ${deleting?.postalCode} ${deleting?.city}`"
      :confirm-label="$t('account.addresses.deleteConfirm')"
      :loading="deleteBusy"
      @confirm="onDelete"
    >
      <p v-if="deleteFailed" role="alert" class="text-sm font-semibold">
        {{ $t("account.addresses.deleteFailed") }}
      </p>
    </SbConfirmDialog>
  </div>
</template>
