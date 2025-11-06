<script setup lang="ts">
import {
  PhoneIcon,
  BookOpenIcon,
  HeartIcon,
  MapPinIcon,
  HomeIcon,
} from "@heroicons/vue/24/outline";

const route = useRoute();
</script>

<template>
  <div
    class="backdrop-blur bg-white/30 fixed bottom-0 w-full px-2 md:hidden z-50"
  >
    <div class="flex flex-row justify-between items-center py-2 gap-1">
      <NuxtLink
        title="Routenplaner"
        class="flex flex-col justify-center items-center bg-blackish rounded-md px-3.5 py-2.5 basis-1/4 gap-2"
        to="https://www.openstreetmap.org/directions?from=&to=50.080610%2C8.863783#map=19/50.080323/8.864079"
      >
        <MapPinIcon class="w-5 h-5 text-white" />
        <div class="text-white text-xs">Route</div>
      </NuxtLink>
      <NuxtLink
        title="Zu deiner Merkliste"
        to="/merkliste"
        class="flex flex-col justify-center items-center bg-blackish rounded-md px-3.5 py-2.5 basis-1/4 gap-2"
        :class="{ hidden: route.name === 'merkliste' }"
      >
        <HeartIcon class="w-5 h-5 text-white" />
        <div class="text-white text-xs">Merkliste</div>
      </NuxtLink>
      <NuxtLink
        title="Zur Startseite"
        to="/"
        class="flex flex-col justify-center items-center bg-blackish rounded-md px-3.5 py-2.5 basis-1/4 gap-2"
        :class="{ hidden: route.name === 'index' }"
      >
        <HomeIcon class="w-5 h-5 text-white" />
        <div class="text-white text-xs">Startseite</div>
      </NuxtLink>
      <NuxtLink
        title="Zur Speisekarte"
        to="/speisekarte"
        class="flex flex-col justify-center items-center bg-blackish rounded-md px-3.5 py-2.5 basis-1/4 gap-2"
        :class="{ hidden: route.name === 'speisekarte' }"
      >
        <BookOpenIcon class="w-5 h-5 text-white" />
        <div class="text-white text-xs">Speisekarte</div>
      </NuxtLink>
      <NuxtLink
        title="Anrufen"
        to="tel:+49610471427"
        class="flex flex-col justify-center items-center bg-blackish rounded-md px-3.5 py-2.5 basis-1/4 gap-2"
      >
        <PhoneIcon class="w-5 h-5 text-white" />
        <div class="text-white text-xs">Anrufen</div>
      </NuxtLink>
    </div>
  </div>
</template>
