import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (event: { query: Record<string, unknown> }) => Promise<unknown>;

const { mockFirst, mockPath, mockQueryCollection } = vi.hoisted(() => {
  const mockFirst = vi.fn();
  const mockPath = vi.fn(() => ({ first: mockFirst }));
  const mockQueryCollection = vi.fn(() => ({ path: mockPath }));
  return { mockFirst, mockPath, mockQueryCollection };
});

vi.mock("@nuxt/content/server", () => ({
  queryCollection: mockQueryCollection,
}));

// Nitro auto-imports of the route, reduced to what it uses.
vi.stubGlobal("defineEventHandler", (handler: Handler) => handler);
vi.stubGlobal(
  "getQuery",
  (event: { query: Record<string, unknown> }) => event.query,
);
vi.stubGlobal(
  "createError",
  (input: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(input.statusMessage), input),
);

let handler: Handler;

beforeAll(async () => {
  // With the stubs above the default export is the plain handler function.
  handler = (await import("../../server/api/content/page.get"))
    .default as unknown as Handler;
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/content/page", () => {
  it("returns the content page of the path", async () => {
    const page = { path: "/agb", title: "AGB" };
    mockFirst.mockResolvedValue(page);

    await expect(handler({ query: { path: "/agb" } })).resolves.toEqual({
      page,
    });
    expect(mockQueryCollection).toHaveBeenCalledWith(
      expect.anything(),
      "landingpages",
    );
    expect(mockPath).toHaveBeenCalledWith("/agb");
  });

  it("answers page: null instead of a 404 when there is no content page", async () => {
    mockFirst.mockResolvedValue(null);

    await expect(
      handler({ query: { path: "/speisekarte/pizza/" } }),
    ).resolves.toEqual({ page: null });
  });

  it.each([
    ["missing", undefined],
    ["relative", "agb"],
    ["too long", `/${"x".repeat(256)}`],
    ["repeated", ["/agb", "/impressum"]],
  ])("rejects a %s path with 400", async (_label, path) => {
    await expect(handler({ query: { path } })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mockQueryCollection).not.toHaveBeenCalled();
  });
});
