import { answerBackendData, branchesData } from "../../utils/shopData";

/**
 * The branches of the restaurant, this storefront's marked current (Branch[]).
 * Cached for server-side rendering; `?fresh=1` asks the backend (ADR 0001).
 */
export default defineEventHandler((event) =>
  answerBackendData(event, branchesData),
);
