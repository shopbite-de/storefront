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

const createNavigationItemSchema = () =>
  z.object({
    label: z.string().nonempty(),
    icon: z.string().optional().editor({ input: "icon" }),
    to: z.string().nonempty(),
    target: createEnum(["_blank", "_self"]),
    type: createEnum(["label", "item"]).optional(),
    action: z.string().optional(),
  });

const createFooterColumnSchema = () =>
  z.object({
    label: z.string().nonempty(),
    children: z.array(
      z.object({
        label: z.string().nonempty(),
        to: z.string().optional(),
      }),
    ),
  });

export default defineContentConfig({
  collections: {
    home: defineCollection({
      source: "index.yml",
      type: "page",
      schema: z.object({
        hero: z.object({
          backgroundVideo: z.string().optional(),
          headline: z.string().optional(),
          links: z.array(createLinkSchema()),
          usps: z.array(
            z.object({
              title: z.string().optional(),
              subtitle: z.string().optional(),
              icon: z.string().optional(),
              link: z.string().optional(),
            }),
          ),
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
        gallery: createBaseSchema().extend({
          images: z.array(
            z.object({
              image: z.string().nonempty(),
              alt: z.string().nonempty(),
            }),
          ),
          links: z.array(createLinkSchema()),
        }),
      }),
    }),
    navigation: defineCollection({
      source: "navigation.yml",
      type: "page",
      schema: z.object({
        main: z.array(createNavigationItemSchema()),
        account: z.object({
          loggedIn: z.array(z.array(createNavigationItemSchema())),
          loggedOut: z.array(z.array(createNavigationItemSchema())),
        }),
        footer: z.object({
          withGithubLink: z.boolean(),
          withColorModeSwitch: z.boolean(),
          text: z.string().optional(),
          columns: z.array(createFooterColumnSchema()),
        }),
      }),
    }),
  },
});
