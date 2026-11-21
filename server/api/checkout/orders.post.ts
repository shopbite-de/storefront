import { DomainError } from "../../../shared/domain";
import type { Backend, BackendSession } from "../../ports";
import {
  createOrderPlacement,
  type PlacementGates,
} from "../../utils/orderPlacement";
import {
  holidaysData,
  openingHoursData,
  shippingMethodsData,
  shopConfigData,
} from "../../utils/shopData";

const placement = createOrderPlacement();

/**
 * Places the cart as an order: `{ attemptId, wishedTime: { date, time },
 * note? }` answers `PlacedOrder` (the order, a payment redirect or
 * `paymentFailed`). The restaurant's switch is asked fresh, the wished
 * time must lie in the ordering window of the selected shipping method,
 * and an attempt is placed at most once (`server/utils/orderPlacement.ts`):
 * the browser sends the same attempt id again when it retries.
 */
export default defineEventHandler(async (event) => {
  const gates: PlacementGates = {
    acceptsOrders: async () => (await shopConfigData.fresh()).acceptsOrders,
    schedule: async () => {
      const [config, openingHours, holidays] = await Promise.all([
        shopConfigData.cached(),
        openingHoursData.cached(),
        holidaysData.cached(),
      ]);
      return { timeZone: config.timeZone, openingHours, holidays };
    },
    shippingMethods: () => shippingMethodsData.cached(),
  };
  // read before the visitor's lock: an invalid body never waits for it
  const input = await answerDomain(async () =>
    placeOrderBody(await readBody(event)),
  );
  const visitorKey = await useVisitorSession(event).id();
  const argsOf = (backend: Backend, session: BackendSession) => {
    // no session: no cart and no guest to order for
    if (!visitorKey) {
      throw new DomainError("cart_empty", "The cart holds nothing to order.");
    }
    return { backend, session, visitorKey, input, gates, urls: paymentUrls };
  };
  return answerVisitor(
    event,
    "write",
    (backend, session) => placement.place(argsOf(backend, session)),
    {
      // an attempt placed already answers even with an outdated cookie
      // (the double click's second request)
      known: (backend, session) =>
        visitorKey ? placement.known(argsOf(backend, session)) : undefined,
    },
  );
});
