import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import Hero from "~/components/Home/Hero.vue";
import Facts from "~/components/Home/Facts.vue";

// The home page shows the lead times of the delivery and pickup methods
// (shopbite#6) and leaves out a time no shipping method has.
const { times } = vi.hoisted(() => ({
  times: {
    delivery: 45 as number | null,
    pickup: 20 as number | null,
  },
}));

mockNuxtImport("useShopBiteConfig", () => () => ({
  deliveryTime: ref(times.delivery),
  pickupTime: ref(times.pickup),
}));

mockNuxtImport("useStoreStatus", () => () => ({
  status: ref({ open: true, closesAt: "22:00" }),
}));

mockNuxtImport("useBusinessHours", () => () => ({
  businessHours: ref(null),
}));

const features = [
  {
    title: "Lieferung",
    kind: "delivery" as const,
    description: "Liefergebiet",
  },
  { title: "Abholung", kind: "pickup" as const, description: "Im Restaurant" },
];

describe("lead times on the home page", () => {
  beforeEach(() => {
    times.delivery = 45;
    times.pickup = 20;
  });

  it("shows delivery and pickup time in the hero", async () => {
    const wrapper = await mountSuspended(Hero, { props: { title: "Pizza" } });
    const text = wrapper.text();
    expect(text).toContain("Lieferung ca. 45 Min");
    expect(text).toContain("Abholung ca. 20 Min");
  });

  it("leaves out a time without a shipping method of that kind", async () => {
    times.delivery = null;
    const wrapper = await mountSuspended(Hero, { props: { title: "Pizza" } });
    const text = wrapper.text();
    expect(text).not.toContain("Lieferung ca.");
    expect(text).toContain("Abholung ca. 20 Min");
  });

  it("fills the delivery and pickup facts", async () => {
    const wrapper = await mountSuspended(Facts, { props: { features } });
    const text = wrapper.text();
    expect(text).toContain("In ca. 45 Minuten bei Ihnen");
    expect(text).toContain("Abholbereit in ca. 20 Minuten");
  });

  it("keeps the content lead without a lead time", async () => {
    times.delivery = null;
    times.pickup = null;
    const wrapper = await mountSuspended(Facts, {
      props: {
        features: [{ ...features[0]!, lead: "Frei Haus ab 15 €" }],
      },
    });
    const text = wrapper.text();
    expect(text).toContain("Frei Haus ab 15 €");
    expect(text).not.toContain("Minuten");
  });
});
