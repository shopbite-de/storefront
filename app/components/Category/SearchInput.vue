<script setup lang="ts">
/** Search from the menu page; results open on /suche. */
const router = useRouter();

const query = ref("");
const id = useId();

function submit() {
  const term = query.value.trim();
  if (!term) return;
  router.push({ path: "/suche", query: { q: term } });
}
</script>

<template>
  <form role="search" class="flex gap-2 font-body" @submit.prevent="submit">
    <label :for="id" class="sr-only">Speisekarte durchsuchen</label>
    <SbInput
      :id="id"
      v-model="query"
      name="search"
      type="search"
      enterkeyhint="search"
      placeholder="Gericht oder Zutat suchen"
      class="flex-1"
    />
    <SbIconButton
      label="Suchen"
      type="submit"
      variant="tint"
      class="size-[50px]"
    >
      <SbIcon name="search" />
    </SbIconButton>
  </form>
</template>
