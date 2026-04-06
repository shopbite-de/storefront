import { defineCollection, defineContentConfig, z } from "@nuxt/content";

const createEnum = (options: [string, ...string[]]) => z.enum(options);

const createLinkSchema = () =>
  z.object({
    label: z.string().nonempty(),
    to: z.string().nonempty(),
    icon: z.string().optional().editor({ input: "icon" }),
    size: createEnum(["xs", "sm", "md", "lg", "xl"]),
    trailing: z.boolean().optional(),
    trailingIcon: z.string().optional().editor({ input: "icon" }),
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
        mittagstisch: createBaseSchema().extend({
          reverse: z.boolean().optional(),
          orientation: createEnum(["horizontal", "vertical"]).optional(),
          image: z.string().optional(),
          imageAlt: z.string().optional(),
          features: z.array(createFeatureSchema()),
          links: z.array(createLinkSchema()),
        }),
        cta: createBaseSchema().extend({
          links: z.array(createLinkSchema()),
          backgroundImage: z.string().optional(),
        }),
      }),
    }),
    landingpages: defineCollection({
      source: "**/*.md",
      type: "page",
      schema: z.object({
        title: z.string().min(1),
        description: z.string().optional(),
      }),
    }),
  },
});
