import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import { useShopConfig } from "~/composables/useShopConfig";

const { load } = vi.hoisted(() => ({ load: vi.fn() }));

mockNuxtImport("loadShopData", () => load);

mockNuxtImport(
  "useAsyncData",
  () => (_key: string, fetcher: () => Promise<unknown>) => {
    const data = ref<unknown>(null);
    const refresh = async () => {
      data.value = await fetcher();
    };
    return { data, refresh };
  },
);

const CONFIG = {
  acceptsOrders: true,
  timeZone: "Europe/Vienna",
  telephone: null,
  address: null,
  googleBusinessProfileUrl: null,
};

describe("useShopConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts no orders and assumes Berlin until the config is loaded", () => {
    const { acceptsOrders, timeZone } = useShopConfig();
    expect(acceptsOrders.value).toBe(false);
    expect(timeZone.value).toBe("Europe/Berlin");
  });

  it("loads the restaurant's configuration", async () => {
    load.mockResolvedValue(CONFIG);
    const { refresh, acceptsOrders, timeZone } = useShopConfig();
    await refresh();
    expect(load).toHaveBeenCalledWith("/api/shop/config", true);
    expect(acceptsOrders.value).toBe(true);
    expect(timeZone.value).toBe("Europe/Vienna");
  });

  it("asks for the live switch before an order", async () => {
    load.mockResolvedValue({ ...CONFIG, acceptsOrders: false });
    const { checkAcceptsOrders, acceptsOrders } = useShopConfig();

    expect(await checkAcceptsOrders([])).toBe(false);
    expect(acceptsOrders.value).toBe(false);
    expect(load).toHaveBeenCalledWith("/api/shop/config", true, []);
  });

  it("reports an unknown switch when the backend fails", async () => {
    load.mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { checkAcceptsOrders } = useShopConfig();
    expect(await checkAcceptsOrders([])).toBeNull();
  });
});
