import { describe, it, expect, vi, afterEach } from "vitest";
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { computed, nextTick, ref } from "vue";
import Hero from "~/components/Hero.vue";
import type { StoreStatus } from "~/composables/useStoreStatus";

const { liveState } = vi.hoisted(() => ({
  liveState: {
    status: null as StoreStatus | null,
    isCheckoutEnabled: true,
  },
}));

mockNuxtImport("useStoreStatus", () => () => ({
  status: ref(liveState.status),
}));

mockNuxtImport("useShopBiteConfig", () => () => ({
  deliveryTime: computed(() => 30),
  isCheckoutEnabled: computed(() => liveState.isCheckoutEnabled),
}));

const props = {
  title: "Pizzeria",
  links: [],
  backgroundVideo: "https://cdn.example.com/hero.mp4",
  poster: "/hero-poster.webp",
};

function stubMatchMedia(matches: boolean) {
  const listeners: Array<(event: { matches: boolean }) => void> = [];
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    addEventListener: (_: string, listener: (typeof listeners)[number]) =>
      listeners.push(listener),
  }));
  return (next: boolean) =>
    listeners.forEach((listener) => listener({ matches: next }));
}

describe("Hero", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    liveState.status = null;
    liveState.isCheckoutEnabled = true;
  });

  it("shows the delivery time before the store status is known", async () => {
    stubMatchMedia(false);

    const wrapper = await mountSuspended(Hero, { props });

    expect(wrapper.find('[data-testid="hero-status"]').exists()).toBe(false);
    const delivery = wrapper.find('[data-testid="hero-delivery"]');
    expect(delivery.text()).toBe("Lieferung ca. 30 Min");
    // Phones show it in its own row; from sm it waits for the status.
    expect(delivery.classes()).toContain("sm:hidden");
  });

  it("shows status and delivery time side by side once the status is known", async () => {
    stubMatchMedia(false);
    liveState.status = { open: false, nextOpening: "17:30 Uhr" };

    const wrapper = await mountSuspended(Hero, { props });

    expect(wrapper.find('[data-testid="hero-status"]').text()).toBe(
      "Geschlossen · öffnet 17:30 Uhr",
    );
    expect(
      wrapper.find('[data-testid="hero-delivery"]').classes(),
    ).not.toContain("sm:hidden");
  });

  it("hides the delivery time when the checkout is disabled", async () => {
    stubMatchMedia(false);
    liveState.status = { open: true, closesAt: "23:00" };
    liveState.isCheckoutEnabled = false;

    const wrapper = await mountSuspended(Hero, { props });

    expect(wrapper.find('[data-testid="hero-status"]').text()).toBe(
      "Geöffnet bis 23:00",
    );
    expect(wrapper.find('[data-testid="hero-delivery"]').exists()).toBe(false);
  });

  it("renders the poster as high-priority image and no video on narrow screens", async () => {
    stubMatchMedia(false);

    const wrapper = await mountSuspended(Hero, { props });

    const poster = wrapper.find("img");
    expect(poster.attributes("src")).toBe("/hero-poster.webp");
    expect(poster.attributes("fetchpriority")).toBe("high");
    expect(wrapper.find("video").exists()).toBe(false);
  });

  it("adds the video on wide screens, with the poster and without eager loading", async () => {
    const changeViewport = stubMatchMedia(true);

    const wrapper = await mountSuspended(Hero, { props });

    const video = wrapper.find("video");
    expect(video.exists()).toBe(true);
    expect(video.attributes("poster")).toBe("/hero-poster.webp");
    expect(video.attributes("preload")).toBe("metadata");
    expect(video.attributes("fetchpriority")).toBeUndefined();
    expect(video.find("source").attributes("src")).toBe(props.backgroundVideo);

    changeViewport(false);
    await nextTick();
    expect(wrapper.find("video").exists()).toBe(false);
  });

  it("renders neither poster nor video without media", async () => {
    stubMatchMedia(true);

    const wrapper = await mountSuspended(Hero, {
      props: { title: "Pizzeria", links: [] },
    });

    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find("video").exists()).toBe(false);
  });
});
