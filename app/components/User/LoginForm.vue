<script setup lang="ts">
import * as z from "zod";
import { useWishlist, useUser } from "@shopware/composables";
import type { FormSubmitEvent } from "@nuxt/ui";

const { isLoggedIn, login, user } = useUser();
const { mergeWishlistProducts } = useWishlist();
const toast = useToast();

const props = withDefaults(
  defineProps<{
    title?: string;
    icon?: string;
    withRegisterHint?: boolean;
  }>(),
  {
    title: "",
    icon: "",
    withRegisterHint: false,
  },
);

const emit = defineEmits<{
  "login-success": [data: string];
}>();

const { title, icon } = toRefs(props);

if (isLoggedIn.value) {
  navigateTo({ path: "/konto" });
}

const fields = [
  {
    name: "email",
    type: "text" as const,
    label: "Email",
    placeholder: "Email-Adresse eingeben",
    required: true,
  },
  {
    name: "password",
    label: "Passwort",
    type: "password" as const,
    placeholder: "Passwort eingeben",
    required: true,
  },
];

const schema = z.object({
  email: z.string().email("Email Adresse nicht gültig"),
  password: z.string().min(8, "Mindestens 8 Zeichen"),
});

type Schema = z.output<typeof schema>;

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  await login({
    username: payload.data.email,
    password: payload.data.password,
  });
  toast.add({
    title: "Hallo " + user.value.firstName + " " + user.value.lastName + "!",
    description: "Erfolreich angemeldet.",
    color: "success",
  });
  mergeWishlistProducts();
  emit("login-success", payload.data.email);
}
</script>

<template>
  <UAuthForm
    :schema="schema"
    :title="title"
    :icon="icon"
    :fields="fields"
    :submit="{
      label: 'Anmelden',
    }"
    @submit="onSubmit"
  >
    <template v-if="withRegisterHint" #description>
      Noch kein Konto erstellt?
      <ULink to="registrierung" class="text-primary font-medium"
        >Jetzt erstellen</ULink
      >.
    </template>
    <template #password-hint>
      <ULink
        to="passwort-vergessen"
        class="text-primary font-medium"
        tabindex="-1"
        >Passwort vergessen?</ULink
      >
    </template>
    <template #footer>
      Bei Anmeldung stimmst du unseren
      <ULink to="datenschutz" class="text-primary font-medium"
        >Datenschutzbestimmungen</ULink
      >
      zu.
    </template>
  </UAuthForm>
</template>
