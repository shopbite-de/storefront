import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useScrollAnimation } from "~/composables/useScrollAnimation";
import { mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";

const TestComponent = defineComponent({
  setup() {
    const { isHidden, elementRef } = useScrollAnimation();
    return { isHidden, elementRef };
  },
  template: '<div ref="elementRef"></div>',
});

describe("useScrollAnimation", () => {
  let observeMock: ReturnType<typeof vi.fn>;
  let unobserveMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;
  let intersectionCallback: IntersectionObserverCallback;

  const intersect = (isIntersecting: boolean) =>
    intersectionCallback(
      [
        { isIntersecting, target: document.createElement("div") },
      ] as unknown as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    );

  beforeEach(() => {
    observeMock = vi.fn();
    unobserveMock = vi.fn();
    disconnectMock = vi.fn();

    global.IntersectionObserver = vi.fn().mockImplementation(function (
      this: IntersectionObserver,
      callback: IntersectionObserverCallback,
    ) {
      intersectionCallback = callback;
      this.observe = observeMock as unknown as IntersectionObserver["observe"];
      this.unobserve =
        unobserveMock as unknown as IntersectionObserver["unobserve"];
      this.disconnect =
        disconnectMock as unknown as IntersectionObserver["disconnect"];
    }) as unknown as typeof IntersectionObserver;

    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders visible before mount and starts observing on mount", async () => {
    const wrapper = mount(TestComponent);
    expect(wrapper.vm.isHidden).toBe(false);

    await nextTick();
    expect(global.IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ rootMargin: "100000px 0px -100px 0px" }),
    );
    expect(observeMock).toHaveBeenCalled();
  });

  it("keeps an element that is already in view visible and stops observing", async () => {
    const wrapper = mount(TestComponent);
    await nextTick();

    intersect(true);
    await nextTick();

    expect(wrapper.vm.isHidden).toBe(false);
    expect(unobserveMock).toHaveBeenCalled();
  });

  it("hides an element below the fold until it scrolls into view", async () => {
    const wrapper = mount(TestComponent);
    await nextTick();

    intersect(false);
    await nextTick();
    expect(wrapper.vm.isHidden).toBe(true);
    expect(unobserveMock).not.toHaveBeenCalled();

    intersect(true);
    await nextTick();
    expect(wrapper.vm.isHidden).toBe(false);
    expect(unobserveMock).toHaveBeenCalled();
  });

  it("never hides content for users who prefer reduced motion", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));

    const wrapper = mount(TestComponent);
    await nextTick();

    expect(global.IntersectionObserver).not.toHaveBeenCalled();
    expect(wrapper.vm.isHidden).toBe(false);
  });

  it("disconnects the observer on unmount", async () => {
    const wrapper = mount(TestComponent);
    await nextTick();

    wrapper.unmount();
    expect(disconnectMock).toHaveBeenCalled();
  });
});
