import { answerDomain } from "../../utils/domainHttp";
import { shopPath } from "../../utils/shopPaths";
import { toSitemapUrls } from "../../utils/sitemap";

/**
 * Dynamic sitemap source: the contact page (at the locale's path) and the menu sections
 * (`NavigationPort.listSitemapEntries`). Dishes follow once they have their
 * own pages (#289).
 */
export default defineSitemapEventHandler(async (event) => {
  const { shopBite } = useRuntimeConfig().public;
  const entries = await answerDomain(() =>
    useBackend(event).navigation.listSitemapEntries(),
  );
  return [
    ...(shopBite.feature.contactForm ? [shopPath("kontakt")] : []),
    ...toSitemapUrls(entries),
  ];
});
