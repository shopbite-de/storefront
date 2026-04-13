import { encodeForQuery } from "@shopware/api-client/helpers";

const criteria = encodeForQuery({
  includes: {
    category: [
      "name",
      "translated",
      "seoUrl",
      "customFields",
      "children",
      "linkNewTab",
    ],
  },
});

export default defineEventHandler(async (event) => {
  const { activeId, rootId } = getQuery(event) as {
    activeId: string;
    rootId: string;
  };

  if (!activeId || !rootId) {
    throw createError({
      statusCode: 400,
      statusMessage: "activeId and rootId required",
    });
  }

  return await shopwareFetch(event, `/navigation/${activeId}/${rootId}`, {
    query: { _criteria: criteria },
  });
});
