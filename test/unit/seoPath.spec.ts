import { describe, expect, it, vi } from "vitest";
import { resolveSeoPath } from "../../app/utils/seoPath";

type SeoUrl = { seoPathInfo?: string; foreignKey: string };

const resolverFor = (seoUrls: Record<string, SeoUrl>) =>
  vi.fn(async (path: string) => seoUrls[path] ?? null);

const pizza = { seoPathInfo: "c/Pizza/", foreignKey: "pizza" };
const margherita = { seoPathInfo: "Pizza-Margherita/21", foreignKey: "p21" };

describe("resolveSeoPath", () => {
  it("returns an exact match without a second lookup", async () => {
    const resolve = resolverFor({ "/c/Pizza/": pizza });

    await expect(resolveSeoPath("/c/Pizza/", resolve)).resolves.toEqual({
      match: pizza,
    });
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it("adds a missing trailing slash and redirects to the SEO URL", async () => {
    const resolve = resolverFor({ "/c/Pizza/": pizza });

    await expect(resolveSeoPath("/c/Pizza", resolve)).resolves.toEqual({
      match: pizza,
      redirectPath: "/c/Pizza/",
    });
    expect(resolve).toHaveBeenLastCalledWith("/c/Pizza/");
  });

  it("removes a superfluous trailing slash and redirects", async () => {
    const resolve = resolverFor({ "/Pizza-Margherita/21": margherita });

    await expect(
      resolveSeoPath("/Pizza-Margherita/21/", resolve),
    ).resolves.toEqual({
      match: margherita,
      redirectPath: "/Pizza-Margherita/21",
    });
  });

  it("returns no match for unknown paths", async () => {
    const resolve = resolverFor({ "/c/Pizza/": pizza });

    await expect(resolveSeoPath("/c/Unbekannt", resolve)).resolves.toEqual({
      match: null,
    });
    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it("ignores toggled matches without SEO path (technical routes)", async () => {
    const resolve = resolverFor({ "/navigation/abc/": { foreignKey: "abc" } });

    await expect(resolveSeoPath("/navigation/abc", resolve)).resolves.toEqual({
      match: null,
    });
  });

  it("does not toggle the root path", async () => {
    const resolve = resolverFor({});

    await expect(resolveSeoPath("/", resolve)).resolves.toEqual({
      match: null,
    });
    expect(resolve).toHaveBeenCalledTimes(1);
  });
});
