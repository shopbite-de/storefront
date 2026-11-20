import { answerBackendData, holidaysData } from "../../utils/shopData";

/**
 * The holidays as whole days in the restaurant's time zone (Holiday[]).
 * Cached for server-side rendering; `?fresh=1` asks the backend (ADR 0001).
 */
export default defineEventHandler((event) =>
  answerBackendData(event, holidaysData),
);
