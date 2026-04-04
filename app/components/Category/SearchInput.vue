<script setup lang="ts">
const router = useRouter();

const query = ref("");

function submit() {
  const term = query.value.trim();
  if (!term) return;
  router.push({ path: "/suche", query: { q: term } });
}
</script>

<template>
  <UInput
    v-model="query"
    name="search"
    size="md"
    icon="i-lucide-search"
    placeholder="Produkte suchen..."
    @keyup.enter="submit"
  >
    <template v-if="query" #trailing>
      <UButton
        color="neutral"
        variant="link"
        size="sm"
        icon="i-lucide-circle-x"
        aria-label="Suche leeren"
        @click="query = ''"
      />
    </template>
  </UInput>
</template>
