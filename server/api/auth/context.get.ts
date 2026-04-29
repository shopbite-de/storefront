import { encodeForQuery } from "@shopware/api-client/helpers";
import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import { toSessionContext, toCustomer } from "~~/server/adapters/shopware/user";

type SwContext = components["schemas"]["SalesChannelContext"];
type SwCustomer = components["schemas"]["Customer"];

const customerCriteria = encodeForQuery({
  associations: {
    defaultShippingAddress: {},
    defaultBillingAddress: {},
    activeShippingAddress: {},
    activeBillingAddress: {},
  },
});

export default defineEventHandler(async (event) => {
  const sw = await shopwareFetch<SwContext>(event, "/context");
  const session = toSessionContext(sw);

  // Fetch full customer with addresses when a session exists.
  // GET /context only returns a partial customer object.
  if (sw.customer) {
    try {
      const customer = await shopwareFetch<SwCustomer>(
        event,
        "/account/customer",
        {
          query: { _criteria: customerCriteria },
        },
      );
      session.user = toCustomer(customer);
    } catch {
      // fall back to partial customer data from the context
    }
  }

  return session;
});
