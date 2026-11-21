import {
  NAVIGATION_KINDS,
  type NavigationKind,
  type NavigationNode,
} from "../../../shared/domain";
import { createResilientLoader } from "../../utils/backoff";
import { answerDomain, toHttpError } from "../../utils/domainHttp";
import { menuRootData } from "../../utils/navigationData";

const load = createResilientLoader<readonly NavigationNode[]>();

function kindOf(value: string | undefined): NavigationKind | null {
  return NAVIGATION_KINDS.find((kind) => kind === value) ?? null;
}

type RootContext = { context?: Record<string, unknown> };

/**
 * The menu root of a menu navigation, resolved once per request (key and
 * request share `event.context`), so one request never mixes two roots.
 * The other navigations have none. Without a menu root the key rejects
 * and nothing is cached.
 */
async function rootOf(
  event: RootContext,
  kind: NavigationKind | null,
): Promise<string> {
  const context = (event.context ??= {});
  if (typeof context.navigationRoot === "string") return context.navigationRoot;
  const root =
    kind === "menu" || kind === "home"
      ? await menuRootData.cached().catch((error: unknown) => {
          throw toHttpError(error);
        })
      : "";
  context.navigationRoot = root;
  return root;
}

const kindParam = (event: Parameters<typeof getRouterParam>[0]) =>
  kindOf(getRouterParam(event, "kind"));

/**
 * The navigations every page renders (NavigationNode[]): `main` (header),
 * `footer`, `menu` (the menu sections below the menu root, #486) and
 * `home` (the sections with their photo). Shared by all visitors, so the
 * server keeps them instead of asking the backend on each request; the
 * key of the menu navigations carries the menu root, which the shop
 * backend's settings may change.
 */
export default defineCachedEventHandler(
  async (event): Promise<readonly NavigationNode[]> => {
    const kind = kindParam(event);
    if (!kind) throw createError({ statusCode: 404 });
    const root = await rootOf(event, kind);
    return answerDomain(() =>
      load(`${kind}-${root}`, () =>
        useBackend(event).navigation.getNavigation(kind),
      ),
    );
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.navigation,
    name: "navigation",
    getKey: async (event) => {
      const kind = kindParam(event);
      const root = await rootOf(event, kind);
      return root ? `navigation-${kind}-${root}` : `navigation-${kind}`;
    },
  },
);
