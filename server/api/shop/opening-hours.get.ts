import { answerBackendData, openingHoursData } from "../../utils/shopData";

/**
 * The weekly opening hours (OpeningHours), intervals up to 24:00.
 * Cached for server-side rendering; `?fresh=1` asks the backend (ADR 0001).
 */
export default defineEventHandler((event) =>
  answerBackendData(event, openingHoursData),
);
