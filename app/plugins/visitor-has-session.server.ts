/**
 * Whether the visitor brought a storefront session this server can
 * unseal (ADR 0001, step 5): `app.vue` starts a session with
 * `POST /api/session` after the first page has loaded when not, so a
 * write cut off by a navigation still lands in it. A malformed cookie or
 * one sealed with a dropped password counts as none. Read only.
 */
export default defineNuxtPlugin({
  name: "shopbite:visitor-has-session",
  async setup() {
    const has = (
      useRequestEvent()?.context as
        { shopbiteHasVisitorSession?: () => Promise<boolean> } | undefined
    )?.shopbiteHasVisitorSession;
    useState<boolean>("visitor-has-session").value = has
      ? await has().catch(() => false)
      : false;
  },
});
