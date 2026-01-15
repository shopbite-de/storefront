import type { operations } from "@shopware/api-client/admin-api-types";
import { createAdminAPIClient } from "@shopware/api-client";

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();

  // Get admin API credentials from runtime config
  const adminEndpoint = config.shopware.adminEndpoint;
  const adminClientId = config.shopware.adminClientId;
  const adminClientSecret = config.shopware.adminClientSecret;

  if (!adminEndpoint || !adminClientId || !adminClientSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "Shopware admin API credentials not configured",
    });
  }

  try {
    const adminApiClient = createAdminAPIClient<operations>({
      baseURL: adminEndpoint,
      credentials: {
        grant_type: "client_credentials",
        client_id: adminClientId,
        client_secret: adminClientSecret,
      },
    });

    const data = await adminApiClient.invoke(
      "searchSalesChannel post /search/sales-channel",
      {
        body: {
          includes: {
            sales_channel: ["id", "translated", "name", "domains", "active"],
            sales_channel_domain: ["url"],
          },
          associations: {
            domains: {},
          },
          filter: [
            {
              field: "active",
              type: "equals",
              value: true,
            },
          ],
        },
      },
    );

    // Validate response data
    if (!data || !data.data) {
      throw createError({
        statusCode: 500,
        statusMessage: "Invalid response from Shopware API",
      });
    }

    return data.data.data;
  } catch (error) {
    // Handle specific error cases
    if (error && typeof error === "object" && "statusCode" in error) {
      // Re-throw createError instances
      throw error;
    }

    // Log the error for debugging
    console.error("Failed to fetch sales channels:", error);

    // Return a user-friendly error
    throw createError({
      statusCode: 503,
      statusMessage: "Failed to fetch sales channels from Shopware",
      data: {
        originalError: error instanceof Error ? error.message : String(error),
      },
    });
  }
});
