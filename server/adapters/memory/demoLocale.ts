/**
 * The demo restaurant's shop setup in the shop's language (ADR 0002). The
 * memory backend plays a shop backend, so these are backend data, not
 * messages: a restaurant names its shipping and payment methods, sortings,
 * filters and footer links in its backend, in the language of its shop.
 * The menu itself (sections, dishes, extras) stays the quickstart's German
 * demo menu in every language, like a restaurant's real menu.
 */
export type DemoLocale = {
  /** The language the backend reports (`ShopConfig.locale`). */
  language: string;
  menuRoot: { name: string; path: string };
  sortings: Record<
    | "name-asc"
    | "name-desc"
    | "price-asc"
    | "price-desc"
    | "topseller"
    | "score",
    string
  >;
  diets: { vegetarian: string; vegan: string };
  extraGroup: string;
  shipping: { delivery: string; pickup: string };
  payment: {
    cash: { name: string; description: string };
    card: { name: string; description: string };
  };
  address: { street: string; postalCode: string; city: string };
  navigation: {
    contact: string;
    popular: string;
    service: string;
    legal: string;
    shipping: string;
    account: string;
    wishlist: string;
    imprint: string;
    privacy: string;
    terms: string;
  };
  countries: { DE: string; AT: string; CH: string };
};

const DE: DemoLocale = {
  language: "de-DE",
  menuRoot: { name: "Speisekarte", path: "/Speisekarte/" },
  sortings: {
    "name-asc": "Name A-Z",
    "name-desc": "Name Z-A",
    "price-asc": "Preis aufsteigend",
    "price-desc": "Preis absteigend",
    topseller: "Topseller",
    score: "Beste Ergebnisse",
  },
  diets: { vegetarian: "Vegetarisch", vegan: "Vegan" },
  extraGroup: "Extras",
  shipping: { delivery: "Lieferung", pickup: "Abholung" },
  payment: {
    cash: {
      name: "Barzahlung",
      description: "Bar bei Lieferung oder Abholung",
    },
    card: {
      name: "Kartenzahlung",
      description: "Mit Karte bei Lieferung oder Abholung",
    },
  },
  address: {
    street: "Musterstraße 1",
    postalCode: "12345",
    city: "Musterstadt",
  },
  navigation: {
    contact: "Kontakt",
    popular: "Beliebt",
    service: "Service",
    legal: "Rechtliches",
    shipping: "Zahlung und Versand",
    account: "Mein Konto",
    wishlist: "Merkliste",
    imprint: "Impressum",
    privacy: "Datenschutz",
    terms: "AGB",
  },
  countries: { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" },
};

const EN: DemoLocale = {
  language: "en-GB",
  menuRoot: { name: "Menu", path: "/Menu/" },
  sortings: {
    "name-asc": "Name A-Z",
    "name-desc": "Name Z-A",
    "price-asc": "Price, low to high",
    "price-desc": "Price, high to low",
    topseller: "Most popular",
    score: "Best match",
  },
  diets: { vegetarian: "Vegetarian", vegan: "Vegan" },
  extraGroup: "Extras",
  shipping: { delivery: "Delivery", pickup: "Pickup" },
  payment: {
    cash: { name: "Cash", description: "Cash on delivery or pickup" },
    card: { name: "Card", description: "By card on delivery or pickup" },
  },
  address: {
    street: "1 Sample Street",
    postalCode: "12345",
    city: "Sampletown",
  },
  navigation: {
    contact: "Contact",
    popular: "Popular",
    service: "Service",
    legal: "Legal",
    shipping: "Delivery and payment",
    account: "My account",
    wishlist: "Favourites",
    imprint: "Imprint",
    privacy: "Privacy",
    terms: "Terms",
  },
  countries: { DE: "Germany", AT: "Austria", CH: "Switzerland" },
};

/** The demo setup of a locale; German for a locale the demo lacks. */
export function demoLocale(code: string): DemoLocale {
  return code === "en" ? EN : DE;
}
