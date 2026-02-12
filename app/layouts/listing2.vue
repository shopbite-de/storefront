<script setup lang="ts"></script>

<template>
  <UPage>
    <div class="sticky top-16 left-0 z-20 w-full backdrop-blur-md rounded-md">
      <NavigationMobileTop2 :should-skip-first-level="true" />
    </div>
    <slot />
  </UPage>
</template>
