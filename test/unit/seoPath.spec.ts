import { describe, expect, it, vi } from "vitest";
import { resolveSeoPath } from "../../app/utils/seoPath";

type SeoUrl = { seoPathInfo?: string; foreignKey: string };

// Backend lookups are case-insensitive but exact on the trailing slash; the
// fake resolver receives the (router-encoded) path like the real one.
const resolverFor = (seoUrls: Record<string, SeoUrl>) =>
  vi.fn(async (path: string) => {
    const key = Object.keys(seoUrls).find(
      (seoPath) => seoPath.toLowerCase() === decodeURI(path).toLowerCase(),
    );
    return key ? seoUrls[key]! : null;
  });

const pizza = { seoPathInfo: "c/Pizza/", foreignKey: "pizza" };
const margherita = { seoPathInfo: "Pizza-Margherita/21", foreignKey: "p21" };
const drinks = { seoPathInfo: "c/Getränke/", foreignKey: "drinks" };

describe("resolveSeoPath", () => {
  it("returns an exact match without a second lookup or redirect", async () => {
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

  it("redirects a differently cased path to the SEO URL (#244)", async () => {
    const resolve = resolverFor({ "/c/Pizza/": pizza });

    await expect(resolveSeoPath("/c/pizza/", resolve)).resolves.toEqual({
      match: pizza,
      redirectPath: "/c/Pizza/",
    });
    expect(resolve).toHaveBeenCalledTimes(1);

    await expect(resolveSeoPath("/c/PIZZA", resolve)).resolves.toEqual({
      match: pizza,
      redirectPath: "/c/Pizza/",
    });
  });

  it("does not redirect an encoded path that matches its SEO URL", async () => {
    const resolve = resolverFor({ "/c/Getränke/": drinks });

    await expect(resolveSeoPath("/c/Getr%C3%A4nke/", resolve)).resolves.toEqual(
      { match: drinks },
    );
  });

  it("redirects a technical path to its SEO URL", async () => {
    const resolve = resolverFor({ "/navigation/abc": pizza });

    await expect(resolveSeoPath("/navigation/abc", resolve)).resolves.toEqual({
      match: pizza,
      redirectPath: "/c/Pizza/",
    });
  });

  it("returns no match for unknown paths", async () => {
    const resolve = resolverFor({ "/c/Pizza/": pizza });

    await expect(resolveSeoPath("/c/Unbekannt", resolve)).resolves.toEqual({
      match: null,
    });
    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it("keeps matches without SEO path (technical fallback routes)", async () => {
    const resolve = resolverFor({ "/navigation/abc": { foreignKey: "abc" } });

    await expect(resolveSeoPath("/navigation/abc", resolve)).resolves.toEqual({
      match: { foreignKey: "abc" },
    });
  });

  it("ignores toggled matches without SEO path", async () => {
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
