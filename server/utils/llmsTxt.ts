import { groupOpeningHours } from "../../app/utils/openingHours";

// Builder for /llms.txt (#402, https://llmstxt.org): a Markdown summary of
// the shop for language models. Pure, so it is unit-testable; the route
// gathers the data and hands it in. The text is German like the shop.

export type LlmsMenuItem = {
  name: string;
  /** Quick view deep link (#289). */
  url?: string;
  price?: number;
  /** The product has variants; `price` is the cheapest one. */
  fromPrice?: boolean;
  ingredients?: string[];
  diets?: ("vegetarian" | "vegan")[];
};

export type LlmsMenuSection = {
  name: string;
  url?: string;
  items: LlmsMenuItem[];
  sections?: LlmsMenuSection[];
};

export type LlmsTxtInput = {
  name: string;
  description?: string;
  url: string;
  cuisine?: string;
  address?: { street?: string; postalCode?: string; city?: string };
  telephone?: string;
  googleBusinessProfileUrl?: string;
  deliveryAreas?: string[];
  businessHours?: {
    dayOfWeek?: number;
    openingTime?: string;
    closingTime?: string;
  }[];
  holidays?: { start?: string; end?: string }[];
  isCheckoutEnabled?: boolean;
  /** Minutes until delivery. */
  deliveryTime?: number;
  menuUrl?: string;
  menu?: LlmsMenuSection[];
  pages?: { title: string; url: string; description?: string }[];
  /** FAQ of the home page (#404). */
  faq?: { question: string; answer: string }[];
  currency?: string;
  /** Closing days that ended before this date are left out. */
  now: Date;
};

const DIET_LABELS = { vegetarian: "vegetarisch", vegan: "vegan" } as const;

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency })
    .format(price)
    .replace(/\u00a0/g, " ");
}

/** `2026-07-12T21:00:00Z` → `12.07.2026` (date part as in the Restaurant schema). */
function formatDay(isoDate: string) {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
}

function menuItemLine(item: LlmsMenuItem, currency: string) {
  const price =
    item.price !== undefined
      ? `${item.fromPrice ? "ab " : ""}${formatPrice(item.price, currency)}`
      : undefined;
  // Vegan dishes are vegetarian too; naming "vegan" is enough.
  const diet = item.diets?.includes("vegan")
    ? DIET_LABELS.vegan
    : item.diets?.includes("vegetarian")
      ? DIET_LABELS.vegetarian
      : undefined;
  const details = [
    item.ingredients?.length ? item.ingredients.join(", ") : undefined,
    diet,
  ].filter((line): line is string => Boolean(line));

  const name = item.url ? `[${item.name}](${item.url})` : item.name;
  return `- ${name}${price ? `: ${price}` : ""}${
    details.length ? ` (${details.join("; ")})` : ""
  }`;
}

function menuSectionLines(
  section: LlmsMenuSection,
  currency: string,
  level: number,
): string[] {
  const heading = "#".repeat(Math.min(level, 6));
  const title = section.url
    ? `[${section.name}](${section.url})`
    : section.name;
  const subsections = (section.sections ?? []).flatMap((child) =>
    menuSectionLines(child, currency, level + 1),
  );
  if (section.items.length === 0 && subsections.length === 0) return [];

  return [
    "",
    `${heading} ${title}`,
    ...(section.items.length ? [""] : []),
    ...section.items.map((item) => menuItemLine(item, currency)),
    ...subsections,
  ];
}

export function buildLlmsTxt(input: LlmsTxtInput): string {
  const currency = input.currency || "EUR";
  const city = input.address?.city;

  const summary = [
    input.cuisine && city
      ? `${input.name}: ${input.cuisine} in ${city}.`
      : `${input.name}${city ? ` in ${city}` : ""}.`,
    input.isCheckoutEnabled
      ? `Online bestellen zur Lieferung oder Abholung unter ${input.url}.`
      : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const contact = [
    input.address?.street || input.address?.postalCode || city
      ? `- Adresse: ${[
          input.address?.street,
          [input.address?.postalCode, city].filter(Boolean).join(" "),
        ]
          .filter(Boolean)
          .join(", ")}`
      : undefined,
    input.telephone ? `- Telefon: ${input.telephone}` : undefined,
    `- Website: ${input.url}`,
    input.googleBusinessProfileUrl
      ? `- Google: ${input.googleBusinessProfileUrl}`
      : undefined,
  ].filter((line): line is string => Boolean(line));

  const hours = groupOpeningHours(input.businessHours ?? []).map(
    (row) =>
      `- ${row.days}: ${row.intervals.length ? row.intervals.join(", ") : "Ruhetag"}`,
  );

  const today = input.now.toISOString().slice(0, 10);
  const closingDays = (input.holidays ?? [])
    .filter((holiday) => holiday.start && holiday.end)
    .filter((holiday) => holiday.end!.slice(0, 10) >= today)
    .map((holiday) => {
      const start = formatDay(holiday.start!);
      const end = formatDay(holiday.end!);
      return `- Geschlossen: ${start === end ? start : `${start} – ${end}`}`;
    });

  const ordering = input.isCheckoutEnabled
    ? [
        `- Online bestellen: ${input.menuUrl ?? input.url}`,
        input.deliveryAreas?.length
          ? `- Liefergebiet: ${input.deliveryAreas.join(", ")}`
          : undefined,
        input.deliveryTime
          ? `- Lieferzeit: ca. ${input.deliveryTime} Minuten`
          : undefined,
        input.address?.street ? "- Abholung im Restaurant möglich" : undefined,
      ].filter((line): line is string => Boolean(line))
    : [];

  const menu = (input.menu ?? []).flatMap((section) =>
    menuSectionLines(section, currency, 3),
  );

  const pages = (input.pages ?? []).map(
    (page) =>
      `- [${page.title}](${page.url})${page.description && page.description !== page.title ? `: ${page.description}` : ""}`,
  );

  const sections: string[][] = [
    [`# ${input.name}`, "", `> ${summary}`],
    input.description ? [input.description] : [],
    ["## Kontakt", "", ...contact],
    hours.length || closingDays.length
      ? ["## Öffnungszeiten", "", ...hours, ...closingDays]
      : [],
    ordering.length ? ["## Bestellen", "", ...ordering] : [],
    input.faq?.length
      ? [
          "## Häufige Fragen",
          ...input.faq.flatMap((item) => [
            "",
            `### ${item.question}`,
            "",
            item.answer,
          ]),
        ]
      : [],
    menu.length ? ["## Speisekarte", ...menu] : [],
    pages.length ? ["## Weitere Informationen", "", ...pages] : [],
  ];

  return `${sections
    .filter((lines) => lines.length)
    .map((lines) => lines.join("\n"))
    .join("\n\n")}\n`;
}
