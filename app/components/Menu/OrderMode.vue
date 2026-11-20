<script setup lang="ts">
/**
 * Delivery or pickup above the menu and in the cart panel (#443). Loads
 * the shipping methods on mount (client only: they depend on the session)
 * and renders nothing when there is no choice.
 */
const { options, selectable, selectedId, load } = useOrderMode();
const { acceptsOrders } = useShopConfig();

onMounted(load);
</script>

<template>
  <SbSegmentedControl
    v-if="acceptsOrders && selectable && selectedId"
    v-model="selectedId"
    label="Bestellart"
    :options="options"
  />
</template>
