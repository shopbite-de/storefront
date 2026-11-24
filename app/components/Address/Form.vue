<script setup lang="ts">
import * as z from "zod";
import type { Address } from "../../../shared/domain";
import type { AccountAddressInput } from "~/composables/useAccountAddresses";
import {
  baseAddressSchema,
  type AddressSchema,
} from "~/validation/registrationSchema";

/**
 * The one address form (ADR 0001, step 6) of the account's address book
 * and the checkout's "Adresse bearbeiten": the fields of the checkout
 * (`AddressFields`) on the domain `Address`, checked with the same rules
 * on submit. Errors show at the fields, the first one gets focus. The
 * caller saves (`save`): the account through `/api/account/addresses`,
 * the checkout through `/api/checkout/orderer/addresses/[addressId]`. A
 * new address has no country (the shop's), a changed one keeps its own.
 */
const props = defineProps<{
  address?: Address | null;
  save: (address: AccountAddressInput) => Promise<unknown>;
}>();

const emit = defineEmits<{ "submit-success": [] }>();

const { t } = useI18n();
const isBusiness = ref(Boolean(props.address?.company));
// the form's own field names; the country is not asked
const model = ref<AddressSchema>({
  firstName: props.address?.firstName ?? "",
  lastName: props.address?.lastName ?? "",
  company: props.address?.company ?? "",
  department: props.address?.department ?? "",
  street: props.address?.street ?? "",
  additionalAddressLine1: props.address?.additionalLine ?? "",
  zipcode: props.address?.postalCode ?? "",
  city: props.address?.city ?? "",
  // checked as filled only
  countryId: "shop",
  phoneNumber: props.address?.phone ?? "",
});

const schema = computed(() =>
  baseAddressSchema
    .extend({
      firstName: z.string().min(1, {
        message: "account.addressForm.validation.firstNameRequired",
      }),
      lastName: z
        .string()
        .min(1, { message: "account.addressForm.validation.lastNameRequired" }),
      zipcode: z.string().min(1, {
        message: "account.addressForm.validation.postalCodeRequired",
      }),
    })
    .refine((data) => !isBusiness.value || Boolean(data.company), {
      message: "account.addressForm.validation.companyRequired",
      path: ["company"],
    }),
);

const PREFIX = "shippingAddress";
const errors = ref<Record<string, string>>({});
const saveError = ref(false);
const saving = ref(false);
const form = ref<HTMLFormElement | null>(null);

async function onSubmit() {
  saveError.value = false;
  const result = schema.value.safeParse(model.value);
  if (!result.success) {
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = `${PREFIX}.${issue.path.join(".")}`;
      // the schemas' messages are keys (ADR 0002)
      next[key] ??= t(issue.message);
    }
    errors.value = next;
    await nextTick();
    form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    return;
  }
  errors.value = {};
  saving.value = true;
  try {
    const data = result.data;
    await props.save({
      id: props.address?.id ?? null,
      salutation: props.address?.salutation ?? null,
      firstName: data.firstName ?? "",
      lastName: data.lastName ?? "",
      company: (isBusiness.value && data.company) || null,
      department: (isBusiness.value && data.department) || null,
      street: data.street,
      additionalLine: data.additionalAddressLine1 || null,
      postalCode: data.zipcode ?? "",
      city: data.city,
      country: props.address?.country || null,
      phone: data.phoneNumber || null,
    });
    emit("submit-success");
  } catch (error) {
    console.error(
      "Address save failed:",
      domainErrorCode(error) ?? "no answer",
    );
    saveError.value = true;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form
    ref="form"
    novalidate
    class="flex flex-col gap-4 font-body text-sb-ink"
    @submit.prevent="onSubmit"
  >
    <div
      v-if="saveError"
      role="alert"
      class="rounded-sb-control border-[1.5px] border-sb-danger p-4 text-sm"
    >
      <strong class="block">{{ $t("account.addressForm.saveFailed") }}</strong>
      {{ $t("account.addressForm.tryAgain") }}
    </div>
    <SbCheckbox
      v-model="isBusiness"
      :label="$t('account.addressForm.business')"
      plain
    />
    <AddressFields
      v-model="model"
      :prefix="PREFIX"
      :account-type="isBusiness ? 'business' : 'private'"
      show-names
      :errors="errors"
    />
    <SbButton type="submit" size="lg" block :loading="saving">{{
      $t("account.addressForm.save")
    }}</SbButton>
  </form>
</template>
