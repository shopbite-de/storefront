import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";

type Schemas = components["schemas"];

const MAX_OPTION_IDS = 20;
const MAX_OPTION_ID_LENGTH = 64;

function parseOptionIds(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : [raw];
  const seen = new Set<string>();
  for (const v of arr) {
    if (
      typeof v !== "string" ||
      v.trim() === "" ||
      v.length > MAX_OPTION_ID_LENGTH
    )
      continue;
    seen.add(v);
    if (seen.size >= MAX_OPTION_IDS) break;
  }
  return [...seen];
}

export default defineCachedEventHandler(
  async (event): Promise<Schemas["Product"] | null> => {
    const { parentId, optionIds: rawOptionIds } = getQuery(event);

    if (typeof parentId !== "string" || parentId.trim() === "") {
      throw createError({
        statusCode: 400,
        message: "Missing or invalid parentId",
      });
    }

    const optionIds = parseOptionIds(rawOptionIds);
    if (optionIds.length === 0) {
      throw createError({
        statusCode: 400,
        message: "At least one optionId is required",
      });
    }

    const { endpoint, accessToken } = useRuntimeConfig().public.shopware;

    const filter: Schemas["Filters"] = [
      { type: "equals", field: "parentId", value: parentId },
      ...optionIds.map(
        (id) =>
          ({
            type: "equals",
            field: "optionIds",
            value: id,
          }) as Schemas["EqualsFilter"],
      ),
    ];

    const response = await $fetch<{ elements?: Schemas["Product"][] }>(
      `${endpoint}/product`,
      {
        method: "POST",
        headers: { "sw-access-key": accessToken },
        body: {
          filter,
          limit: 1,
          includes: {
            product: [
              "id",
              "name",
              "description",
              "translated",
              "productNumber",
              "options",
              "properties",
              "calculatedPrice",
            ],
            product_option: ["id", "groupId", "name", "translated", "group"],
            property: ["id", "name", "translated", "options"],
            property_group_option: ["id", "name", "translated", "group"],
          },
          associations: {
            options: { associations: { group: {} } },
            properties: { associations: { group: {} } },
          },
        },
      },
    );

    return response.elements?.[0] ?? null;
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.variant,
    name: "variant",
    getKey: (event) => {
      const { parentId, optionIds } = getQuery(event);
      const ids = parseOptionIds(optionIds).sort();
      return `variant-${parentId}-${ids.join("|")}`;
    },
  },
);
