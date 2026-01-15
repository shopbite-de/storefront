import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import SalesChannelSwitch from "~/components/SalesChannelSwitch.vue";
import { ref } from "vue";

// Mock window.location
const mockWindowLocation = {
  href: "",
};

// Mock the sales channels data that would be returned by useFetch
const mockSalesChannels = [
  {
    label: "Main Store",
    value: "https://main-store.example.com",
  },
  {
    label: "Secondary Store",
    value: "https://secondary-store.example.com",
  },
];

// Use vi.hoisted to avoid hoisting issues
const { mockUseFetch, mockRuntimeConfig } = vi.hoisted(() => ({
  mockUseFetch: vi.fn(() => {
    return {
      data: ref(mockSalesChannels),
      status: ref("success"),
    };
  }),
  mockRuntimeConfig: {
    public: {
      shopBite: {
        feature: {
          multiChannel: true,
        },
      },
      storeUrl: "https://main-store.example.com",
    },
  },
}));

// Set up the mocks at the top level
mockNuxtImport("useRuntimeConfig", () => () => mockRuntimeConfig);
mockNuxtImport("useFetch", () => mockUseFetch);

describe("SalesChannelSwitch", () => {
  beforeEach(() => {
    // Reset window.location mock
    mockWindowLocation.href = "";
    global.window = { location: mockWindowLocation } as any;
    vi.clearAllMocks();

    // Reset default mock implementation for useFetch
    mockUseFetch.mockImplementation(() => {
      return {
        data: ref(mockSalesChannels),
        status: ref("success"),
      };
    });
  });

  it("should not render when multiChannel feature is disabled", async () => {
    // Temporarily disable multiChannel
    mockRuntimeConfig.public.shopBite.feature.multiChannel = false;

    const component = await mountSuspended(SalesChannelSwitch);

    // Should not render the select menu
    expect(component.findComponent({ name: "USelectMenu" }).exists()).toBe(
      false,
    );

    // Re-enable for other tests
    mockRuntimeConfig.public.shopBite.feature.multiChannel = true;
  });

  it("should render select menu when multiChannel feature is enabled", async () => {
    const component = await mountSuspended(SalesChannelSwitch);

    // Should render the select menu
    const selectMenu = component.findComponent({ name: "USelectMenu" });
    expect(selectMenu.exists()).toBe(true);
    expect(selectMenu.props("icon")).toBe("i-lucide-store");
  });

  it("should load and transform sales channels correctly", async () => {
    const component = await mountSuspended(SalesChannelSwitch);

    const selectMenu = component.findComponent({ name: "USelectMenu" });
    const items = selectMenu.props("items");

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      label: "Main Store",
      value: "https://main-store.example.com",
    });
    expect(items[1]).toEqual({
      label: "Secondary Store",
      value: "https://secondary-store.example.com",
    });
  });

  it("should select the current store URL by default", async () => {
    const component = await mountSuspended(SalesChannelSwitch);

    const selectMenu = component.findComponent({ name: "USelectMenu" });
    const modelValue = selectMenu.props("modelValue");

    expect(modelValue).toEqual({
      label: "Main Store",
      value: "https://main-store.example.com",
    });
  });

  it("should show loading state when fetching data", async () => {
    // Mock pending state
    mockUseFetch.mockImplementationOnce(() => {
      return {
        data: ref(null),
        status: ref("pending"),
      };
    });

    const component = await mountSuspended(SalesChannelSwitch);

    const selectMenu = component.findComponent({ name: "USelectMenu" });
    expect(selectMenu.props("loading")).toBe(true);
  });

  it("should redirect to new store URL when selection changes", async () => {
    const component = await mountSuspended(SalesChannelSwitch);

    const selectMenu = component.findComponent({ name: "USelectMenu" });

    // Change the selection
    await selectMenu.setValue({
      label: "Secondary Store",
      value: "https://secondary-store.example.com",
    });

    // Should have redirected
    expect(mockWindowLocation.href).toBe("https://secondary-store.example.com");
  });

  it("should not redirect on initial selection", async () => {
    // Mock that no initial selection was made
    mockRuntimeConfig.public.storeUrl = "https://unknown-store.example.com";

    const component = await mountSuspended(SalesChannelSwitch);

    // Should not redirect immediately
    expect(mockWindowLocation.href).toBe("");

    // Restore original store URL
    mockRuntimeConfig.public.storeUrl = "https://main-store.example.com";
  });

  it("should handle empty sales channels gracefully", async () => {
    // Mock empty sales channels
    mockUseFetch.mockImplementationOnce(() => {
      return {
        data: ref([]),
        status: ref("success"),
      };
    });

    const component = await mountSuspended(SalesChannelSwitch);

    const selectMenu = component.findComponent({ name: "USelectMenu" });
    const items = selectMenu.props("items");

    expect(items).toHaveLength(0);
  });

  it("should handle sales channels without domains", async () => {
    const mockChannelsWithoutDomains = [
      {
        label: "Store Without Domain",
        value: "",
      },
    ];

    mockUseFetch.mockImplementationOnce(() => {
      return {
        data: ref(mockChannelsWithoutDomains),
        status: ref("success"),
      };
    });

    const component = await mountSuspended(SalesChannelSwitch);

    const selectMenu = component.findComponent({ name: "USelectMenu" });
    const items = selectMenu.props("items");

    expect(items[0]).toEqual({
      label: "Store Without Domain",
      value: "",
    });
  });
});
