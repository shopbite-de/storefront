import { describe, expect, it } from "vitest";
import { buildLlmsTxt } from "../../server/utils/llmsTxt";

const now = new Date("2026-10-05T12:00:00Z");

describe("buildLlmsTxt", () => {
  it("renders shop, hours, ordering, menu and pages as Markdown", () => {
    const text = buildLlmsTxt({
      name: "Pizzeria La Fattoria",
      description: "Italienisch-deutsche Küche seit 1997.",
      url: "https://www.pizzeria-lafattoria.de",
      cuisine: "Italienische Küche",
      address: {
        street: "Kantstraße 6",
        postalCode: "63179",
        city: "Obertshausen",
      },
      telephone: "+49 6104 71427",
      deliveryAreas: ["63179 Obertshausen", "63165 Lämmerspiel"],
      businessHours: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        dayOfWeek,
        openingTime: "11:30:00",
        closingTime: "22:00:00",
      })),
      holidays: [
        // ended before `now`: left out
        { start: "2026-07-12T21:00:00Z", end: "2026-08-05T22:00:00Z" },
        { start: "2026-12-24T00:00:00Z", end: "2026-12-26T00:00:00Z" },
      ],
      isCheckoutEnabled: true,
      deliveryTime: 30,
      menuUrl: "https://www.pizzeria-lafattoria.de/speisekarte",
      menu: [
        {
          name: "Pizza",
          url: "https://www.pizzeria-lafattoria.de/c/Pizza/",
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
              url: "https://www.pizzeria-lafattoria.de/c/Pizza/?produkt=22",
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
          url: "https://www.pizzeria-lafattoria.de/zahlung-und-versand",
          description: "Zahlungs- und Lieferinformationen",
        },
      ],
      faq: [
        {
          question: "Wohin liefern Sie?",
          answer: "Nach Obertshausen und Lämmerspiel.",
        },
      ],
      currency: "EUR",
      now,
    });

    expect(text).toBe(`# Pizzeria La Fattoria

> Pizzeria La Fattoria: Italienische Küche in Obertshausen. Online bestellen zur Lieferung oder Abholung unter https://www.pizzeria-lafattoria.de.

Italienisch-deutsche Küche seit 1997.

## Kontakt

- Adresse: Kantstraße 6, 63179 Obertshausen
- Telefon: +49 6104 71427
- Website: https://www.pizzeria-lafattoria.de

## Öffnungszeiten

- Mo–Fr: 11:30–22:00
- Sa–So: Ruhetag
- Geschlossen: 24.12.2026 – 26.12.2026

## Bestellen

- Online bestellen: https://www.pizzeria-lafattoria.de/speisekarte
- Liefergebiet: 63179 Obertshausen, 63165 Lämmerspiel
- Lieferzeit: ca. 30 Minuten
- Abholung im Restaurant möglich

## Häufige Fragen

### Wohin liefern Sie?

Nach Obertshausen und Lämmerspiel.

## Speisekarte

### [Pizza](https://www.pizzeria-lafattoria.de/c/Pizza/)

- Pizza Margherita: ab 7,00 € (Tomatensoße, Mozzarella; vegetarisch)
- [Pizza Salami](https://www.pizzeria-lafattoria.de/c/Pizza/?produkt=22): 8,50 €

### Nudeln

#### Spaghetti

- Spaghetti Aglio e Olio: 9,00 € (vegan)

## Weitere Informationen

- [Zahlungs- und Lieferinformationen](https://www.pizzeria-lafattoria.de/zahlung-und-versand)
`);
  });

  it("names other names of the shop under Kontakt", () => {
    expect(
      buildLlmsTxt({
        name: "Pizzeria La Fattoria",
        alternateNames: ["La Fattoria / Alte Schmiede", "Alte Schmiede"],
        url: "https://www.pizzeria-lafattoria.de",
        now,
      }),
    ).toContain(`## Kontakt

- Auch bekannt als: La Fattoria / Alte Schmiede, Alte Schmiede
- Website: https://www.pizzeria-lafattoria.de
`);
  });

  it("leaves out what is not configured", () => {
    expect(
      buildLlmsTxt({
        name: "ShopBite",
        alternateNames: [],
        url: "https://example.com",
        now,
      }),
    ).toBe(`# ShopBite

> ShopBite.

## Kontakt

- Website: https://example.com
`);
  });
});
