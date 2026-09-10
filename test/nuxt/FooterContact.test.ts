import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import FooterContact from "~/components/Footer/Contact.vue";

const { businessHours } = vi.hoisted(() => ({
  businessHours: {
    value: [] as Array<{
      dayOfWeek: number;
      openingTime: string;
      closingTime: string;
    }>,
  },
}));

mockNuxtImport("useBusinessHours", () => () => ({
  businessHours: ref(businessHours.value),
  refresh: vi.fn(),
}));

// A useRuntimeConfig mock would also have to provide `app.baseURL` for the
// router setup of the test environment; setting the real config is simpler.
function setSite(site: {
  street?: string;
  postalCode?: string;
  city?: string;
  telephone?: string;
  googleBusinessProfileUrl?: string;
}) {
  const config = useRuntimeConfig().public.site;
  Object.assign(config, {
    name: "Pizzeria Test",
    telephone: site.telephone ?? "",
    googleBusinessProfileUrl: site.googleBusinessProfileUrl ?? "",
  });
  Object.assign(config.address, {
    street: site.street ?? "",
    postalCode: site.postalCode ?? "",
    city: site.city ?? "",
  });
}

describe("FooterContact", () => {
  beforeEach(() => {
    businessHours.value = [];
    setSite({});
  });

  it("renders address, phone link, Google link and grouped opening hours", async () => {
    setSite({
      street: "Kantstr. 6",
      postalCode: "63179",
      city: "Obertshausen",
      telephone: "+49 6104 71427",
      googleBusinessProfileUrl: "https://maps.google.com/?cid=123",
    });
    businessHours.value = [
      { dayOfWeek: 1, openingTime: "11:30:00", closingTime: "14:30:00" },
      { dayOfWeek: 3, openingTime: "11:30:00", closingTime: "14:30:00" },
    ];

    const wrapper = await mountSuspended(FooterContact);
    const text = wrapper.text();

    expect(wrapper.find("address").exists()).toBe(true);
    expect(text).toContain("Pizzeria Test");
    expect(text).toContain("Kantstr. 6");
    expect(text).toContain("63179 Obertshausen");
    expect(wrapper.find('a[href="tel:+49610471427"]').text()).toContain(
      "+49 6104 71427",
    );
    expect(
      wrapper.find('a[href="https://maps.google.com/?cid=123"]').exists(),
    ).toBe(true);
    expect(text).toContain("Öffnungszeiten");
    expect(text).toContain("Di");
    expect(text).toContain("Ruhetag");
    expect(text).toContain("11:30–14:30");
  });

  it("hides empty contact values", async () => {
    setSite({ city: "Obertshausen" });

    const wrapper = await mountSuspended(FooterContact);

    expect(wrapper.text()).toContain("Obertshausen");
    expect(wrapper.find('a[href^="tel:"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Auf Google ansehen");
    expect(wrapper.text()).not.toContain("Öffnungszeiten");
  });

  it("renders nothing without contact data and opening hours", async () => {
    const wrapper = await mountSuspended(FooterContact);

    expect(wrapper.find("address").exists()).toBe(false);
    expect(wrapper.text()).toBe("");
  });
});
