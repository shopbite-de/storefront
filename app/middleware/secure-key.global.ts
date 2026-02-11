import { defineNuxtRouteMiddleware, navigateTo, useCookie } from "#app";

export default defineNuxtRouteMiddleware((to) => {
  // Normalize query param (can be string | string[] | undefined)
  const q = to.query.secureKey as string | string[] | undefined;
  const providedSecureKey = Array.isArray(q) ? q[0] : q;

  // Read secure key from public runtime config
  const definedSecureKey = useRuntimeConfig().public?.shopBite?.feature
    ?.secureKey as string | undefined;

  if (!definedSecureKey) return;

  // Cookie used to persist successful auth
  const cookie = useCookie<string | null>("store_secure_key", {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  // If a key is provided in the URL, always persist it and strip it from the URL
  if (providedSecureKey) {
    cookie.value = providedSecureKey;

    // Strip auth-related query params from URL
    const { path, query, hash } = to;
    const {
      secureKey: _s,
      key: _k,
      token: _t,
      ...rest
    } = query as typeof to.query;

    // Navigate once to clean the URL; middleware will re-run after this
    return navigateTo({ path, query: rest, hash }, { replace: true });
  }

  // When feature is enabled, enforce that cookie matches configured key
  if (cookie.value === definedSecureKey) return;

  if (to.path === "/maintenance") return;

  // Not authorized — redirect to maintenance
  return navigateTo("/maintenance");
});
