import { defineCollection, defineContentConfig, z } from "@nuxt/content";
import { defineSitemapSchema } from "@nuxtjs/sitemap/content";

/**
 * The content folder of the shop's locale (ADR 0002), set by
 * modules/locale.ts before Nuxt Content reads this file: a shop keeps its
 * pages at the top of its content/ folder, in its one language. A folder
 * named after the locale (the storefront's own `content/en/`) is used
 * instead when it exists; folders of other locales are never read.
 */
const localeDir = process.env.NUXT_SHOPBITE_CONTENT_DIR || "";
const otherLocaleDirs = (process.env.NUXT_SHOPBITE_CONTENT_EXCLUDE || "")
  .split(",")
  .filter(Boolean)
  .map((code) => `${code}/**`);
const source = (include: string) =>
  localeDir
    ? { include: `${localeDir}/${include}`, prefix: "/" }
    : { include, exclude: otherLocaleDirs };

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
    // Information cards on the home page (#332): `kind` fills the lead line
    // with live data (today's hours, delivery or pickup time), `lead` is the static
    // alternative, `link` the card's action (a `tel:` target is a button).
    kind: createEnum(["hours", "delivery", "pickup", "reservation"]).optional(),
    lead: z.string().optional(),
    link: z
      .object({
        label: z.string().nonempty(),
        to: z.string().nonempty(),
      })
      .optional(),
    ui: z
      .object({
        leading: z.string().optional(),
      })
      .editor({ hidden: true }),
  });

export default defineContentConfig({
  collections: {
    home: defineCollection({
      source: source("index.yml"),
      type: "page",
      schema: z.object({
        hero: z.object({
          backgroundVideo: z.string().optional(),
          poster: z.string().optional(),
          // Photo of the hero (#444), portrait 4:5 at about 1200×1500 px;
          // `poster` (a frame of the video) is the fallback. imagePosition
          // is the CSS object-position of the crop, e.g. "50% 30%".
          image: z.string().optional(),
          imagePosition: z.string().optional(),
          headline: z.string().optional(),
          // Hero title; the page title (shop name) is the fallback (#327).
          title: z.string().optional(),
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
        // Headings of the menu tiles and the top seller grid below the hero
        // (#388); the components carry German defaults.
        menu: createBaseSchema().partial().optional(),
        highlights: createBaseSchema().partial().optional(),
        // Questions and answers above the call to action, also emitted as
        // FAQPage JSON-LD and in /llms.txt (#404). Plain text answers.
        faq: createBaseSchema()
          .partial()
          .extend({
            items: z.array(
              z.object({
                question: z.string().nonempty(),
                answer: z.string().nonempty(),
              }),
            ),
          })
          .optional(),
        gallery: createBaseSchema()
          .extend({
            images: z.array(
              z.object({
                image: z.string().nonempty(),
                alt: z.string().nonempty(),
              }),
            ),
            links: z.array(createLinkSchema()),
          })
          .optional(),
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
      source: source("**/*.md"),
      type: "page",
      schema: z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        sitemap: defineSitemapSchema({ z }),
      }),
    }),
  },
});
