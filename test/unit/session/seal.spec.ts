import { describe, expect, it } from "vitest";
import { createSealer, sessionPasswords } from "../../../server/session/seal";

/**
 * The session cookie carries the backends' states sealed (ADR 0001,
 * step 4): encrypted and authenticated with the shop's password, so the
 * browser can neither read nor change them, and they survive restarts.
 */
const PASSWORD = "a".repeat(16) + "B".repeat(16) + "-current";
const PREVIOUS = "z".repeat(40);
const COOKIE = "shopbite-session";

describe("createSealer", () => {
  it("seals and unseals a value; the sealed text shows nothing of it", async () => {
    const sealer = createSealer({ passwords: [PASSWORD], name: COOKIE });
    const sealed = sealer.seal({ token: "ContextToken0123456789abcdefABCD" });

    expect(sealed).toMatch(
      /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    );
    expect(sealed).not.toContain("ContextToken");
    expect(sealer.unseal(sealed)).toEqual({
      token: "ContextToken0123456789abcdefABCD",
    });
    // a fresh nonce every time
    expect(sealer.seal({ a: 1 })).not.toBe(sealer.seal({ a: 1 }));
  });

  it("refuses a changed, foreign or broken value", () => {
    const sealer = createSealer({ passwords: [PASSWORD], name: COOKIE });
    const sealed = sealer.seal({ token: "t" });
    const [version, kid, iv, data] = sealed.split(".");
    const flipped =
      data!.slice(0, -2) + (data!.endsWith("A") ? "B" : "A") + data!.slice(-1);

    expect(sealer.unseal(`${version}.${kid}.${iv}.${flipped}`)).toBeNull();
    expect(sealer.unseal(`v2.${kid}.${iv}.${data}`)).toBeNull();
    expect(sealer.unseal("garbage")).toBeNull();
    expect(sealer.unseal("")).toBeNull();
    expect(
      createSealer({ passwords: [PREVIOUS], name: COOKIE }).unseal(sealed),
    ).toBeNull();
    // bound to the cookie's name
    expect(
      createSealer({ passwords: [PASSWORD], name: "other" }).unseal(sealed),
    ).toBeNull();
  });

  it("accepts values of a previous password and seals with the current one (rotation)", () => {
    const before = createSealer({ passwords: [PREVIOUS], name: COOKIE });
    const after = createSealer({
      passwords: [PASSWORD, PREVIOUS],
      name: COOKIE,
    });
    const old = before.seal({ token: "t" });

    expect(after.unseal(old)).toEqual({ token: "t" });
    expect(before.unseal(after.seal({ token: "t" }))).toBeNull();
  });

  it("needs passwords of at least 32 characters", () => {
    expect(() => createSealer({ passwords: ["short"], name: COOKIE })).toThrow(
      /32/,
    );
    expect(() => createSealer({ passwords: [], name: COOKIE })).toThrow();
  });
});

describe("sessionPasswords", () => {
  it("takes the current password first, then the previous ones", () => {
    expect(
      sessionPasswords({
        password: PASSWORD,
        previousPasswords: ` ${PREVIOUS} , ${"y".repeat(32)} `,
        production: true,
      }),
    ).toEqual({
      passwords: [PASSWORD, PREVIOUS, "y".repeat(32)],
      generated: false,
    });
  });

  it("fails loudly in production without a password or with a short one", () => {
    expect(() =>
      sessionPasswords({
        password: "",
        previousPasswords: "",
        production: true,
      }),
    ).toThrow(/NUXT_VISITOR_SESSION_PASSWORD/);
    expect(() =>
      sessionPasswords({
        password: "short",
        previousPasswords: "",
        production: true,
      }),
    ).toThrow(/32/);
    expect(() =>
      sessionPasswords({
        password: PASSWORD,
        previousPasswords: "short",
        production: true,
      }),
    ).toThrow(/32/);
  });

  it("generates one for development", () => {
    const { passwords, generated } = sessionPasswords({
      password: "",
      previousPasswords: "",
      production: false,
    });
    expect(generated).toBe(true);
    expect(passwords).toHaveLength(1);
    expect(passwords[0]!.length).toBeGreaterThanOrEqual(32);
  });
});
