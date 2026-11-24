<script setup lang="ts">
const {
  voucherCode,
  voucherLoading,
  voucherError,
  applyVoucher,
  appliedVouchers,
  removeVoucher,
} = useVoucherCode();
const voucherId = useId();
</script>

<template>
  <div class="flex flex-col gap-2 font-body text-sb-ink">
    <form class="flex gap-2" @submit.prevent="applyVoucher">
      <label :for="voucherId" class="sr-only">{{
        $t("order.voucher.label")
      }}</label>
      <SbInput
        :id="voucherId"
        v-model="voucherCode"
        name="voucher"
        :placeholder="$t('order.voucher.label')"
        autocomplete="off"
        class="flex-1"
        :invalid="!!voucherError"
        :aria-describedby="voucherError ? `${voucherId}-fehler` : undefined"
        :disabled="voucherLoading"
      />
      <SbButton
        type="submit"
        variant="secondary"
        :loading="voucherLoading"
        :disabled="!voucherCode.trim() || voucherLoading"
        >{{ $t("order.voucher.redeem") }}</SbButton
      >
    </form>
    <p
      v-if="voucherError"
      :id="`${voucherId}-fehler`"
      role="alert"
      class="text-sm font-semibold text-sb-danger"
    >
      {{ voucherError }}
    </p>
    <ul v-if="appliedVouchers.length" class="flex flex-col gap-1">
      <li
        v-for="voucher in appliedVouchers"
        :key="voucher.code!"
        class="flex items-center justify-between gap-2 rounded-sb-control bg-sb-primary-tint ps-3 text-sm font-semibold text-sb-primary-ink"
      >
        <span>{{ $t("order.voucher.applied", { name: voucher.name }) }}</span>
        <SbIconButton
          :label="$t('order.voucher.remove', { name: voucher.name })"
          variant="ghost"
          @click="removeVoucher(voucher.code!)"
        >
          <SbIcon name="close" :size="16" />
        </SbIconButton>
      </li>
    </ul>
  </div>
</template>
