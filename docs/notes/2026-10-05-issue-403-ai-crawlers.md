# Issue #403: AI crawler policy in robots.txt

As of 2026-10-05, branch `feature/403-ai-crawler-robots`. Part of the AI visibility issues #400–#404.

## Implementation

- `runtimeConfig.aiCrawlers` (server-only): `search` and `training`, both `true` by default (the previous behaviour, now explicit). Env: `NUXT_AI_CRAWLERS_SEARCH`, `NUXT_AI_CRAWLERS_TRAINING`.
- `server/plugins/ai-crawlers.ts` hooks `robots:config` of `@nuxtjs/robots` (6.2), which runs at runtime for robots.txt and for the per-request `X-Robots-Tag`. A build-time `robots.groups` entry could not read the env. The hook gets a fresh copy of the configured groups on every call, so pushing groups does not accumulate.
- `server/utils/aiCrawlers.ts` (pure, unit-tested) builds one group per kind. A crawler matching a named group ignores the `*` group, so an allowed group repeats the `*` disallow paths (La Fattoria's legal pages stay blocked for AI bots too).
- User agents verified on the operators' pages on 2026-10-05 (sources in the file header). `Google-Extended` and `Applebot-Extended` are control tokens, not crawlers; Google AI Overviews follow Googlebot, not `Google-Extended`.
- Non-indexable sites (demo) never reach the hook: the module answers with `Disallow: /` before resolving groups.

## Verification

Production build against the demo backend: default robots.txt lists both groups with `Allow: /` plus the three disallows; `NUXT_AI_CRAWLERS_TRAINING=false` gives the training group `Disallow: /` and a GPTBot request gets `X-Robots-Tag: noindex, nofollow`; `NUXT_SITE_INDEXABLE=false` keeps the single `Disallow: /`. Unit tests, typecheck, ESLint green.
