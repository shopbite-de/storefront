import { describe, expect, it } from "vitest";
import {
  AI_SEARCH_USER_AGENTS,
  AI_TRAINING_USER_AGENTS,
  buildAiCrawlerGroups,
} from "../../server/utils/aiCrawlers";

const disallow = ["/merkliste", "/passwort-vergessen"];

describe("buildAiCrawlerGroups", () => {
  it("allows both kinds and repeats the disallow rules by default", () => {
    const [search, training] = buildAiCrawlerGroups(
      { search: true, training: true },
      disallow,
    );

    expect(search).toMatchObject({
      userAgent: AI_SEARCH_USER_AGENTS,
      allow: ["/"],
      disallow,
    });
    expect(training).toMatchObject({
      userAgent: AI_TRAINING_USER_AGENTS,
      allow: ["/"],
      disallow,
    });
  });

  it("blocks training crawlers only", () => {
    const [search, training] = buildAiCrawlerGroups(
      { search: true, training: false },
      disallow,
    );

    expect(search).toMatchObject({ allow: ["/"], disallow });
    expect(training).toMatchObject({ allow: [], disallow: ["/"] });
  });

  it("does not copy a site-wide Disallow: / into an allowed group", () => {
    const [search] = buildAiCrawlerGroups({ search: true, training: true }, [
      "/",
      "",
      "/konto",
    ]);

    expect(search!.disallow).toEqual(["/konto"]);
  });
});
