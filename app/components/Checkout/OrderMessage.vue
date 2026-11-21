<script setup lang="ts">
/**
 * The checkout's answer to the order button (failure, unknown outcome, an
 * order already placed), shared by the order card and the empty checkout:
 * an order of another tab empties the cart before the answer comes, which
 * replaces the order card with the empty state.
 */
const { message } = useCheckoutOrderMessage();
</script>

<template>
  <div
    v-if="message"
    role="alert"
    class="flex gap-3 rounded-sb-control border-[1.5px] border-sb-danger p-4 text-sm"
  >
    <span class="font-bold text-sb-danger">!</span>
    <span>
      <strong class="block">{{ message.title }}</strong>
      {{ message.description }}
      <NuxtLink
        v-if="message.link"
        :to="message.link.to"
        class="mt-1 block font-semibold text-sb-primary-ink underline underline-offset-2"
        >{{ message.link.label }}</NuxtLink
      >
    </span>
  </div>
</template>
