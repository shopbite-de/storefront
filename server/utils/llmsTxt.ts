import { moneyAmount } from "../../app/utils/money";
import { groupOpeningHours } from "../../app/utils/openingHours";
import { dishLink } from "../../app/utils/productUrl";
import { restaurantNow } from "../../app/utils/restaurantTime";
import { toAbsoluteUrl } from "../../app/utils/seo";
import type {
  Dish,
  Holiday,
  MenuSection,
  OpeningHours,
} from "../../shared/domain";

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
  /** Other names the shop is listed under on maps and directories. */
  alternateNames?: string[];
  description?: string;
  url: string;
  cuisine?: string;
  address?: { street?: string; postalCode?: string; city?: string };
  telephone?: string;
  googleBusinessProfileUrl?: string;
  deliveryAreas?: string[];
  openingHours?: OpeningHours;
  holidays?: readonly Holiday[];
  /** The restaurant accepts online orders. */
  acceptsOrders?: boolean;
  /** Minutes until delivery (lead time of the delivery method). */
  deliveryTime?: number | null;
  /** Minutes until an order is ready for pickup (pickup method). */
  pickupTime?: number | null;
  menuUrl?: string;
  menu?: LlmsMenuSection[];
  pages?: { title: string; url: string; description?: string }[];
  /** FAQ of the home page (#404). */
  faq?: { question: string; answer: string }[];
  currency?: string;
  /** Holidays that ended before this day are left out. */
  now: Date;
  /** The restaurant's time zone, in which `now` is read. */
  timeZone: string;
};

const DIET_LABELS = { vegetarian: "vegetarisch", vegan: "vegan" } as const;

/**
 * The menu part from the catalog: each section lists the dishes assigned
 * to it directly, alphabetically (numbers in natural order, "Pizza 9"
 * before "Pizza 10"), with their link, price and main ingredients.
 */
export function toLlmsMenu(
  sections: readonly MenuSection[],
  dishes: readonly Dish[],
  siteUrl: string,
): LlmsMenuSection[] {
  const bySection = new Map<string, Dish[]>();
  for (const dish of dishes) {
    for (const id of dish.sectionIds) {
      bySection.set(id, [...(bySection.get(id) ?? []), dish]);
    }
  }
  const toSection = (section: MenuSection): LlmsMenuSection => ({
    name: section.name,
    url: toAbsoluteUrl(siteUrl, section.path),
    items: [...(bySection.get(section.id) ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true }))
      .map((dish) => {
        const link = dishLink(dish, section.path);
        return {
          name: dish.name,
          url: link ? toAbsoluteUrl(siteUrl, link) : undefined,
          price: moneyAmount(dish.price),
          fromPrice: dish.priceFrom,
          ingredients: dish.ingredients.map((ingredient) => ingredient.name),
          diets: [...dish.diets],
        };
      }),
    sections: section.children.map(toSection),
  });
  return sections.map(toSection);
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency })
    .format(price)
    .replace(/\u00a0/g, " ");
}

/** `2026-07-12` → `12.07.2026`. */
function formatDay(date: string) {
  const [year, month, day] = date.split("-");
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
    input.acceptsOrders
      ? `Online bestellen zur Lieferung oder Abholung unter ${input.url}.`
      : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const contact = [
    input.alternateNames?.length
      ? `- Auch bekannt als: ${input.alternateNames.join(", ")}`
      : undefined,
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

  const hours = groupOpeningHours(input.openingHours ?? { intervals: [] }).map(
    (row) =>
      `- ${row.days}: ${row.intervals.length ? row.intervals.join(", ") : "Ruhetag"}`,
  );

  const today = restaurantNow(input.now, input.timeZone).date;
  const closingDays = (input.holidays ?? [])
    .filter((holiday) => holiday.lastDay >= today)
    .map((holiday) => {
      const start = formatDay(holiday.firstDay);
      const end = formatDay(holiday.lastDay);
      return `- Geschlossen: ${start === end ? start : `${start} – ${end}`}`;
    });

  const ordering = input.acceptsOrders
    ? [
        `- Online bestellen: ${input.menuUrl ?? input.url}`,
        input.deliveryAreas?.length
          ? `- Liefergebiet: ${input.deliveryAreas.join(", ")}`
          : undefined,
        input.deliveryTime
          ? `- Lieferzeit: ca. ${input.deliveryTime} Minuten`
          : undefined,
        input.address?.street
          ? `- Abholung im Restaurant möglich${input.pickupTime ? `, abholbereit in ca. ${input.pickupTime} Minuten` : ""}`
          : undefined,
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
