import { buildAiCrawlerGroups } from "../utils/aiCrawlers";

/**
 * Names the AI crawlers in robots.txt (#403): AI search bots are allowed by
 * default, training bots follow `runtimeConfig.aiCrawlers.training`
 * (NUXT_AI_CRAWLERS_TRAINING=false blocks them). Only runs for indexable
 * sites; a non-indexable site (demo) keeps its single `Disallow: /`.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("robots:config", (ctx) => {
    const { aiCrawlers } = useRuntimeConfig(ctx.event);
    const wildcard = ctx.groups.find((group) =>
      [group.userAgent ?? "*"].flat().includes("*"),
    );
    const disallow = [wildcard?.disallow ?? []].flat();

    ctx.groups.push(
      ...buildAiCrawlerGroups(
        {
          search: aiCrawlers.search !== false,
          training: aiCrawlers.training !== false,
        },
        disallow,
      ),
    );
  });
});
