import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
} from "node:crypto";

/**
 * Sealed cookie values (ADR 0001, step 4): AES-256-GCM, encrypted and
 * authenticated, the key derived from the shop's password with HKDF-SHA256.
 * Format `v1.<key id>.<nonce>.<ciphertext and tag>` (base64url); the
 * version and the cookie's name are authenticated as well, so a value is
 * valid only for that cookie. Several passwords: the first seals, all
 * unseal (rotation).
 */
const VERSION = "v1";
const MIN_PASSWORD = 32;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const PART = /^[A-Za-z0-9_-]+$/;

type Key = Readonly<{ id: string; key: Buffer }>;

function keyOf(password: string): Key {
  const key = Buffer.from(
    hkdfSync("sha256", password, "shopbite-session", "cookie v1", 32),
  );
  const id = createHash("sha256").update(key).digest("base64url").slice(0, 8);
  return { id, key };
}

export interface Sealer {
  seal(value: unknown): string;
  /** The value, or null for anything not sealed by one of the passwords. */
  unseal(sealed: string): unknown;
}

export function createSealer(options: {
  passwords: readonly string[];
  name: string;
}): Sealer {
  if (!options.passwords.length) {
    throw new Error("A session needs a password.");
  }
  for (const password of options.passwords) {
    if (password.length < MIN_PASSWORD) {
      throw new Error(
        `A session password needs at least ${MIN_PASSWORD} characters.`,
      );
    }
  }
  const keys = options.passwords.map(keyOf);
  const aad = (id: string) => Buffer.from(`${VERSION}.${id}.${options.name}`);

  return {
    seal: (value) => {
      const { id, key } = keys[0]!;
      const nonce = randomBytes(NONCE_BYTES);
      const cipher = createCipheriv("aes-256-gcm", key, nonce);
      cipher.setAAD(aad(id));
      const data = Buffer.concat([
        cipher.update(JSON.stringify(value), "utf8"),
        cipher.final(),
        cipher.getAuthTag(),
      ]);
      return [
        VERSION,
        id,
        nonce.toString("base64url"),
        data.toString("base64url"),
      ].join(".");
    },
    unseal: (sealed) => {
      const parts = sealed.split(".");
      if (parts.length !== 4 || parts[0] !== VERSION) return null;
      const [, id, nonceText, dataText] = parts as [
        string,
        string,
        string,
        string,
      ];
      if (![id, nonceText, dataText].every((part) => PART.test(part))) {
        return null;
      }
      const key = keys.find((entry) => entry.id === id);
      if (!key) return null;
      try {
        const nonce = Buffer.from(nonceText, "base64url");
        const data = Buffer.from(dataText, "base64url");
        if (nonce.length !== NONCE_BYTES || data.length <= TAG_BYTES) {
          return null;
        }
        const decipher = createDecipheriv("aes-256-gcm", key.key, nonce);
        decipher.setAAD(aad(id));
        decipher.setAuthTag(data.subarray(data.length - TAG_BYTES));
        const text = Buffer.concat([
          decipher.update(data.subarray(0, data.length - TAG_BYTES)),
          decipher.final(),
        ]).toString("utf8");
        return JSON.parse(text) as unknown;
      } catch {
        return null;
      }
    },
  };
}

/**
 * The passwords of the runtime config (`visitorSession.password`,
 * `previousPasswords` comma-separated): the current one first. Production
 * refuses to start without one (a random password would end every session
 * on a restart); development generates one and says so.
 */
export function sessionPasswords(config: {
  password: string;
  previousPasswords: string;
  production: boolean;
}): { passwords: string[]; generated: boolean } {
  const previous = config.previousPasswords
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const all = [config.password.trim(), ...previous].filter(Boolean);
  if (!config.password.trim()) {
    if (config.production) {
      throw new Error(
        "The storefront session needs a password: set NUXT_VISITOR_SESSION_PASSWORD (at least 32 random characters, e.g. `openssl rand -hex 32`).",
      );
    }
    return {
      passwords: [randomBytes(32).toString("hex"), ...previous],
      generated: true,
    };
  }
  for (const password of all) {
    if (password.length < MIN_PASSWORD) {
      throw new Error(
        `Every NUXT_VISITOR_SESSION_PASSWORD / _PREVIOUS_PASSWORDS entry needs at least ${MIN_PASSWORD} characters.`,
      );
    }
  }
  return { passwords: all, generated: false };
}
