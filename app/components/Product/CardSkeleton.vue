<template>
  <div
    class="ring-1 ring-accented rounded-xl shadow-lg p-4 flex flex-row gap-4"
  >
    <div class="flex flex-col gap-3 flex-1 min-w-0">
      <USkeleton class="h-5 w-20 rounded-full" />
      <div class="flex items-baseline gap-2">
        <USkeleton class="h-3.5 w-7" />
        <USkeleton class="h-3.5 w-36" />
      </div>
      <div class="flex flex-col gap-2">
        <USkeleton class="h-3 w-full" />
        <USkeleton class="h-3 w-5/6" />
        <USkeleton class="h-3 w-1/2" />
      </div>
      <div class="flex justify-between items-center mt-auto pt-2">
        <USkeleton class="h-4 w-14" />
        <div class="flex gap-2">
          <USkeleton class="h-8 w-8 rounded-md" />
          <USkeleton class="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
    <USkeleton class="size-28 rounded-md shrink-0" />
  </div>
</template>
