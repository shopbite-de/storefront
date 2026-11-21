/**
 * The context without the customer's own address (`shippingLocation`
 * carries it, with the customer's id); the price format needs none.
 */
export function withoutAddress(
  context: Record<string, unknown>,
): Record<string, unknown> {
  const location = context.shippingLocation;
  if (!location || typeof location !== "object") return context;
  const { address: _address, ...rest } = location as Record<string, unknown>;
  return { ...context, shippingLocation: rest };
}

/** No server-side Store API read waits longer (ADR 0001). */
export const LAYER_CONTEXT_TIMEOUT_MS = 10_000;

type ContextClient = {
  invoke: (
    operation: "readContext get /context",
    params: { fetchOptions: { timeout: number } },
  ) => Promise<{ data: Record<string, unknown> }>;
};

/**
 * The Shopware layer's context for the price format (currency, locale),
 * read during server-side rendering with a deadline, so a paused backend
 * does not hold the page (step 6 review). The context token stays on the
 * server (step 4) and the customer comes from the BFF (`useCustomer`,
 * step 6): the answer goes into the page payload without either.
 */
export async function readLayerContext(
  client: ContextClient,
): Promise<Record<string, unknown>> {
  const { data } = await client.invoke("readContext get /context", {
    fetchOptions: { timeout: LAYER_CONTEXT_TIMEOUT_MS },
  });
  const { token: _token, customer: _customer, ...context } = data;
  return withoutAddress(context);
}
