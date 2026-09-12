<template>
  <div
    class="flex flex-col gap-3 rounded-xl bg-default p-4 shadow-md ring ring-default"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-col gap-2">
        <USkeleton class="h-3 w-8" />
        <USkeleton class="h-5 w-40" />
      </div>
      <USkeleton class="h-5 w-14" />
    </div>
    <div class="flex gap-1.5">
      <USkeleton class="h-6 w-24 rounded-full" />
      <USkeleton class="h-6 w-20 rounded-full" />
      <USkeleton class="h-6 w-16 rounded-full" />
    </div>
    <div class="flex gap-2">
      <USkeleton class="size-11 rounded-md" />
      <USkeleton class="h-11 flex-1 rounded-md" />
    </div>
  </div>
</template>
