// robots.txt groups for AI crawlers (#403). Pure, so it is unit-testable;
// `server/plugins/ai-crawlers.ts` adds the groups at runtime.
//
// User agents as documented by the operators (checked 2026-10):
// OpenAI https://platform.openai.com/docs/bots, Anthropic
// https://support.claude.com/en/articles/8896518, Perplexity
// https://docs.perplexity.ai/guides/bots, Google
// https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers,
// Apple https://support.apple.com/en-us/119829, Common Crawl
// https://commoncrawl.org/ccbot, Meta
// https://developers.facebook.com/docs/sharing/webmasters/web-crawlers,
// Mistral https://docs.mistral.ai/robots.

/** Fetch pages to answer a user's question and link to the source. */
export const AI_SEARCH_USER_AGENTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "MistralAI-User",
];

/**
 * Collect content to train models. Google-Extended and Applebot-Extended are
 * tokens only: Googlebot/Applebot crawl, the token decides about AI use.
 */
export const AI_TRAINING_USER_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "meta-externalagent",
];

export type AiCrawlerPolicy = {
  /** Allow AI search and assistant fetches (default true). */
  search: boolean;
  /** Allow crawling for model training (default true). */
  training: boolean;
};

type RobotsGroup = {
  userAgent: string[];
  allow: string[];
  disallow: string[];
  comment: string[];
};

/**
 * One group per kind. A crawler that matches a named group ignores the `*`
 * group, so an allowed group repeats its disallow rules.
 */
export function buildAiCrawlerGroups(
  policy: AiCrawlerPolicy,
  disallow: string[],
): RobotsGroup[] {
  const group = (
    comment: string,
    userAgent: string[],
    allowed: boolean,
  ): RobotsGroup => ({
    comment: [comment],
    userAgent,
    allow: allowed ? ["/"] : [],
    disallow: allowed ? disallow.filter((path) => path && path !== "/") : ["/"],
  });

  return [
    group(
      "AI search and assistants: answer questions with a link to this shop",
      AI_SEARCH_USER_AGENTS,
      policy.search,
    ),
    group("AI model training", AI_TRAINING_USER_AGENTS, policy.training),
  ];
}
