<script setup lang="ts">
const { user, userDefaultBillingAddress, userDefaultShippingAddress } =
  useUser();

const fullName = computed(
  () => user.value?.firstName + " " + user.value?.lastName,
);

const areAddressesDifferent = computed(() => {
  if (!userDefaultBillingAddress.value || !userDefaultShippingAddress.value) {
    return false; // Or true depending on your requirements
  }

  // Deep compare the address objects
  return (
    JSON.stringify(userDefaultBillingAddress.value) !==
    JSON.stringify(userDefaultShippingAddress.value)
  );
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
    <AddressDetail :address="userDefaultShippingAddress" />
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
    />
  </div>
</template>
