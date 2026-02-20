<script setup lang="ts">
import type { Schemas } from "#shopware";

defineProps<{
  address: Schemas["CustomerAddress"] | undefined | null;
  withEditButton?: boolean;
}>();

const emit = defineEmits<{
  "update:address": [address: Schemas["CustomerAddress"]];
}>();

const editMode = ref(false);

function onSubmit(updatedAddress: Schemas["CustomerAddress"] | undefined) {
  if (!updatedAddress) return;

  emit("update:address", updatedAddress);
  editMode.value = false;
}
</script>

<template>
  <div v-if="address" class="flex flex-col gap-2">
    <div v-if="!editMode" class="flex flex-col gap-2">
      <div>{{ address.firstName }} {{ address.lastName }}</div>
      <div>{{ address.phoneNumber }}</div>
      <div v-if="address.company">{{ address.company }}</div>
      <div v-if="address.department">{{ address.department }}</div>
      <div v-if="address.additionalAddressLine1">
        {{ address.additionalAddressLine1 }}
      </div>
      <div v-if="address.additionalAddressLine2">
        {{ address.additionalAddressLine2 }}
      </div>
      <div>{{ address.street }}</div>
      <div>{{ address.zipcode }} {{ address.city }}</div>
      <UButton
        v-if="withEditButton"
        variant="subtle"
        icon="i-lucide-pen"
        label="Bearbeiten"
        block
        @click="editMode = true"
      />
    </div>
    <div v-else>
      <AddressForm :address="address" @submit-success="onSubmit" />
    </div>
  </div>
</template>
