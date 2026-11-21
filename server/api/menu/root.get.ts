import { answerDomain } from "../../utils/domainHttp";
import { menuRootData } from "../../utils/navigationData";

/**
 * The id of the menu's root section (`useMenuRootId`), so the browser does
 * not ask the backend for it. Strict: when the backend cannot tell it
 * fails instead of answering a guess, so the browser does not keep a
 * wrong root for the visit.
 */
export default defineEventHandler(async () =>
  answerDomain(async () => ({ id: await menuRootData.cached() })),
);
