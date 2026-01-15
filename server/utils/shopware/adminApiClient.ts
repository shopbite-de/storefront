import { createAdminAPIClient } from "@shopware/api-client";
import type { operations } from "@shopware/api-client/admin-api-types";

/**
 * Creates a Shopware Admin API client
 */
export function createAdminApiClient(baseURL: string, accessToken: string) {
  return createAdminAPIClient<operations>({
    baseURL,
    accessToken,
  });
}

/**
 * Fetches sales channels using the Admin API client
 */
export async function getSalesChannels(client: any) {
  const response = await client.invoke({
    method: "GET",
    path: "/api/v3/sales-channel",
  });

  return response.data;
}
