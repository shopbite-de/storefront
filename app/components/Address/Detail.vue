<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  address: Schemas["CustomerAddress"] | undefined | null;
}>();

const { address } = toRefs(props);
</script>

<template>
  <div v-if="address">
    <div>{{ address.firstName }} {{ address.lastName }}</div>
    <div>{{ address.phoneNumber }}</div>
    <div>{{ address.company }}</div>
    <div>{{ address.department }}</div>
    <div>{{ address.additionalAddressLine1 }}</div>
    <div>{{ address.additionalAddressLine2 }}</div>
    <div>{{ address.street }}</div>
    <div>{{ address.zipcode }} {{ address.city }}</div>
  </div>
</template>
