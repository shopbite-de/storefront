import { describe, expect, it } from "vitest";
import { NAVIGATION_ROOT, pickMenuRoot } from "../../app/utils/menuRoot";

const ENV = "211cf9b2d1725130a517bbadf753a43c";
const PLUGIN = "018dadb399837af3aa669c8fff4f4d6c";

describe("pickMenuRoot", () => {
  it("keeps the environment variable of existing installations", () => {
    expect(pickMenuRoot(ENV, PLUGIN)).toBe(ENV);
  });

  it("takes the plugin configuration without the variable", () => {
    expect(pickMenuRoot("", PLUGIN)).toBe(PLUGIN);
    expect(pickMenuRoot(undefined, PLUGIN)).toBe(PLUGIN);
  });

  it("falls back to the navigation root (older plugin, no answer)", () => {
    expect(pickMenuRoot("", undefined)).toBe(NAVIGATION_ROOT);
    expect(pickMenuRoot(undefined, null)).toBe(NAVIGATION_ROOT);
  });
});
