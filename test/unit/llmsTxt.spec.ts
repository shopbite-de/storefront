import { describe, expect, it } from "vitest";
import { buildLlmsTxt, toLlmsMenu } from "../../server/utils/llmsTxt";
import {
  holiday,
  openingInterval,
  sortOpeningHours,
  type MenuSection,
  type Weekday,
} from "../../shared/domain";
import { dish } from "../support/dishes";

const now = new Date("2026-10-05T12:00:00Z");

describe("buildLlmsTxt", () => {
  it("renders shop, hours, ordering, menu and pages as Markdown", () => {
    const text = buildLlmsTxt({
      name: "Pizzeria Esempio",
      description: "Italienisch-deutsche Küche seit 1997.",
      url: "https://www.pizzeria-esempio.example",
      cuisine: "Italienische Küche",
      address: {
        street: "Musterstraße 1",
        postalCode: "12345",
        city: "Musterstadt",
      },
      telephone: "+49 123 456789",
      deliveryAreas: ["12345 Musterstadt", "12346 Beispieldorf"],
      openingHours: sortOpeningHours(
        ([1, 2, 3, 4, 5] as Weekday[]).map((weekday) => ({
          weekday,
          interval: openingInterval("11:30", "22:00"),
        })),
      ),
      holidays: [
        // ended before `now`: left out
        holiday({
          id: "summer",
          firstDay: "2026-07-13",
          lastDay: "2026-08-05",
        }),
        holiday({ id: "xmas", firstDay: "2026-12-24", lastDay: "2026-12-26" }),
      ],
      acceptsOrders: true,
      deliveryTime: 30,
      pickupTime: 20,
      menuUrl: "https://www.pizzeria-esempio.example/speisekarte",
      menu: [
        {
          name: "Pizza",
          url: "https://www.pizzeria-esempio.example/c/Pizza/",
          items: [
            {
              name: "Pizza Margherita",
              price: 7,
              fromPrice: true,
              ingredients: ["Tomatensoße", "Mozzarella"],
              diets: ["vegetarian"],
            },
            {
              name: "Pizza Salami",
              price: 8.5,
              url: "https://www.pizzeria-esempio.example/c/Pizza/?produkt=22",
            },
          ],
        },
        {
          name: "Nudeln",
          items: [],
          sections: [
            {
              name: "Spaghetti",
              items: [
                {
                  name: "Spaghetti Aglio e Olio",
                  price: 9,
                  diets: ["vegetarian", "vegan"],
                },
              ],
            },
          ],
        },
        // no products: left out
        { name: "Saisonales", items: [] },
      ],
      pages: [
        {
          title: "Zahlungs- und Lieferinformationen",
          url: "https://www.pizzeria-esempio.example/zahlung-und-versand",
          description: "Zahlungs- und Lieferinformationen",
        },
      ],
      faq: [
        {
          question: "Wohin liefern Sie?",
          answer: "Nach Musterstadt und Beispieldorf.",
        },
      ],
      currency: "EUR",
      now,
      timeZone: "Europe/Berlin",
    });

    expect(text).toBe(`# Pizzeria Esempio

> Pizzeria Esempio: Italienische Küche in Musterstadt. Online bestellen zur Lieferung oder Abholung unter https://www.pizzeria-esempio.example.

Italienisch-deutsche Küche seit 1997.

## Kontakt

- Adresse: Musterstraße 1, 12345 Musterstadt
- Telefon: +49 123 456789
- Website: https://www.pizzeria-esempio.example

## Öffnungszeiten

- Mo–Fr: 11:30–22:00
- Sa–So: Ruhetag
- Geschlossen: 24.12.2026 – 26.12.2026

## Bestellen

- Online bestellen: https://www.pizzeria-esempio.example/speisekarte
- Liefergebiet: 12345 Musterstadt, 12346 Beispieldorf
- Lieferzeit: ca. 30 Minuten
- Abholung im Restaurant möglich, abholbereit in ca. 20 Minuten

## Häufige Fragen

### Wohin liefern Sie?

Nach Musterstadt und Beispieldorf.

## Speisekarte

### [Pizza](https://www.pizzeria-esempio.example/c/Pizza/)

- Pizza Margherita: ab 7,00 € (Tomatensoße, Mozzarella; vegetarisch)
- [Pizza Salami](https://www.pizzeria-esempio.example/c/Pizza/?produkt=22): 8,50 €

### Nudeln

#### Spaghetti

- Spaghetti Aglio e Olio: 9,00 € (vegan)

## Weitere Informationen

- [Zahlungs- und Lieferinformationen](https://www.pizzeria-esempio.example/zahlung-und-versand)
`);
  });

  it("keeps a holiday until its last day in the restaurant's time zone", () => {
    const text = buildLlmsTxt({
      name: "ShopBite",
      url: "https://example.com",
      openingHours: { intervals: [] },
      holidays: [
        holiday({ id: "h", firstDay: "2026-10-04", lastDay: "2026-10-05" }),
      ],
      // still 5 October in Berlin, already 6 October in UTC
      now: new Date("2026-10-05T23:30:00+02:00"),
      timeZone: "Europe/Berlin",
    });
    expect(text).toContain("- Geschlossen: 04.10.2026 – 05.10.2026");
  });

  it("names other names of the shop under Kontakt", () => {
    expect(
      buildLlmsTxt({
        name: "Pizzeria Esempio",
        alternateNames: ["Esempio / Alter Hof", "Alter Hof"],
        url: "https://www.pizzeria-esempio.example",
        now,
        timeZone: "Europe/Berlin",
      }),
    ).toContain(`## Kontakt

- Auch bekannt als: Esempio / Alter Hof, Alter Hof
- Website: https://www.pizzeria-esempio.example
`);
  });

  it("leaves out what is not configured", () => {
    expect(
      buildLlmsTxt({
        name: "ShopBite",
        alternateNames: [],
        url: "https://example.com",
        now,
        timeZone: "Europe/Berlin",
      }),
    ).toBe(`# ShopBite

> ShopBite.

## Kontakt

- Website: https://example.com
`);
  });
});

describe("toLlmsMenu", () => {
  const section = (
    id: string,
    name: string,
    path: string,
    children: MenuSection[] = [],
  ): MenuSection => ({
    id,
    name,
    description: null,
    icon: null,
    media: null,
    path,
    seo: { title: null, description: null, indexable: true },
    children,
  });

  it("lists each section's own dishes by name with link, price and ingredients", () => {
    const menu = toLlmsMenu(
      [
        section("pizza", "Pizza", "/Speisekarte/Pizza/", [
          section("spezial", "Spezial", "/Speisekarte/Pizza/Spezial/"),
        ]),
      ],
      [
        dish({
          id: "p10",
          name: "Pizza 10",
          number: "10",
          sectionIds: ["pizza"],
        }),
        dish({
          id: "p9",
          name: "Pizza 9",
          number: "9",
          sectionIds: ["pizza"],
          priceFrom: true,
          path: "/Speisekarte/Pizza/?produkt=9",
        }),
        dish({
          id: "s",
          name: "Salami",
          number: "22",
          sectionIds: ["spezial"],
          diets: [],
        }),
      ],
      "https://pizza.example.com",
    );
    expect(menu).toEqual([
      {
        name: "Pizza",
        url: "https://pizza.example.com/Speisekarte/Pizza/",
        items: [
          {
            name: "Pizza 9",
            url: "https://pizza.example.com/Speisekarte/Pizza/?produkt=9",
            price: 7,
            fromPrice: true,
            ingredients: ["Tomatensoße", "Käse"],
            diets: ["vegetarian"],
          },
          expect.objectContaining({
            name: "Pizza 10",
            url: "https://pizza.example.com/Speisekarte/Pizza/?produkt=10",
          }),
        ],
        sections: [
          {
            name: "Spezial",
            url: "https://pizza.example.com/Speisekarte/Pizza/Spezial/",
            items: [expect.objectContaining({ name: "Salami", diets: [] })],
            sections: [],
          },
        ],
      },
    ]);
  });
});
