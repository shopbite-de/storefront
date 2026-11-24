/**
 * Where the Shopware adapter finds the Store API (ADR 0001, step 8): the
 * private runtime config `shopware.endpoint` and `shopware.accessToken`
 * (NUXT_SHOPWARE_ENDPOINT, NUXT_SHOPWARE_ACCESS_TOKEN). Nothing of it is
 * public: the browser never talks to Shopware.
 *
 * Until 2.x the endpoint and the access key were public runtime config
 * (NUXT_PUBLIC_SHOPWARE_ENDPOINT, NUXT_PUBLIC_SHOPWARE_ACCESS_TOKEN). In
 * 3.x those names are still read, from the server's environment at
 * runtime only (never a value of the public config), when the new name
 * is not set; one warning at startup names the new variables.
 */

export type ShopwareConnectionConfig =
  Readonly<{ endpoint?: string; accessToken?: string }> | undefined;

export type ShopwareConnection = Readonly<{
  endpoint: string;
  accessToken: string;
}>;

type Env = Readonly<Record<string, string | undefined>>;

const SETTINGS = [
  {
    key: "endpoint",
    name: "NUXT_SHOPWARE_ENDPOINT",
    legacy: "NUXT_PUBLIC_SHOPWARE_ENDPOINT",
  },
  {
    key: "accessToken",
    name: "NUXT_SHOPWARE_ACCESS_TOKEN",
    legacy: "NUXT_PUBLIC_SHOPWARE_ACCESS_TOKEN",
  },
] as const;

const filled = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/**
 * The connection with what is deprecated (old names in use or left
 * over) and what is missing, by environment variable name; no values.
 */
export function resolveShopwareConnection(
  config: ShopwareConnectionConfig,
  env: Env,
): ShopwareConnection & { deprecated: string[]; missing: string[] } {
  const deprecated: string[] = [];
  const missing: string[] = [];
  const values = { endpoint: "", accessToken: "" };
  for (const setting of SETTINGS) {
    const current = filled(config?.[setting.key]);
    const legacy = filled(env[setting.legacy]);
    if (current) {
      values[setting.key] = current;
      if (legacy) {
        deprecated.push(`${setting.legacy} (not read: ${setting.name} is set)`);
      }
    } else if (legacy) {
      values[setting.key] = legacy;
      deprecated.push(`${setting.legacy} → ${setting.name}`);
    } else {
      missing.push(setting.name);
    }
  }
  return { ...values, deprecated, missing };
}

/**
 * The connection the storefront starts with: in production a missing
 * endpoint or access key stops the start (thrown), during development it
 * is a warning; old names give one warning.
 */
export function shopwareConnection(
  config: ShopwareConnectionConfig,
  env: Env,
  options: { production: boolean; warn: (message: string) => void },
): ShopwareConnection {
  const { endpoint, accessToken, deprecated, missing } =
    resolveShopwareConnection(config, env);
  if (deprecated.length) {
    options.warn(
      `[shopware] Since 3.0 the Store API endpoint and access key are private runtime config; rename ${deprecated.join(", ")}. The old names are read on the server until 4.0.`,
    );
  }
  if (missing.length) {
    const message = `[shopware] The Store API connection is incomplete: set ${missing.join(" and ")} (private runtime config shopware.endpoint / shopware.accessToken; the \`shopware\` key of nuxt.config and the public runtime config are no longer read), or select another backend with NUXT_SHOP_BITE_BACKEND.`;
    if (options.production) throw new Error(message);
    options.warn(message);
  }
  return { endpoint, accessToken };
}
