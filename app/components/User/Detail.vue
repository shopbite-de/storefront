<script setup lang="ts">
defineProps<{
  withEditButton?: boolean;
}>();

const {
  user,
  userDefaultBillingAddress,
  userDefaultShippingAddress,
  refreshUser,
} = useUser();

const fullName = computed(
  () => user.value?.firstName + " " + user.value?.lastName,
);

const areAddressesDifferent = computed(() => {
  if (!userDefaultBillingAddress.value || !userDefaultShippingAddress.value) {
    return false;
  }

  return (
    JSON.stringify(userDefaultBillingAddress.value) !==
    JSON.stringify(userDefaultShippingAddress.value)
  );
});

async function refreshUserAddresses() {
  await refreshUser({
    associations: {
      defaultShippingAddress: {},
      defaultBillingAddress: {},
      activeShippingAddress: {},
      activeBillingAddress: {},
    },
  });
}

async function handleAddressUpdate() {
  // Refresh user data from the API to get the latest addresses
  await refreshUserAddresses();
}

onMounted(() => {
  refreshUserAddresses();
});
</script>

<template>
  <div class="shadow-md rounded-md mb-4 p-6 bg-elevated">
    <div>{{ fullName }}</div>
    <div>{{ user?.email }}</div>
    <USeparator
      color="primary"
      class="my-6"
      :decorative="true"
      :label="
        areAddressesDifferent ? 'Lieferadresse' : 'Liefer- und Rechnungsadresse'
      "
    />
    <AddressDetail
      :address="userDefaultShippingAddress"
      :with-edit-button="withEditButton"
      @update:address="handleAddressUpdate"
    />
    <USeparator
      v-if="areAddressesDifferent"
      class="my-6"
      color="primary"
      :decorative="true"
      label="Rechnungsadresse"
    />
    <AddressDetail
      v-if="areAddressesDifferent"
      :address="userDefaultBillingAddress"
      :with-edit-button="withEditButton"
      @update:address="handleAddressUpdate"
    />
  </div>
</template>
