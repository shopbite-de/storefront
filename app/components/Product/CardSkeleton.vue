<template>
  <!-- placeholder of a bon card while the menu loads -->
  <div
    class="flex h-28 overflow-hidden rounded-sb-card bg-sb-surface motion-safe:animate-pulse"
    aria-hidden="true"
  >
    <div class="w-[60px] shrink-0 bg-sb-muted sm:w-[72px]" />
    <div class="flex flex-1 flex-col gap-2 p-4">
      <div class="h-5 w-40 rounded bg-sb-muted" />
      <div class="h-4 w-56 max-w-full rounded bg-sb-muted" />
      <div class="mt-auto h-4 w-14 rounded bg-sb-muted" />
    </div>
  </div>
</template>
