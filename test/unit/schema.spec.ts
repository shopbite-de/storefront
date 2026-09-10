import { describe, expect, it } from "vitest";
import {
  buildMenuSectionSchema,
  buildOpeningHoursSpecification,
  buildRestaurantSchema,
  buildSpecialOpeningHoursSpecification,
} from "../../app/utils/schema";

const lunch = (dayOfWeek: number) => ({
  dayOfWeek,
  openingTime: "11:30:00",
  closingTime: "14:30:00",
});
const dinner = (dayOfWeek: number) => ({
  dayOfWeek,
  openingTime: "17:30:00",
  closingTime: "23:00:00",
});

describe("buildOpeningHoursSpecification", () => {
  it("groups days with identical intervals", () => {
    // Sunday listed before Saturday in the data, sorted in the output
    const hours = [1, 7, 3, 4, 5].flatMap((day) => [lunch(day), dinner(day)]);
    hours.push(dinner(6));

    expect(buildOpeningHoursSpecification(hours)).toEqual([
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

  it("skips incomplete entries", () => {
    expect(
      buildOpeningHoursSpecification([
        { dayOfWeek: 8, openingTime: "11:30", closingTime: "14:30" },
        { dayOfWeek: 1, openingTime: "11:30" },
      ]),
    ).toEqual([]);
  });
});

describe("buildSpecialOpeningHoursSpecification", () => {
  it("marks closing days with opens and closes at 00:00", () => {
    expect(
      buildSpecialOpeningHoursSpecification([
        {
          start: "2025-12-29T20:57:00.000+00:00",
          end: "2026-01-01T22:59:00.000+00:00",
        },
        { start: "2026-07-12T21:00:00.000+00:00" },
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
    name: "Pizzeria La Fattoria",
    description: "Italienisch-deutsche Küche in Obertshausen seit 1997.",
    url: "https://www.pizzeria-lafattoria.de",
    image: "https://www.pizzeria-lafattoria.de/card.png",
    telephone: "+49 6104 71427",
    cuisine: "Italienisch",
    priceRange: "€€",
    googleBusinessProfileUrl: "https://maps.google.com/?cid=123",
    address: {
      street: "Kantstr. 6",
      // a number: Nuxt parses a numeric env value
      postalCode: 63179 as unknown as string,
      city: "Obertshausen",
      country: "DE",
    },
  };

  it("builds a full Restaurant node with menu sections", () => {
    const schema = buildRestaurantSchema({
      site,
      businessHours: [lunch(1)],
      holidays: [
        { start: "2026-07-12T21:00:00Z", end: "2026-08-05T22:00:00Z" },
      ],
      menuUrl: "https://www.pizzeria-lafattoria.de/speisekarte",
      menuSections: [
        { name: "Pizza", url: "https://www.pizzeria-lafattoria.de/c/Pizza/" },
        {
          name: "Nudeln",
          sections: [
            {
              name: "Spaghetti",
              url: "https://www.pizzeria-lafattoria.de/c/Nudeln/Spaghetti/",
            },
          ],
        },
      ],
    });

    expect(schema).toEqual({
      "@context": "https://schema.org",
      "@type": "Restaurant",
      "@id": "https://www.pizzeria-lafattoria.de#restaurant",
      name: site.name,
      description: site.description,
      url: site.url,
      image: site.image,
      telephone: site.telephone,
      servesCuisine: "Italienisch",
      priceRange: "€€",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Kantstr. 6",
        postalCode: "63179",
        addressLocality: "Obertshausen",
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
        "@id": "https://www.pizzeria-lafattoria.de#menu",
        name: "Speisekarte",
        url: "https://www.pizzeria-lafattoria.de/speisekarte",
        hasMenuSection: [
          {
            "@type": "MenuSection",
            name: "Pizza",
            url: "https://www.pizzeria-lafattoria.de/c/Pizza/",
          },
          {
            "@type": "MenuSection",
            name: "Nudeln",
            hasMenuSection: [
              {
                "@type": "MenuSection",
                name: "Spaghetti",
                url: "https://www.pizzeria-lafattoria.de/c/Nudeln/Spaghetti/",
              },
            ],
          },
        ],
      },
    });
  });

  it("leaves empty values out", () => {
    const schema = buildRestaurantSchema({
      site: {
        name: "ShopBite",
        url: "https://example.com",
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
          description: "mit Salami",
          image: "https://cdn.example.com/salami.webp",
          offers: { "@type": "Offer", price: "9.50", priceCurrency: "EUR" },
        },
        { "@type": "MenuItem", name: "Pizza Tonno" },
      ],
      isPartOf: { "@type": "Menu", "@id": "https://example.com#menu" },
    });
  });
});
