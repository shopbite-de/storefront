import { describe, it, expect, vi, beforeEach } from "vitest";
import { useScrollAnimation } from "../../app/composables/useScrollAnimation";
import { mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";

describe("useScrollAnimation", () => {
  let observeMock: any;
  let unobserveMock: any;
  let disconnectMock: any;
  let intersectionCallback: any;

  beforeEach(() => {
    observeMock = vi.fn();
    unobserveMock = vi.fn();
    disconnectMock = vi.fn();

    // Mock IntersectionObserver
    global.IntersectionObserver = vi
      .fn()
      .mockImplementation(function (callback) {
        intersectionCallback = callback;
        this.observe = observeMock;
        this.unobserve = unobserveMock;
        this.disconnect = disconnectMock;
      }) as any;
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
