import { readdirSync, readFileSync } from "node:fs";

/**
 * The storefront's messages of a locale (i18n/locales/<code>/*.json) for
 * tests of pure helpers that take their words as parameters: `t(key,
 * params)` fills `{name}` placeholders like vue-i18n.
 */
type Messages = { [key: string]: string | Messages };

export function messages(code: string) {
  const dir = new URL(`../../i18n/locales/${code}/`, import.meta.url);
  const all: Messages = Object.assign(
    {},
    ...readdirSync(dir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => JSON.parse(readFileSync(new URL(file, dir), "utf8"))),
  );
  const t = (key: string, params: Record<string, string | number> = {}) => {
    const message = key
      .split(".")
      .reduce<string | Messages | undefined>(
        (node, part) => (typeof node === "object" ? node[part] : undefined),
        all,
      );
    if (typeof message !== "string") throw new Error(`No message ${key}`);
    return message.replace(/\{\s*(\w+)\s*\}/g, (_, name: string) =>
      String(params[name] ?? `{${name}}`),
    );
  };
  return { t };
}

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** The opening hours' words (app/utils/openingHours.ts) of a locale. */
export function openingHoursWords(code: string) {
  const { t } = messages(code);
  return {
    days: WEEKDAYS.map((day) => t(`common.hours.days.${day}`)),
    today: (intervals: string) => t("common.hours.today", { intervals }),
    closedToday: t("common.hours.closedToday"),
    and: t("common.hours.and"),
  };
}
