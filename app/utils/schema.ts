// Builders for the schema.org JSON-LD of the shop (#272). Pure functions, so
// they stay platform-neutral and unit-testable; the composables gather the
// data and hand it in.

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type BusinessHourLike = {
  /** 1 = Monday … 7 = Sunday */
  dayOfWeek?: number;
  openingTime?: string;
  closingTime?: string;
};

type HolidayLike = {
  start?: string;
  end?: string;
};

export type SiteInfo = {
  name: string;
  url: string;
  description?: string;
  image?: string;
  telephone?: string;
  cuisine?: string;
  priceRange?: string;
  googleBusinessProfileUrl?: string;
  /** Places the shop delivers to, e.g. "63179 Obertshausen" (#401). */
  deliveryAreas?: string[];
  /** Nuxt parses numeric env values into numbers. */
  geo?: { latitude?: number | string; longitude?: number | string };
  /** `true`/`false` or a text such as "Nur telefonisch". */
  acceptsReservations?: boolean | string;
  address?: {
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
};

export type MenuSectionInfo = {
  name: string;
  url?: string;
  sections?: MenuSectionInfo[];
};

export type MenuItemInfo = {
  name: string;
  description?: string;
  /** Main ingredients, the description when the product has none (#400). */
  ingredients?: string[];
  diets?: ("vegetarian" | "vegan")[];
  image?: string;
  price?: number;
};

// Vegan dishes are vegetarian too, so they carry both diets.
const DIET_URLS = {
  vegetarian: ["https://schema.org/VegetarianDiet"],
  vegan: ["https://schema.org/VegetarianDiet", "https://schema.org/VeganDiet"],
} as const;

function buildSuitableForDiet(diets: MenuItemInfo["diets"]) {
  return [...new Set((diets ?? []).flatMap((diet) => DIET_URLS[diet]))];
}

const formatTime = (time: string) => time.slice(0, 5);

/**
 * Weekly opening hours. Days with identical intervals share one entry, so
 * `Mo–Fr 11:30–14:30` becomes a single specification with five days.
 */
export function buildOpeningHoursSpecification(
  businessHours: BusinessHourLike[],
) {
  const days = new Map<string, string[]>();

  for (const bh of businessHours) {
    const day = DAY_NAMES[(bh.dayOfWeek ?? 0) - 1];
    if (!day || !bh.openingTime || !bh.closingTime) continue;
    const key = `${formatTime(bh.openingTime)}-${formatTime(bh.closingTime)}`;
    days.set(key, [...(days.get(key) ?? []), day]);
  }

  return [...days.entries()].map(([key, dayOfWeek]) => {
    const [opens, closes] = key.split("-");
    return {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: dayOfWeek.sort(
        (a, b) =>
          DAY_NAMES.indexOf(a as (typeof DAY_NAMES)[number]) -
          DAY_NAMES.indexOf(b as (typeof DAY_NAMES)[number]),
      ),
      opens,
      closes,
    };
  });
}

/**
 * Closing days (holidays, vacation) as special opening hours. Google's
 * convention for a closed day is `opens` and `closes` at `00:00`.
 */
export function buildSpecialOpeningHoursSpecification(holidays: HolidayLike[]) {
  return holidays
    .filter((holiday) => holiday.start && holiday.end)
    .map((holiday) => ({
      "@type": "OpeningHoursSpecification",
      validFrom: holiday.start!.slice(0, 10),
      validThrough: holiday.end!.slice(0, 10),
      opens: "00:00",
      closes: "00:00",
    }));
}

function buildAddress(address: SiteInfo["address"]) {
  if (!address?.street && !address?.city) return undefined;
  return compact({
    "@type": "PostalAddress",
    streetAddress: address.street,
    // Nuxt parses a numeric env value into a number; schema.org wants text.
    postalCode: address.postalCode ? String(address.postalCode) : undefined,
    addressLocality: address.city,
    addressCountry: address.country,
  });
}

function buildGeo(geo: SiteInfo["geo"]) {
  const latitude = Number(geo?.latitude || NaN);
  const longitude = Number(geo?.longitude || NaN);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return undefined;
  return { "@type": "GeoCoordinates", latitude, longitude };
}

/**
 * Online ordering as an `OrderAction` on the shop (#401): pickup when the
 * shop has an address, own delivery when delivery areas are configured.
 */
function buildOrderAction(orderUrl: string | undefined, site: SiteInfo) {
  if (!orderUrl) return undefined;
  const deliveryMethod = [
    ...(site.address?.street ? ["https://schema.org/OnSitePickup"] : []),
    ...(site.deliveryAreas?.length
      ? ["http://purl.org/goodrelations/v1#DeliveryModeOwnFleet"]
      : []),
  ];
  return compact({
    "@type": "OrderAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: orderUrl,
      actionPlatform: [
        "https://schema.org/DesktopWebPlatform",
        "https://schema.org/MobileWebPlatform",
      ],
    },
    deliveryMethod,
  });
}

/**
 * The shop as a `Restaurant` (a `LocalBusiness`) with its menu sections.
 * Empty values are left out, so a shop without address or phone still gets a
 * valid node.
 */
export function buildRestaurantSchema(input: {
  site: SiteInfo;
  businessHours?: BusinessHourLike[];
  holidays?: HolidayLike[];
  menuUrl?: string;
  menuSections?: MenuSectionInfo[];
  /** Set only when online ordering is enabled. */
  orderUrl?: string;
  paymentMethods?: string[];
  currency?: string;
}) {
  const { site } = input;
  const openingHours = buildOpeningHoursSpecification(
    input.businessHours ?? [],
  );
  const specialHours = buildSpecialOpeningHoursSpecification(
    input.holidays ?? [],
  );
  const sections = buildMenuSections(input.menuSections ?? []);

  return compact({
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${site.url}#restaurant`,
    name: site.name,
    description: site.description,
    url: site.url,
    image: site.image,
    telephone: site.telephone,
    servesCuisine: site.cuisine,
    priceRange: site.priceRange,
    address: buildAddress(site.address),
    geo: buildGeo(site.geo),
    areaServed: site.deliveryAreas,
    acceptsReservations: site.acceptsReservations,
    paymentAccepted: input.paymentMethods?.join(", "),
    currenciesAccepted: input.currency,
    potentialAction: buildOrderAction(input.orderUrl, site),
    sameAs: site.googleBusinessProfileUrl
      ? [site.googleBusinessProfileUrl]
      : undefined,
    openingHoursSpecification: openingHours.length ? openingHours : undefined,
    specialOpeningHoursSpecification: specialHours.length
      ? specialHours
      : undefined,
    hasMenu:
      input.menuUrl || sections.length
        ? compact({
            "@type": "Menu",
            "@id": `${site.url}#menu`,
            name: "Speisekarte",
            url: input.menuUrl,
            hasMenuSection: sections.length ? sections : undefined,
          })
        : undefined,
  });
}

/** Menu sections with their subsections (category tree of the menu). */
function buildMenuSections(
  sections: MenuSectionInfo[],
): Record<string, unknown>[] {
  return sections.map((section) => {
    const subsections = buildMenuSections(section.sections ?? []);
    return compact({
      "@type": "MenuSection",
      name: section.name,
      url: section.url,
      hasMenuSection: subsections.length ? subsections : undefined,
    });
  });
}

/** A category page as a `MenuSection` with its products as `MenuItem`s. */
export function buildMenuSectionSchema(input: {
  name: string;
  description?: string;
  url?: string;
  image?: string;
  currency: string;
  items: MenuItemInfo[];
  restaurantUrl?: string;
}) {
  return compact({
    "@context": "https://schema.org",
    "@type": "MenuSection",
    name: input.name,
    description: input.description,
    url: input.url,
    image: input.image,
    hasMenuItem: input.items.map((item) =>
      compact({
        "@type": "MenuItem",
        name: item.name,
        description: item.description || item.ingredients?.join(", "),
        image: item.image,
        suitableForDiet: buildSuitableForDiet(item.diets),
        offers:
          item.price !== undefined
            ? {
                "@type": "Offer",
                price: item.price.toFixed(2),
                priceCurrency: input.currency,
              }
            : undefined,
      }),
    ),
    isPartOf: input.restaurantUrl
      ? { "@type": "Menu", "@id": `${input.restaurantUrl}#menu` }
      : undefined,
  });
}

/** Drops `undefined`, empty strings and empty arrays. */
function compact<T extends Record<string, unknown>>(object: T): T {
  return Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) =>
        value !== undefined &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0),
    ),
  ) as T;
}
