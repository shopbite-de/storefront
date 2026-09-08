declare module "#shopware" {
  import type { createAPIClient } from "@shopware/api-client";

  // Types generated from our own Shopware instance (`pnpm generate-types`).
  type CustomOperations = import("./api-types/storeApiTypes").operations;
  type CustomSchemas =
    import("./api-types/storeApiTypes").components["schemas"];

  // The `@shopware/composables` layer references endpoints and schemas our
  // instance does not expose (e.g. B2B quotes). Fall back to the default
  // types shipped with the api-client for those so the layer typechecks;
  // our own types always win where both exist.
  type DefaultOperations =
    import("@shopware/api-client/store-api-types").operations;
  type DefaultSchemas =
    import("@shopware/api-client/store-api-types").components["schemas"];

  type FallbackOperations = Omit<DefaultOperations, keyof CustomOperations>;

  // Fallback operations reference the default schemas, but the composables
  // compare their responses against ours. Re-map the affected responses.
  type CreateOrderFromQuote = "createOrderFromQuote post /quote/order/{id}";

  export type operations = Omit<FallbackOperations, CreateOrderFromQuote> &
    CustomOperations & {
      [K in CreateOrderFromQuote]: Omit<DefaultOperations[K], "response"> & {
        response: CustomSchemas["Order"];
      };
    };

  // Shopware 6.7 declares `LineItem.payload` as required, but container,
  // promotion and custom line items carry no product payload. Keep it
  // optional (as in the default types the composables are written against).
  type LineItem = Omit<CustomSchemas["LineItem"], "payload"> & {
    payload?: CustomSchemas["LineItem"]["payload"];
  };

  export type Schemas = Omit<DefaultSchemas, keyof CustomSchemas> &
    Omit<CustomSchemas, "LineItem"> & { LineItem: LineItem };

  // we're exporting our own Api Client definition as it depends on our own instance
  export type ApiClient = ReturnType<typeof createAPIClient<operations>>;
}
