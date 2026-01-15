import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminApiClient,
  getSalesChannels,
} from "../../server/utils/shopware/adminApiClient";

describe("Shopware Admin API Client", () => {
  describe("createAdminApiClient", () => {
    it("should create a client with correct configuration", () => {
      const endpoint = "https://shopware.example.com/api";
      const accessToken = "test-token";

      const client = createAdminApiClient(endpoint, accessToken);

      expect(client).toBeDefined();
      // The client should have the invoke method
      expect(client).toHaveProperty("invoke");
      expect(typeof client.invoke).toBe("function");
    });
  });

  describe("getSalesChannels", () => {
    it("should fetch sales channels successfully", async () => {
      // Mock the client
      const mockClient = {
        invoke: vi.fn().mockResolvedValue({
          data: [
            { id: "1", name: "Storefront", typeId: "storefront" },
            { id: "2", name: "Headless", typeId: "headless" },
          ],
        }),
      };

      const result = await getSalesChannels(mockClient);

      expect(result).toEqual([
        { id: "1", name: "Storefront", typeId: "storefront" },
        { id: "2", name: "Headless", typeId: "headless" },
      ]);

      expect(mockClient.invoke).toHaveBeenCalledWith({
        method: "GET",
        path: "/api/v3/sales-channel",
      });
    });

    it("should handle errors when fetching sales channels", async () => {
      const mockClient = {
        invoke: vi.fn().mockRejectedValue(new Error("API error")),
      };

      await expect(getSalesChannels(mockClient)).rejects.toThrow("API error");
    });

    it("should handle empty response gracefully", async () => {
      const mockClient = {
        invoke: vi.fn().mockResolvedValue({
          data: [],
        }),
      };

      const result = await getSalesChannels(mockClient);
      expect(result).toEqual([]);
    });
  });
});
