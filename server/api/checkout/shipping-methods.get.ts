import { answerBackendData, shippingMethodsData } from "../../utils/shopData";

/**
 * The shop's shipping methods with fulfillment and lead time (ShippingMethod[]).
 * Cached for server-side rendering; `?fresh=1` asks the backend (ADR 0001).
 */
export default defineEventHandler((event) =>
  answerBackendData(event, shippingMethodsData),
);
