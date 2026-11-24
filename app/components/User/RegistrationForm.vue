<script setup lang="ts">
import { shopLocale } from "#shopbite-locale";
import type { RegistrationSchema } from "~/validation/registrationSchema";

/**
 * Registration and guest order form of the presets (#443): the logic of
 * useRegistrationForm with the base components. The schema is checked on
 * submit; errors appear at their fields and in a summary above the form
 * that takes the focus and links to each field (WCAG 3.3.1).
 */
const props = withDefaults(defineProps<{ allowGuest?: boolean }>(), {
  allowGuest: true,
});

const emit = defineEmits<{
  "registration-success": [
    data: RegistrationSchema,
    /** Double opt-in: the e-mail is to be confirmed before the login. */
    needsConfirmation: boolean,
  ];
}>();

const {
  state,
  schema,
  createAccount,
  billingAddressFields,
  shippingAddressFields,
  accountTypes,
  submit,
} = useRegistrationForm({ allowGuest: props.allowGuest });
const { t } = useI18n();

const errors = ref<Record<string, string>>({});
const submitError = ref<string | null>(null);
const notice = ref<string | null>(null);
const submitting = ref(false);
const summary = ref<HTMLElement | null>(null);

// Field ids follow the schema paths ("billingAddress.street" →
// "billingAddress-street"), so the summary can link to them.
const fieldId = (path: string) => path.replace(/\./g, "-");
// The summary lists the errors in the order of the form, not the schema.
const ADDRESS_ORDER = [
  "company",
  "department",
  "firstName",
  "lastName",
  "street",
  "zipcode",
  "city",
  "additionalAddressLine1",
  "phoneNumber",
];
const FIELD_ORDER = [
  "accountType",
  "firstName",
  "lastName",
  "email",
  "password",
  "passwordConfirm",
  ...ADDRESS_ORDER.map((name) => `billingAddress.${name}`),
  ...ADDRESS_ORDER.map((name) => `shippingAddress.${name}`),
  "acceptedDataProtection",
];
const position = (path: string) => {
  const index = FIELD_ORDER.indexOf(path);
  return index === -1 ? FIELD_ORDER.length : index;
};
const errorList = computed(() =>
  Object.entries(errors.value)
    .map(([path, message]) => ({ path, message, id: fieldId(path) }))
    .sort((a, b) => position(a.path) - position(b.path)),
);

async function onSubmit() {
  submitError.value = null;
  notice.value = null;
  const result = schema.value.safeParse(state);
  if (!result.success) {
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      // the schema carries message keys (AddressFields gets the texts)
      if (!next[path]) next[path] = t(issue.message);
    }
    errors.value = next;
    await nextTick();
    summary.value?.focus();
    return;
  }
  errors.value = {};
  submitting.value = true;
  try {
    const outcome = await submit(result.data as RegistrationSchema);
    if (!outcome.ok) {
      submitError.value = outcome.message;
      await nextTick();
      summary.value?.focus();
      return;
    }
    if (outcome.needsConfirmation) {
      notice.value = t("auth.registrationForm.confirmationNotice");
    }
    emit("registration-success", outcome.data, outcome.needsConfirmation);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form
    novalidate
    class="flex flex-col gap-5 font-body text-sb-ink"
    @submit.prevent="onSubmit"
  >
    <div
      v-if="errorList.length || submitError"
      ref="summary"
      role="alert"
      tabindex="-1"
      class="flex flex-col gap-2 rounded-sb-control border-[1.5px] border-sb-danger p-4 text-sm"
    >
      <strong class="text-base">
        {{
          submitError
            ? $t("auth.registrationForm.failedTitle")
            : $t("auth.registrationForm.fieldsMissing", errorList.length)
        }}
      </strong>
      <p v-if="submitError" class="whitespace-pre-line">{{ submitError }}</p>
      <ul v-else class="flex flex-col gap-1">
        <li v-for="item in errorList" :key="item.path">
          <a
            :href="`#${item.id}`"
            class="font-semibold text-sb-danger underline underline-offset-2"
            >{{ item.message }}</a
          >
        </li>
      </ul>
    </div>
    <p
      v-if="notice"
      role="status"
      class="rounded-sb-control bg-sb-primary-tint p-4 text-sm"
    >
      {{ notice }}
    </p>

    <SbSegmentedControl
      v-model="state.accountType"
      :label="$t('auth.registrationForm.customerTypeLabel')"
      :options="accountTypes"
    />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SbField
        id="firstName"
        v-slot="{ id, describedBy, invalid }"
        :label="$t('auth.registrationForm.firstNameLabel')"
        :error="errors.firstName"
      >
        <SbInput
          :id="id"
          v-model="state.firstName"
          name="firstName"
          autocomplete="given-name"
          :aria-describedby="describedBy"
          :invalid="invalid"
        />
      </SbField>
      <SbField
        id="lastName"
        v-slot="{ id, describedBy, invalid }"
        :label="$t('auth.registrationForm.lastNameLabel')"
        :error="errors.lastName"
      >
        <SbInput
          :id="id"
          v-model="state.lastName"
          name="lastName"
          autocomplete="family-name"
          :aria-describedby="describedBy"
          :invalid="invalid"
        />
      </SbField>
    </div>

    <SbField
      id="email"
      v-slot="{ id, describedBy, invalid }"
      :label="$t('auth.shared.emailLabel')"
      :hint="$t('auth.registrationForm.emailHint')"
      :error="errors.email"
    >
      <SbInput
        :id="id"
        v-model="state.email"
        name="email"
        type="email"
        autocomplete="email"
        :aria-describedby="describedBy"
        :invalid="invalid"
      />
    </SbField>

    <SbCheckbox
      v-if="allowGuest"
      v-model="createAccount"
      :label="$t('auth.registrationForm.createAccountLabel')"
      :description="$t('auth.registrationForm.createAccountDescription')"
      plain
    />

    <div v-if="!state.guest" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SbField
        id="password"
        v-slot="{ id, describedBy, invalid }"
        :label="$t('auth.shared.passwordLabel')"
        :hint="$t('auth.shared.passwordHint')"
        :error="errors.password"
      >
        <SbInput
          :id="id"
          v-model="state.password"
          name="password"
          type="password"
          autocomplete="new-password"
          :aria-describedby="describedBy"
          :invalid="invalid"
        />
      </SbField>
      <SbField
        id="passwordConfirm"
        v-slot="{ id, describedBy, invalid }"
        :label="$t('auth.registrationForm.passwordConfirmLabel')"
        :error="errors.passwordConfirm"
      >
        <SbInput
          :id="id"
          v-model="state.passwordConfirm"
          name="passwordConfirm"
          type="password"
          autocomplete="new-password"
          :aria-describedby="describedBy"
          :invalid="invalid"
        />
      </SbField>
    </div>

    <fieldset class="flex flex-col gap-4 border-t border-sb-line pt-5">
      <legend class="mb-1 font-bold">
        {{
          state.isShippingAddressDifferent
            ? $t("auth.registrationForm.billingAddress")
            : $t("auth.registrationForm.billingAndDeliveryAddress")
        }}
      </legend>
      <AddressFields
        ref="billingAddressFields"
        v-model="state.billingAddress"
        prefix="billingAddress"
        :account-type="state.accountType"
        :errors="errors"
      />
    </fieldset>

    <SbCheckbox
      v-model="state.isShippingAddressDifferent"
      :label="$t('auth.registrationForm.differentDeliveryAddress')"
      plain
    />

    <fieldset
      v-if="state.isShippingAddressDifferent"
      class="flex flex-col gap-4 border-t border-sb-line pt-5"
    >
      <legend class="mb-1 font-bold">
        {{ $t("auth.registrationForm.deliveryAddress") }}
      </legend>
      <AddressFields
        ref="shippingAddressFields"
        v-model="state.shippingAddress"
        prefix="shippingAddress"
        :account-type="state.accountType"
        :errors="errors"
        show-names
      />
    </fieldset>

    <div class="flex flex-col gap-1">
      <SbCheckbox
        id="acceptedDataProtection"
        v-model="state.acceptedDataProtection"
        :label="$t('auth.registrationForm.privacyLabel')"
        plain
        :invalid="!!errors.acceptedDataProtection"
        :described-by="
          errors.acceptedDataProtection
            ? 'acceptedDataProtection-error'
            : undefined
        "
      >
        <i18n-t keypath="auth.registrationForm.privacyConsent">
          <template #privacy>
            <NuxtLink
              :to="shopLocale.contentPaths.privacy"
              class="font-semibold text-sb-primary-ink underline underline-offset-2"
              >{{ $t("auth.registrationForm.privacyLink") }}</NuxtLink
            >
          </template>
        </i18n-t>
      </SbCheckbox>
      <p
        v-if="errors.acceptedDataProtection"
        id="acceptedDataProtection-error"
        class="text-sm font-semibold text-sb-danger"
      >
        {{ errors.acceptedDataProtection }}
      </p>
    </div>

    <SbButton type="submit" size="lg" block :loading="submitting">
      {{ $t("auth.registrationForm.submit") }}
    </SbButton>
  </form>
</template>
