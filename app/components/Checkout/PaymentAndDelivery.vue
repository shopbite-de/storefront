<script setup lang="ts">
import type {
  RadioGroupItem,
  RadioGroupValue,
} from "#ui/components/RadioGroup.vue";
import type { Schemas } from "#shopware";

const {
  paymentMethods,
  getPaymentMethods,
  selectedPaymentMethod,
  setPaymentMethod,
  shippingMethods,
  getShippingMethods,
  selectedShippingMethod,
  setShippingMethod,
} = useCheckout();

const { refreshCart } = useCart();

const toast = useToast();

onMounted(() => {
  getPaymentMethods();
  getShippingMethods();
});

const selectablePaymentMethods = computed<RadioGroupItem[]>(() => {
  return paymentMethods.value?.map((method: Schemas["PaymentMethod"]) => ({
    label: method.distinguishableName,
    description: method.description,
    value: method.id,
  }));
});

const selectableShippingMethods = computed<RadioGroupItem[]>(() => {
  return shippingMethods.value?.map((method: Schemas["ShippingMethod"]) => ({
    label: method.name,
    description: method.description,
    value: method.id,
  }));
});

const selectedPaymentMethodId = ref<RadioGroupValue | undefined>(
  selectedPaymentMethod.value?.id,
);
const selectedShippingMethodId = ref<RadioGroupValue | undefined>(
  selectedShippingMethod.value?.id,
);

watch(
  selectedPaymentMethodId,
  async (newValue: RadioGroupValue | undefined) => {
    if (newValue === undefined) return;
    if (selectedPaymentMethod.value === null) return;
    await setPaymentMethod({ id: newValue as string });
    toast.add({
      title: "Zahlart geändert",
      description:
        selectedPaymentMethod.value.distinguishableName + " ausgewählt",
      color: "success",
      progress: false,
    });
  },
);

watch(
  selectedShippingMethodId,
  async (newValue: RadioGroupValue | undefined) => {
    if (newValue === undefined) return;
    if (selectedShippingMethod.value === null) return;
    await setShippingMethod({ id: newValue as string });
    await refreshCart();
    toast.add({
      title: "Versandart geändert",
      description: selectedShippingMethod.value.name + " ausgewählt",
      color: "success",
      progress: false,
    });
  },
);
</script>

<template>
  <UContainer>
    <div class="flex flex-col md:flex-row justify-between gap-4">
      <div class="basis-1/2">
        <div class="flex flex-row items-center gap-4">
          <UIcon name="i-lucide-badge-euro" class="size-8" />
          <h2 class="text-2xl text-blackish my-8">Zahlungsarten</h2>
          <UButton
            to="/unternehmen/zahlung-und-versand"
            size="md"
            variant="ghost"
            icon="i-lucide-circle-question-mark"
          />
        </div>
        <URadioGroup
          v-model="selectedPaymentMethodId"
          :items="selectablePaymentMethods"
          variant="card"
        />
      </div>
      <div class="basis-1/2">
        <div class="flex flex-row items-center gap-4">
          <UIcon name="i-lucide-car" class="size-8" />
          <h2 class="text-2xl text-blackish my-8">Versandarten</h2>
          <UButton
            to="/unternehmen/zahlung-und-versand"
            size="md"
            variant="ghost"
            icon="i-lucide-circle-question-mark"
          />
        </div>
        <URadioGroup
          v-model="selectedShippingMethodId"
          :items="selectableShippingMethods"
          variant="card"
        />
      </div>
    </div>
  </UContainer>
</template>
