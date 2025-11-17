import { defineNuxtRouteMiddleware, navigateTo } from "#app";

export default defineNuxtRouteMiddleware((to) => {
  // Only handle category pages
  if (!to.path.startsWith("/c/")) return;

  // Skip if it already has a trailing slash or it's just "/c/"
  if (to.path.endsWith("/") || to.path === "/c/") return;

  // Preserve query and hash while adding the trailing slash
  return navigateTo(
    {
      path: `${to.path}/`,
      query: to.query,
      hash: to.hash,
    },
    { redirectCode: 301 },
  );
});
