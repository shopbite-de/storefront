import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { renderToString } from "@vue/server-renderer";
import { createSSRApp, h, nextTick } from "vue";
import AnimatedSection from "~/components/AnimatedSection.vue";

describe("AnimatedSection", () => {
  let intersectionCallback: IntersectionObserverCallback;

  beforeEach(() => {
    global.IntersectionObserver = vi.fn().mockImplementation(function (
      this: IntersectionObserver,
      callback: IntersectionObserverCallback,
    ) {
      intersectionCallback = callback;
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
    }) as unknown as typeof IntersectionObserver;
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the content visible in the server HTML", async () => {
    const app = createSSRApp({
      render: () =>
        h(AnimatedSection, null, { default: () => h("p", "Pizza Salami") }),
    });

    const html = await renderToString(app);

    expect(html).toContain("Pizza Salami");
    expect(html).toContain("opacity-100");
    expect(html).not.toContain("opacity-0");
  });

  it("only hides a section that is out of view after mount, then reveals it", async () => {
    const wrapper = await mountSuspended(AnimatedSection, {
      slots: { default: () => "Pizza Salami" },
    });
    const section = wrapper.find("div");

    expect(section.classes()).toContain("opacity-100");

    intersectionCallback(
      [
        { isIntersecting: false, target: section.element },
      ] as unknown as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    );
    await nextTick();
    expect(section.classes()).toContain("opacity-0");
    expect(section.classes()).toContain("translate-y-20");

    intersectionCallback(
      [
        { isIntersecting: true, target: section.element },
      ] as unknown as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    );
    await nextTick();
    expect(section.classes()).toContain("opacity-100");
  });
});
