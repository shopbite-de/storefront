/**
 * The restaurant of one behaviour scenario on the memory adapter (test
 * seam, never in a production build: see `modules/test-seams.ts`).
 *
 * Time is made deterministic without a fake clock: the restaurant's time
 * zone is chosen so that its local time reads 12:xx right now (an
 * `Etc/GMT±N` zone), and the opening hours are set around that. Server
 * (ordering window, order placement) and browser (wished time, status
 * pill) both compute in the restaurant's time zone, so they agree, and a
 * scenario behaves the same at any hour of the day the suite runs.
 */
import {
  openingInterval,
  timeZone,
  type OpeningHours,
  type TimeZone,
  type Weekday,
} from "../../../shared/domain";
import type { MemorySeed } from "../../../server/adapters/memory";

export type ScenarioHours = Readonly<{ from: string; to: string }>;

export type RestaurantScenario = Readonly<{
  /** Every day the same hours (restaurant time); `null`: closed all week. */
  openingHours?: ScenarioHours | null;
  /** The restaurant's checkout switch (false: ordering paused). */
  acceptsOrders?: boolean;
}>;

/** Open 10:00–22:00, around the restaurant's 12:xx. */
export const OPEN_HOURS: ScenarioHours = { from: "10:00", to: "22:00" };

const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 7];
const HH_MM = /^([01]\d|2[0-4]):[0-5]\d$/;

/** The `Etc/GMT±N` zone in which `now` reads 12:xx. */
export function middayTimeZone(now: Date): TimeZone {
  const offset = 12 - now.getUTCHours(); // -11 … 12
  // Etc zones count the other way round: Etc/GMT-2 is UTC+2
  const name =
    offset === 0
      ? "Etc/GMT"
      : `Etc/GMT${offset > 0 ? "-" : "+"}${Math.abs(offset)}`;
  return timeZone(name);
}

/** Checks a request body; throws a message for the 400 answer. */
export function parseScenario(body: unknown): RestaurantScenario {
  if (body === undefined || body === null || body === "") return {};
  if (typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError("The scenario is an object.");
  }
  const { openingHours, acceptsOrders, ...rest } = body as Record<
    string,
    unknown
  >;
  const unknown = Object.keys(rest);
  if (unknown.length) {
    throw new TypeError(`Unknown scenario keys: ${unknown.join(", ")}.`);
  }
  if (acceptsOrders !== undefined && typeof acceptsOrders !== "boolean") {
    throw new TypeError("acceptsOrders is a boolean.");
  }
  if (openingHours !== undefined && openingHours !== null) {
    const { from, to } = openingHours as Record<string, unknown>;
    if (
      typeof from !== "string" ||
      typeof to !== "string" ||
      !HH_MM.test(from) ||
      !HH_MM.test(to)
    ) {
      throw new TypeError("openingHours is { from: HH:MM, to: HH:MM }.");
    }
    return { openingHours: { from, to }, acceptsOrders };
  }
  return { openingHours, acceptsOrders };
}

/** The restaurant's hours: every day the same, or closed all week. */
export function scenarioHours(
  hours: ScenarioHours | null | undefined,
): OpeningHours {
  const used = hours === undefined ? OPEN_HOURS : hours;
  return {
    intervals: used
      ? WEEK.map((weekday) => ({
          weekday,
          interval: openingInterval(used.from, used.to),
        }))
      : [],
  };
}

/**
 * The shop of a scenario: the demo restaurant in `zone`, with the
 * scenario's hours and switch (open 10:00–22:00 and taking orders unless
 * it says otherwise), no holidays.
 */
export function scenarioShop(
  base: MemorySeed["shop"],
  scenario: RestaurantScenario,
  zone: TimeZone,
): MemorySeed["shop"] {
  return {
    ...base,
    config: {
      ...base.config,
      timeZone: zone,
      acceptsOrders: scenario.acceptsOrders ?? true,
    },
    openingHours: scenarioHours(scenario.openingHours),
    holidays: [],
  };
}
