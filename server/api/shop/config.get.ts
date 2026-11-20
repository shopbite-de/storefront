import { answerBackendData, shopConfigData } from "../../utils/shopData";

/**
 * The restaurant's configuration (ShopConfig): whether it accepts orders, time zone, contact data.
 * Cached for server-side rendering; `?fresh=1` asks the backend (ADR 0001).
 */
export default defineEventHandler((event) =>
  answerBackendData(event, shopConfigData),
);
