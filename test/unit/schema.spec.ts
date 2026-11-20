import { describe, expect, it } from "vitest";
import {
  buildFaqPageSchema,
  buildMenuSectionSchema,
  buildOpeningHoursSpecification,
  buildRestaurantSchema,
  buildSpecialOpeningHoursSpecification,
} from "../../app/utils/schema";
import {
  holiday,
  openingInterval,
  sortOpeningHours,
  type Weekday,
} from "../../shared/domain";

type Row = [Weekday, string, string];
const hours = (rows: Row[]) =>
  sortOpeningHours(
    rows.map(([weekday, opens, closes]) => ({
      weekday,
      interval: openingInterval(opens, closes),
    })),
  );
const lunch = (day: Weekday): Row => [day, "11:30", "14:30"];
const dinner = (day: Weekday): Row => [day, "17:30", "23:00"];

describe("buildOpeningHoursSpecification", () => {
  it("groups days with identical intervals", () => {
    // Sunday listed before Saturday in the data, sorted in the output
    const rows = ([1, 7, 3, 4, 5] as Weekday[]).flatMap((day) => [
      lunch(day),
      dinner(day),
    ]);
    rows.push(dinner(6));

    expect(buildOpeningHoursSpecification(hours(rows))).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Wednesday", "Thursday", "Friday", "Sunday"],
        opens: "11:30",
        closes: "14:30",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "17:30",
        closes: "23:00",
      },
    ]);
  });

  it("has no entries without opening hours", () => {
    expect(buildOpeningHoursSpecification(hours([]))).toEqual([]);
  });

  it("closes a late-night opening after midnight, a full day at 23:59", () => {
    expect(
      buildOpeningHoursSpecification(
        hours([
          [5, "17:00", "24:00"],
          [6, "00:00", "01:30"],
          [7, "12:00", "24:00"],
          [1, "00:00", "24:00"],
        ]),
      ),
    ).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday"],
        opens: "00:00",
        closes: "23:59",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Friday"],
        opens: "17:00",
        closes: "01:30",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Sunday"],
        opens: "12:00",
        closes: "00:00",
      },
    ]);
  });
});

describe("buildSpecialOpeningHoursSpecification", () => {
  it("marks closing days with opens and closes at 00:00", () => {
    expect(
      buildSpecialOpeningHoursSpecification([
        holiday({ id: "h", firstDay: "2025-12-29", lastDay: "2026-01-01" }),
      ]),
    ).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        validFrom: "2025-12-29",
        validThrough: "2026-01-01",
        opens: "00:00",
        closes: "00:00",
      },
    ]);
  });
});

describe("buildRestaurantSchema", () => {
  const site = {
    name: "Pizzeria Esempio",
    description: "Italienisch-deutsche Küche in Musterstadt seit 1997.",
    url: "https://www.pizzeria-esempio.example",
    image: "https://www.pizzeria-esempio.example/card.png",
    telephone: "+49 123 456789",
    cuisine: "Italienisch",
    priceRange: "€€",
    googleBusinessProfileUrl: "https://maps.google.com/?cid=123",
    address: {
      street: "Musterstr. 1",
      // a number: Nuxt parses a numeric env value
      postalCode: 12345 as unknown as string,
      city: "Musterstadt",
      country: "DE",
    },
  };

  it("builds a full Restaurant node with menu sections", () => {
    const schema = buildRestaurantSchema({
      site,
      openingHours: hours([lunch(1)]),
      holidays: [
        holiday({ id: "h", firstDay: "2026-07-12", lastDay: "2026-08-05" }),
      ],
      menuUrl: "https://www.pizzeria-esempio.example/speisekarte",
      menuSections: [
        { name: "Pizza", url: "https://www.pizzeria-esempio.example/c/Pizza/" },
        {
          name: "Nudeln",
          sections: [
            {
              name: "Spaghetti",
              url: "https://www.pizzeria-esempio.example/c/Nudeln/Spaghetti/",
            },
          ],
        },
      ],
    });

    expect(schema).toEqual({
      "@context": "https://schema.org",
      "@type": "Restaurant",
      "@id": "https://www.pizzeria-esempio.example#restaurant",
      name: site.name,
      description: site.description,
      url: site.url,
      image: site.image,
      telephone: site.telephone,
      servesCuisine: "Italienisch",
      priceRange: "€€",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Musterstr. 1",
        postalCode: "12345",
        addressLocality: "Musterstadt",
        addressCountry: "DE",
      },
      sameAs: ["https://maps.google.com/?cid=123"],
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday"],
          opens: "11:30",
          closes: "14:30",
        },
      ],
      specialOpeningHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          validFrom: "2026-07-12",
          validThrough: "2026-08-05",
          opens: "00:00",
          closes: "00:00",
        },
      ],
      hasMenu: {
        "@type": "Menu",
        "@id": "https://www.pizzeria-esempio.example#menu",
        name: "Speisekarte",
        url: "https://www.pizzeria-esempio.example/speisekarte",
        hasMenuSection: [
          {
            "@type": "MenuSection",
            name: "Pizza",
            url: "https://www.pizzeria-esempio.example/c/Pizza/",
          },
          {
            "@type": "MenuSection",
            name: "Nudeln",
            hasMenuSection: [
              {
                "@type": "MenuSection",
                name: "Spaghetti",
                url: "https://www.pizzeria-esempio.example/c/Nudeln/Spaghetti/",
              },
            ],
          },
        ],
      },
    });
  });

  it("adds ordering, delivery areas, geo and payment", () => {
    const schema = buildRestaurantSchema({
      site: {
        ...site,
        deliveryAreas: ["12345 Musterstadt", "12346 Beispieldorf"],
        // strings: env values that are not plain numbers
        geo: { latitude: "50.0716", longitude: 8.8483 },
        acceptsReservations: "Nur telefonisch",
      },
      orderUrl: "https://www.pizzeria-esempio.example/speisekarte",
      paymentMethods: ["Barzahlung", "EC-Karte"],
      currency: "EUR",
    });

    expect(schema).toMatchObject({
      geo: { "@type": "GeoCoordinates", latitude: 50.0716, longitude: 8.8483 },
      areaServed: ["12345 Musterstadt", "12346 Beispieldorf"],
      acceptsReservations: "Nur telefonisch",
      paymentAccepted: "Barzahlung, EC-Karte",
      currenciesAccepted: "EUR",
      potentialAction: {
        "@type": "OrderAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://www.pizzeria-esempio.example/speisekarte",
          actionPlatform: [
            "https://schema.org/DesktopWebPlatform",
            "https://schema.org/MobileWebPlatform",
          ],
        },
        deliveryMethod: [
          "https://schema.org/OnSitePickup",
          "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet",
        ],
      },
    });
  });

  it("keeps acceptsReservations false and skips incomplete geo", () => {
    const schema = buildRestaurantSchema({
      site: {
        name: "ShopBite",
        url: "https://example.com",
        geo: { latitude: "50.07", longitude: "" },
        acceptsReservations: false,
      },
      orderUrl: "https://example.com/speisekarte",
    });

    expect(schema.geo).toBeUndefined();
    expect(schema.acceptsReservations).toBe(false);
    // no address and no delivery areas: no delivery method to state
    expect(schema.potentialAction).toEqual({
      "@type": "OrderAction",
      target: expect.objectContaining({
        urlTemplate: "https://example.com/speisekarte",
      }),
    });
  });

  it("lists other names of the shop as alternateName", () => {
    const schema = buildRestaurantSchema({
      site: {
        name: "Pizzeria Esempio",
        url: "https://www.pizzeria-esempio.example",
        alternateNames: ["Esempio / Alter Hof", "Alter Hof"],
      },
    });

    expect(schema.alternateName).toEqual(["Esempio / Alter Hof", "Alter Hof"]);
  });

  it("leaves empty values out", () => {
    const schema = buildRestaurantSchema({
      site: {
        name: "ShopBite",
        url: "https://example.com",
        alternateNames: [],
        telephone: "",
        address: { street: "", postalCode: "", city: "", country: "DE" },
      },
    });

    expect(schema).toEqual({
      "@context": "https://schema.org",
      "@type": "Restaurant",
      "@id": "https://example.com#restaurant",
      name: "ShopBite",
      url: "https://example.com",
    });
  });
});

describe("buildMenuSectionSchema", () => {
  it("lists the products with offers", () => {
    expect(
      buildMenuSectionSchema({
        name: "Pizza",
        description: "Alle Pizzen mit Tomatensoße und Käse.",
        url: "https://example.com/c/Pizza/",
        currency: "EUR",
        restaurantUrl: "https://example.com",
        items: [
          {
            name: "Pizza Salami",
            url: "https://example.com/c/Pizza/?produkt=22",
            description: "mit Salami",
            price: 9.5,
            image: "https://cdn.example.com/salami.webp",
          },
          { name: "Pizza Tonno", description: "" },
        ],
      }),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "MenuSection",
      name: "Pizza",
      description: "Alle Pizzen mit Tomatensoße und Käse.",
      url: "https://example.com/c/Pizza/",
      hasMenuItem: [
        {
          "@type": "MenuItem",
          name: "Pizza Salami",
          url: "https://example.com/c/Pizza/?produkt=22",
          description: "mit Salami",
          image: "https://cdn.example.com/salami.webp",
          offers: { "@type": "Offer", price: "9.50", priceCurrency: "EUR" },
        },
        { "@type": "MenuItem", name: "Pizza Tonno" },
      ],
      isPartOf: { "@type": "Menu", "@id": "https://example.com#menu" },
    });
  });

  it("falls back to the ingredients and adds the diets", () => {
    const schema = buildMenuSectionSchema({
      name: "Pizza",
      currency: "EUR",
      items: [
        {
          name: "Pizza Margherita",
          ingredients: ["Tomatensoße", "Mozzarella", "Basilikum"],
          diets: ["vegetarian"],
        },
        {
          name: "Pizza Verdure",
          description: "mit Grillgemüse",
          ingredients: ["Zucchini"],
          diets: ["vegetarian", "vegan"],
        },
        { name: "Pizza Salami", ingredients: [], diets: [] },
      ],
    });

    expect(schema.hasMenuItem).toEqual([
      {
        "@type": "MenuItem",
        name: "Pizza Margherita",
        description: "Tomatensoße, Mozzarella, Basilikum",
        suitableForDiet: ["https://schema.org/VegetarianDiet"],
      },
      {
        "@type": "MenuItem",
        name: "Pizza Verdure",
        description: "mit Grillgemüse",
        suitableForDiet: [
          "https://schema.org/VegetarianDiet",
          "https://schema.org/VeganDiet",
        ],
      },
      { "@type": "MenuItem", name: "Pizza Salami" },
    ]);
  });
});

describe("buildFaqPageSchema", () => {
  it("maps questions and answers", () => {
    expect(
      buildFaqPageSchema([
        { question: "Wohin liefern Sie?", answer: "Nach Musterstadt." },
      ]),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Wohin liefern Sie?",
          acceptedAnswer: { "@type": "Answer", text: "Nach Musterstadt." },
        },
      ],
    });
  });
});
