import { describe, it, expect, vi } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import HeaderTitle from "~/components/Header/Title.vue";

const { mockRuntimeConfig } = vi.hoisted(() => ({
  mockRuntimeConfig: {
    app: {
      baseURL: "/",
    },
    public: {
      site: {
        name: "ShopBite Test Store",
      },
    },
  },
}));

mockNuxtImport("useRuntimeConfig", () => () => mockRuntimeConfig);

describe("HeaderTitle", () => {
  it("renders the site name for screen readers", async () => {
    const component = await mountSuspended(HeaderTitle);
    const srOnly = component.find(".sr-only");
    expect(srOnly.exists()).toBe(true);
    expect(srOnly.text()).toBe("ShopBite Test Store");
  });

  it("renders a link to the home page", async () => {
    const component = await mountSuspended(HeaderTitle);
    const link = component.findComponent({ name: "NuxtLink" });
    expect(link.exists()).toBe(true);
    expect(link.props("to")).toBe("/");
  });

  it("renders the logo image", async () => {
    const component = await mountSuspended(HeaderTitle);
    const image = component.findComponent({ name: "UColorModeImage" });
    expect(image.exists()).toBe(true);
    expect(image.props("light")).toBe("/light/Logo.png");
    expect(image.props("dark")).toBe("/dark/Logo.png");
  });
});
