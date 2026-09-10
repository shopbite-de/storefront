import { describe, it, expect, vi, afterEach } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { nextTick } from "vue";
import Hero from "~/components/Hero.vue";

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
