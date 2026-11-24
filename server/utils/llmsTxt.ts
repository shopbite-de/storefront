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
// gathers the data and hands it in. The text is in the shop's language
// (ADR 0002): the route passes the messages `server.llms.*` and the
// locale's language tag.

/** Messages and language of the shop's locale. */
export type LlmsWords = {
  t: (key: string, params?: Record<string, string | number>) => string;
  /** BCP 47 tag for prices, dates and sorting, e.g. `de-DE`. */
  language: string;
};

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

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

/**
 * The menu part from the catalog: each section lists the dishes assigned
 * to it directly, alphabetically (numbers in natural order, "Pizza 9"
 * before "Pizza 10"), with their link, price and main ingredients.
 */
export function toLlmsMenu(
  sections: readonly MenuSection[],
  dishes: readonly Dish[],
  siteUrl: string,
  language: string,
): LlmsMenuSection[] {
  const bySection = new Map<string, Dish[]>();
  for (const dish of dishes) {
    for (const id of dish.sectionIds) {
      bySection.set(id, [...(bySection.get(id) ?? []), dish]);
    }
  }
  const toSection = (section: MenuSection): LlmsMenuSection => ({
    name: section.name,
    url: section.path ? toAbsoluteUrl(siteUrl, section.path) : undefined,
    items: [...(bySection.get(section.id) ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name, language, { numeric: true }))
      .map((dish) => {
        const link = dishLink(dish, section.path ?? undefined);
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

function formatPrice(price: number, currency: string, language: string) {
  return new Intl.NumberFormat(language, { style: "currency", currency })
    .format(price)
    .replace(/\u00a0/g, " ");
}

/** `2026-07-12` → `12.07.2026` (de-DE), `12/07/2026` (en-GB). */
function formatDay(date: string, language: string) {
  return new Intl.DateTimeFormat(language, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function menuItemLine(item: LlmsMenuItem, currency: string, words: LlmsWords) {
  const { t, language } = words;
  const price =
    item.price !== undefined
      ? item.fromPrice
        ? t("server.llms.fromPrice", {
            price: formatPrice(item.price, currency, language),
          })
        : formatPrice(item.price, currency, language)
      : undefined;
  // Vegan dishes are vegetarian too; naming "vegan" is enough.
  const diet = item.diets?.includes("vegan")
    ? t("server.llms.vegan")
    : item.diets?.includes("vegetarian")
      ? t("server.llms.vegetarian")
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
  words: LlmsWords,
): string[] {
  const heading = "#".repeat(Math.min(level, 6));
  const title = section.url
    ? `[${section.name}](${section.url})`
    : section.name;
  const subsections = (section.sections ?? []).flatMap((child) =>
    menuSectionLines(child, currency, level + 1, words),
  );
  if (section.items.length === 0 && subsections.length === 0) return [];

  return [
    "",
    `${heading} ${title}`,
    ...(section.items.length ? [""] : []),
    ...section.items.map((item) => menuItemLine(item, currency, words)),
    ...subsections,
  ];
}

export function buildLlmsTxt(input: LlmsTxtInput, words: LlmsWords): string {
  const { t, language } = words;
  const currency = input.currency || "EUR";
  const city = input.address?.city;

  const summary = [
    input.cuisine && city
      ? t("server.llms.summaryCuisine", {
          name: input.name,
          cuisine: input.cuisine,
          city,
        })
      : city
        ? t("server.llms.summaryCity", { name: input.name, city })
        : `${input.name}.`,
    input.acceptsOrders
      ? t("server.llms.summaryOrders", { url: input.url })
      : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const contact = [
    input.alternateNames?.length
      ? `- ${t("server.llms.alsoKnownAs")}: ${input.alternateNames.join(", ")}`
      : undefined,
    input.address?.street || input.address?.postalCode || city
      ? `- ${t("server.llms.address")}: ${[
          input.address?.street,
          [input.address?.postalCode, city].filter(Boolean).join(" "),
        ]
          .filter(Boolean)
          .join(", ")}`
      : undefined,
    input.telephone
      ? `- ${t("server.llms.telephone")}: ${input.telephone}`
      : undefined,
    `- ${t("server.llms.website")}: ${input.url}`,
    input.googleBusinessProfileUrl
      ? // eslint-disable-next-line shopbite/no-literal-text -- a name
        `- Google: ${input.googleBusinessProfileUrl}`
      : undefined,
  ].filter((line): line is string => Boolean(line));

  const hours = groupOpeningHours(input.openingHours ?? { intervals: [] }, {
    days: WEEKDAYS.map((day) => t(`server.llms.days.${day}`)),
  }).map(
    (row) =>
      `- ${row.days}: ${row.intervals.length ? row.intervals.join(", ") : t("server.llms.closedDay")}`,
  );

  const today = restaurantNow(input.now, input.timeZone).date;
  const closingDays = (input.holidays ?? [])
    .filter((holiday) => holiday.lastDay >= today)
    .map((holiday) => {
      const start = formatDay(holiday.firstDay, language);
      const end = formatDay(holiday.lastDay, language);
      return `- ${t("server.llms.closed")}: ${start === end ? start : `${start} – ${end}`}`;
    });

  const ordering = input.acceptsOrders
    ? [
        `- ${t("server.llms.orderOnline")}: ${input.menuUrl ?? input.url}`,
        input.deliveryAreas?.length
          ? `- ${t("server.llms.deliveryArea")}: ${input.deliveryAreas.join(", ")}`
          : undefined,
        input.deliveryTime
          ? `- ${t("server.llms.deliveryTime", { minutes: input.deliveryTime })}`
          : undefined,
        input.address?.street
          ? `- ${
              input.pickupTime
                ? t("server.llms.pickupWithTime", { minutes: input.pickupTime })
                : t("server.llms.pickup")
            }`
          : undefined,
      ].filter((line): line is string => Boolean(line))
    : [];

  const menu = (input.menu ?? []).flatMap((section) =>
    menuSectionLines(section, currency, 3, words),
  );

  const pages = (input.pages ?? []).map(
    (page) =>
      `- [${page.title}](${page.url})${page.description && page.description !== page.title ? `: ${page.description}` : ""}`,
  );

  const sections: string[][] = [
    [`# ${input.name}`, "", `> ${summary}`],
    input.description ? [input.description] : [],
    [`## ${t("server.llms.contact")}`, "", ...contact],
    hours.length || closingDays.length
      ? [`## ${t("server.llms.openingHours")}`, "", ...hours, ...closingDays]
      : [],
    ordering.length ? [`## ${t("server.llms.ordering")}`, "", ...ordering] : [],
    input.faq?.length
      ? [
          `## ${t("server.llms.faq")}`,
          ...input.faq.flatMap((item) => [
            "",
            `### ${item.question}`,
            "",
            item.answer,
          ]),
        ]
      : [],
    menu.length ? [`## ${t("server.llms.menu")}`, ...menu] : [],
    pages.length ? [`## ${t("server.llms.morePages")}`, "", ...pages] : [],
  ];

  return `${sections
    .filter((lines) => lines.length)
    .map((lines) => lines.join("\n"))
    .join("\n\n")}\n`;
}
