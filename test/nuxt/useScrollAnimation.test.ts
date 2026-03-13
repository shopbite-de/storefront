import { describe, it, expect, vi, beforeEach } from "vitest";
import { useScrollAnimation } from "~/composables/useScrollAnimation";
import { mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";

describe("useScrollAnimation", () => {
  let observeMock: ReturnType<typeof vi.fn>;
  let unobserveMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;
  let intersectionCallback: IntersectionObserverCallback;

  beforeEach(() => {
    observeMock = vi.fn();
    unobserveMock = vi.fn();
    disconnectMock = vi.fn();

    // Mock IntersectionObserver
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
  });

  it("should initialize with isVisible false", () => {
    const TestComponent = defineComponent({
      setup() {
        const { isVisible, elementRef } = useScrollAnimation();
        return { isVisible, elementRef };
      },
      template: '<div ref="elementRef"></div>',
    });

    const wrapper = mount(TestComponent);
    expect(wrapper.vm.isVisible).toBe(false);
  });

  it("should start observing on mount", async () => {
    const TestComponent = defineComponent({
      setup() {
        const { isVisible, elementRef } = useScrollAnimation();
        return { isVisible, elementRef };
      },
      template: '<div ref="elementRef"></div>',
    });

    mount(TestComponent);
    await nextTick();

    expect(global.IntersectionObserver).toHaveBeenCalled();
    expect(observeMock).toHaveBeenCalled();
  });

  it("should set isVisible to true when intersecting and stop observing", async () => {
    const TestComponent = defineComponent({
      setup() {
        const { isVisible, elementRef } = useScrollAnimation();
        return { isVisible, elementRef };
      },
      template: '<div ref="elementRef"></div>',
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    // Simulate intersection
    const mockEntry = { isIntersecting: true, target: wrapper.element };
    intersectionCallback([mockEntry]);

    await nextTick();
    expect(wrapper.vm.isVisible).toBe(true);
    expect(unobserveMock).toHaveBeenCalledWith(wrapper.element);
  });

  it("should not set isVisible to true when not intersecting", async () => {
    const TestComponent = defineComponent({
      setup() {
        const { isVisible, elementRef } = useScrollAnimation();
        return { isVisible, elementRef };
      },
      template: '<div ref="elementRef"></div>',
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    // Simulate non-intersection
    const mockEntry = { isIntersecting: false, target: wrapper.element };
    intersectionCallback([mockEntry]);

    await nextTick();
    expect(wrapper.vm.isVisible).toBe(false);
    expect(unobserveMock).not.toHaveBeenCalled();
  });
});
