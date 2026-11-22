import { describe, expect, it, vi } from "vitest";
import {
  cutOffLayerClient,
  OFFLINE_BASE_URL,
} from "~/plugins/shopware-layer-offline";

describe("the Shopware layer cut off (ADR 0001, step 7)", () => {
  it("leaves the layer's client no token and no reachable base URL", () => {
    const client = {
      defaultHeaders: { "sw-context-token": "visitor-token" } as Record<
        string,
        string | undefined
      >,
      updateBaseConfig: vi.fn(),
    };
    cutOffLayerClient(client);
    expect(client.defaultHeaders["sw-context-token"]).toBe("");
    expect(client.updateBaseConfig).toHaveBeenCalledWith({
      baseURL: OFFLINE_BASE_URL,
    });
  });

  it("uses no environment check: the server render is cut off as well", async () => {
    const source = (await import("~/plugins/shopware-layer-offline?raw"))
      .default as string;
    expect(source).not.toMatch(/import\.meta\.(client|server)/);
  });

  it("is a base URL fetch refuses before any request", async () => {
    await expect(fetch(`${OFFLINE_BASE_URL}/context`)).rejects.toThrow();
  });
});
