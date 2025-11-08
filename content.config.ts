import { defineCollection, defineContentConfig } from "@nuxt/content";
import { z } from "zod";

const createEnum = (options: [string, ...string[]]) => z.enum(options);

const createLinkSchema = () =>
  z.object({
    label: z.string().nonempty(),
    to: z.string().nonempty(),
    icon: z.string().optional().editor({ input: "icon" }),
    size: createEnum(["xs", "sm", "md", "lg", "xl"]),
    trailing: z.boolean().optional(),
    target: createEnum(["_blank", "_self"]),
    color: createEnum([
      "primary",
      "secondary",
      "neutral",
      "error",
      "warning",
      "success",
      "info",
    ]),
    variant: createEnum([
      "solid",
      "outline",
      "subtle",
      "soft",
      "ghost",
      "link",
    ]),
  });

const createBaseSchema = () =>
  z.object({
    title: z.string().nonempty(),
    description: z.string().nonempty(),
    headline: z.string().optional(),
  });

const createFeatureSchema = () =>
  createBaseSchema().extend({
    icon: z.string().editor({ input: "icon" }),
    ui: z
      .object({
        leading: z.string().optional(),
      })
      .editor({ hidden: true }),
  });

export default defineContentConfig({
  collections: {
    home: defineCollection({
      source: "index.yml",
      type: "page",
      schema: z.object({
        hero: z.object({
          headline: z.string().optional(),
          links: z.array(createLinkSchema()),
        }),
        features: createBaseSchema().extend({
          features: z.array(createFeatureSchema()),
        }),
        marquee: createBaseSchema().extend({
          items: z.array(
            z.object({
              image: z.string().nonempty(),
              productId: z.string().nonempty(),
            }),
          ),
        }),
      }),
    }),
  },
});
