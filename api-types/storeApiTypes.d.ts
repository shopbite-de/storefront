/**
 * This file is auto-generated. Do not make direct changes to the file.
 * Instead override it in your shopware.d.ts file.
 *
 * Shopware API version: 6.7.7.1
 *
 */
type GenericRecord =
  | never
  | null
  | string
  | string[]
  | number
  | {
      [key: string]: GenericRecord;
    };
export type components = {
  schemas: Schemas;
  parameters: {
    CompressedCriteria: string;
    CompressedNoneFieldsCriteria: string;
    accept: string;
    contentType: string;
    criteriaAggregations: components["schemas"]["Aggregation"][];
    criteriaAssociations: components["schemas"]["Associations"];
    criteriaExcludes: components["schemas"]["Excludes"];
    criteriaFields: string[];
    criteriaFilter: (
      | components["schemas"]["SimpleFilter"]
      | components["schemas"]["EqualsFilter"]
      | components["schemas"]["MultiNotFilter"]
      | components["schemas"]["RangeFilter"]
    )[];
    criteriaGrouping: string[];
    criteriaIds: string[];
    criteriaIncludes: components["schemas"]["Includes"];
    criteriaLimit: number;
    criteriaPage: number;
    criteriaPostFilter: (
      | components["schemas"]["SimpleFilter"]
      | components["schemas"]["EqualsFilter"]
      | components["schemas"]["MultiNotFilter"]
      | components["schemas"]["RangeFilter"]
    )[];
    criteriaQuery: string;
    criteriaSort: components["schemas"]["Sort"][];
    criteriaTerm: string;
    criteriaTotalCountMode: components["schemas"]["TotalCountMode"];
    noAggregations: string | null;
    onlyAggregations: string | null;
  };
};
export type Schemas = {
  AccountNewsletterRecipient: {
    /** @enum {string} */
    apiAlias: "account_newsletter_recipient";
    /** @enum {string} */
    status: "undefined" | "notSet" | "direct" | "optIn" | "optOut";
  };
  AclRole: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Aggregation:
    | components["schemas"]["AggregationMetrics"]
    | (components["schemas"]["AggregationEntity"] &
        components["schemas"]["SubAggregations"])
    | (components["schemas"]["AggregationFilter"] &
        components["schemas"]["SubAggregations"])
    | (components["schemas"]["AggregationTerms"] &
        components["schemas"]["SubAggregations"])
    | (components["schemas"]["AggregationHistogram"] &
        components["schemas"]["SubAggregations"])
    | (components["schemas"]["AggregationRange"] &
        components["schemas"]["SubAggregations"]);
  AggregationEntity: {
    /** The entity definition e.g "product_manufacturer". */
    definition: string;
    /** The field you want to aggregate over. */
    field: string;
    /** Give your aggregation an identifier, so you can find it easier */
    name: string;
    /**
     * The type of aggregation
     * @enum {string}
     */
    type: "entity";
  };
  AggregationFilter: {
    filter: components["schemas"]["Filters"][];
    /** Give your aggregation an identifier, so you can find it easier */
    name: string;
    /**
     * The type of aggregation
     * @enum {string}
     */
    type: "filter";
  };
  AggregationHistogram: {
    /** The field you want to aggregate over. */
    field: string;
    /** The format of the histogram */
    format?: string;
    /** The interval of the histogram */
    interval?: number;
    /** Give your aggregation an identifier, so you can find it easier */
    name: string;
    /** The timezone of the histogram */
    timeZone?: string;
    /**
     * The type of aggregation
     * @enum {string}
     */
    type: "histogram";
  };
  AggregationMetrics: {
    field: string;
    name: string;
    /** @enum {string} */
    type: "avg" | "count" | "max" | "min" | "stats" | "sum";
  };
  AggregationRange: {
    /** The field you want to aggregate over. */
    field: string;
    /** Give your aggregation an identifier, so you can find it easier */
    name: string;
    /** The ranges of the aggregation */
    ranges: (
      | {
          /** The lower bound of the range */
          from: number;
          /** The upper bound of the range */
          to: number;
        }
      | {
          /** The lower bound of the range */
          from: string;
        }
      | {
          /** The upper bound of the range */
          to: string;
        }
    )[];
    /**
     * The type of aggregation
     * @enum {string}
     */
    type: "range";
  };
  AggregationTerms: {
    /** The field you want to aggregate over. */
    field: string;
    /** The number of terms to return */
    limit?: number;
    /** Give your aggregation an identifier, so you can find it easier */
    name: string;
    /** Sorting the aggregation result. */
    sort?: components["schemas"]["Sort"][];
    /**
     * The type of aggregation
     * @enum {string}
     */
    type: "terms";
  };
  App: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  AppActionButton: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  AppAdministrationSnippet: {
    appId: string;
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    localeId: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    value: string;
  };
  AppCmsBlock: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  AppFlowAction: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  AppFlowEvent: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  AppPaymentMethod: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  AppScriptCondition: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  AppShippingMethod: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  AppTemplate: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Association: {
    [key: string]: components["schemas"]["Association"];
  };
  Associations: {
    [key: string]: components["schemas"]["Criteria"];
  };
  Breadcrumb: {
    /** @enum {string} */
    apiAlias: "breadcrumb";
    categoryId: string;
    name: string;
    path: string;
    seoUrls?: components["schemas"]["SeoUrl"][];
    translated: {
      categoryId: string;
      customFields?: GenericRecord;
      description?: string;
      externalLink?: string;
      internalLink?: string;
      keywords?: string;
      linkNewTab?: boolean;
      /** @enum {string} */
      linkType?: "category" | "external" | "landing_page" | "product";
      metaDescription?: string;
      metaTitle?: string;
      name: string;
      path: string;
      slotConfig?: GenericRecord;
      type: string;
    };
    /** @enum {string} */
    type: "page" | "link" | "folder";
  };
  BreadcrumbCollection: components["schemas"]["Breadcrumb"][];
  BusinessHour: {
    apiAlias?: string;
    closingTime?: string;
    /** Format: date-time */
    createdAt?: string;
    dayOfWeek?: number;
    /** Format: uuid */
    id?: string;
    openingTime?: string;
    /** Format: uuid */
    salesChannelId?: string;
    translated: [];
    /** Format: date-time */
    updatedAt?: string | null;
  };
  BusinessHourStruct: {
    businessHours?: components["schemas"]["BusinessHour"][];
  };
  CalculatedPrice: {
    /** @enum {string} */
    apiAlias: "calculated_price";
    calculatedTaxes: {
      /** @enum {string} */
      apiAlias: "cart_tax_calculated";
      price: number;
      tax: number;
      taxRate: number;
    }[];
    hasRange: boolean;
    listPrice: components["schemas"]["CartListPrice"] | null;
    netPrice: number;
    positionPrice: number;
    quantity: number;
    rawTotal: number;
    referencePrice: components["schemas"]["CartPriceReference"] | null;
    regulationPrice: {
      /** @enum {string} */
      apiAlias?: "cart_regulation_price";
      price?: number;
    } | null;
    /** Currently active tax rules and/or rates */
    taxRules: {
      name?: string;
      /** Format: float */
      taxRate?: number;
    }[];
    /** @enum {string} */
    taxStatus: "net" | "tax-free";
    totalPrice: number;
    unitPrice: number;
    variantId?: string | null;
  };
  Cart: {
    /** An affiliate tracking code */
    affiliateCode?: string | null;
    /** @enum {string} */
    apiAlias: "cart";
    /** A campaign tracking code */
    campaignCode?: string | null;
    /** A comment that can be added to the cart. */
    customerComment?: string | null;
    deliveries?: components["schemas"]["CartDelivery"][];
    /** A list of all cart errors, such as insufficient stocks, invalid addresses or vouchers. */
    errors?:
      | components["schemas"]["CartError"][]
      | {
          [key: string]: {
            code: number;
            key: string;
            level: number;
            message: string;
            messageKey: string;
          };
        };
    /** All items within the cart */
    lineItems?: components["schemas"]["LineItem"][];
    modified?: boolean;
    /** Name of the cart - for example `guest-cart` */
    name?: string;
    price: components["schemas"]["CalculatedPrice"];
    /** Context token identifying the cart and the user session */
    token?: string;
    /** A list of all payment transactions associated with the current cart. */
    transactions?: {
      amount?: components["schemas"]["CalculatedPrice"];
      paymentMethodId?: string;
    }[];
  };
  CartDelivery: {
    deliveryDate?: {
      /** Format: date-time */
      earliest?: string;
      /** Format: date-time */
      latest?: string;
    };
    location?: {
      address?: components["schemas"]["CustomerAddress"];
      /** @enum {string} */
      apiAlias?: "cart_delivery_shipping_location";
      country?: components["schemas"]["Country"];
      state?: components["schemas"]["CountryState"];
    };
    positions?: components["schemas"]["CartDeliveryPosition"][];
    shippingCosts?: components["schemas"]["CalculatedPrice"];
    shippingMethod?: components["schemas"]["ShippingMethod"];
  };
  CartDeliveryInformation: {
    /** @enum {string} */
    apiAlias: "cart_delivery_information";
    deliveryTime?: {
      /** @enum {string} */
      apiAlias?: "cart_delivery_time";
      max?: number;
      min?: number;
      name?: string;
      unit?: string;
    };
    freeDelivery?: boolean;
    height?: number;
    length?: number;
    restockTime?: number;
    stock?: number;
    weight?: number;
    width?: number;
  };
  CartDeliveryPosition: {
    deliveryDate?: {
      /** Format: date-time */
      earliest?: string;
      /** Format: date-time */
      latest?: string;
    };
    identifier?: string;
    lineItem?: components["schemas"]["LineItem"];
    price?: components["schemas"]["CalculatedPrice"];
  };
  CartError: {
    key: string;
    /**
     * * `0` - notice,
     *     * `10` - warning,
     *     * `20` - error
     * @enum {number}
     */
    level: 0 | 10 | 20;
    message: string;
    messageKey: string;
  };
  CartItems: {
    items: components["schemas"]["LineItem"][];
  };
  CartListPrice: {
    /** @enum {string} */
    apiAlias: "cart_list_price";
    discount?: number;
    percentage?: number;
    price?: number;
  };
  CartPriceQuantity: {
    /** @enum {string} */
    apiAlias: "cart_price_quantity";
    isCalculated?: boolean;
    listPrice?: components["schemas"]["CartListPrice"];
    price?: number;
    quantity?: number;
    regulationPrice?: {
      /** Format: float */
      price?: number;
    };
    taxRules?: {
      name?: string;
      /** Format: float */
      taxRate?: number;
    }[];
    type?: string;
  };
  CartPriceReference: {
    /** @enum {string} */
    apiAlias: "cart_price_reference";
    hasRange: boolean;
    listPrice: components["schemas"]["CartListPrice"] | null;
    price?: number;
    purchaseUnit?: number;
    referenceUnit?: number;
    regulationPrice: {
      /** @enum {string} */
      apiAlias?: "cart_regulation_price";
      price?: number;
    } | null;
    unitName: string;
    variantId?: string | null;
  };
  Category: {
    /** When boolean value is `true`, the category is listed for selection. */
    active?: boolean;
    /** Unique identity of the category under which the new category is to be created. */
    afterCategoryId?: string;
    afterCategoryVersionId?: string;
    /** @enum {string} */
    apiAlias: "category";
    readonly breadcrumb: string[];
    /** Format: int64 */
    readonly childCount: number;
    /** Child categories within this category for hierarchical navigation */
    children: components["schemas"]["Category"][];
    /** CMS page layout for the category */
    cmsPage?: components["schemas"]["CmsPage"];
    /** Unique identity of CMS page. */
    cmsPageId?: string;
    /** Runtime field, cannot be used as part of the criteria. */
    cmsPageIdSwitched?: boolean;
    cmsPageVersionId?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    customEntityTypeId?: string;
    customFields?: GenericRecord;
    description?: string;
    /** Shows nested categories on a product category page. */
    displayNestedProducts?: boolean;
    externalLink?: string;
    id: string;
    internalLink?: string;
    keywords?: string;
    /**
     * Format: int64
     * An integer value that denotes the level of nesting of a particular category located in an hierarchical category tree.
     */
    readonly level?: number;
    linkNewTab?: boolean;
    linkType?: string;
    /** Category image or banner */
    media?: components["schemas"]["Media"];
    /** Unique identity of media added to identify category. */
    mediaId?: string;
    metaDescription?: string;
    metaTitle?: string;
    name: string;
    /** Unique identity of category. */
    parent?: components["schemas"]["Category"];
    parentId?: string;
    parentVersionId?: string;
    /** A relative URL to the category. */
    readonly path?: string;
    /** Type of product assignment: Dynamic product group as or `product_stream` or Manual assignment as `product`. */
    productAssignmentType?: string;
    /** Runtime field, cannot be used as part of the criteria. */
    seoUrl?: string;
    /** SEO-friendly URLs for the category across different sales channels */
    seoUrls?: components["schemas"]["SeoUrl"][];
    /** Tags for organizing and filtering categories */
    tags?: components["schemas"]["Tag"][];
    translated: {
      afterCategoryId: string;
      afterCategoryVersionId: string;
      breadcrumb: string[];
      cmsPageId: string;
      cmsPageVersionId: string;
      customEntityTypeId: string;
      description: string;
      externalLink: string;
      internalLink: string;
      keywords: string;
      linkType: string;
      mediaId: string;
      metaDescription: string;
      metaTitle: string;
      name: string;
      parentId: string;
      parentVersionId: string;
      path: string;
      productAssignmentType: string;
      seoUrl: string;
      type: string;
      versionId: string;
    };
    /**
     * Type of categories like `page`, `folder`, `link`.
     * @enum {string}
     */
    type: "page" | "link";
    /** Format: date-time */
    readonly updatedAt?: string;
    versionId?: string;
    /** Displays categories on category page when true. */
    visible?: boolean;
    /**
     * Format: int64
     * Runtime field, cannot be used as part of the criteria.
     */
    visibleChildCount?: number;
  };
  CategoryJsonApi: components["schemas"]["resource"] & {
    /** When boolean value is `true`, the category is listed for selection. */
    active?: boolean;
    /** Unique identity of the category under which the new category is to be created. */
    afterCategoryId?: string;
    afterCategoryVersionId?: string;
    readonly breadcrumb?: GenericRecord[];
    /** Format: int64 */
    readonly childCount?: number;
    /** Unique identity of CMS page. */
    cmsPageId?: string;
    /** Runtime field, cannot be used as part of the criteria. */
    cmsPageIdSwitched?: boolean;
    cmsPageVersionId?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    customEntityTypeId?: string;
    customFields?: GenericRecord;
    description?: string;
    /** Shows nested categories on a product category page. */
    displayNestedProducts?: boolean;
    externalLink?: string;
    id: string;
    internalLink?: string;
    keywords?: string;
    /**
     * Format: int64
     * An integer value that denotes the level of nesting of a particular category located in an hierarchical category tree.
     */
    readonly level?: number;
    linkNewTab?: boolean;
    linkType?: string;
    /** Unique identity of media added to identify category. */
    mediaId?: string;
    metaDescription?: string;
    metaTitle?: string;
    name: string;
    parentId?: string;
    parentVersionId?: string;
    /** A relative URL to the category. */
    readonly path?: string;
    /** Type of product assignment: Dynamic product group as or `product_stream` or Manual assignment as `product`. */
    productAssignmentType?: string;
    relationships?: {
      /** Child categories within this category for hierarchical navigation */
      children?: {
        data?: {
          /** @example 268184c12df027f536154d099d497b31 */
          id?: string;
          /** @example category */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /category/3adbdb3ac060038aa0e6e6c138ef9873/children
           */
          related?: string;
        };
      };
      /** CMS page layout for the category */
      cmsPage?: {
        data?: {
          /** @example 7b1460918b1abb93311108f3dc021c9b */
          id?: string;
          /** @example cms_page */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /category/3adbdb3ac060038aa0e6e6c138ef9873/cmsPage
           */
          related?: string;
        };
      };
      /** Category image or banner */
      media?: {
        data?: {
          /** @example 62933a2951ef01f4eafd9bdf4d3cd2f0 */
          id?: string;
          /** @example media */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /category/3adbdb3ac060038aa0e6e6c138ef9873/media
           */
          related?: string;
        };
      };
      /** Unique identity of category. */
      parent?: {
        data?: {
          /** @example d0e45878043844ffc41aac437e86b602 */
          id?: string;
          /** @example category */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /category/3adbdb3ac060038aa0e6e6c138ef9873/parent
           */
          related?: string;
        };
      };
      /** SEO-friendly URLs for the category across different sales channels */
      seoUrls?: {
        data?: {
          /** @example 5321b5a71127b8b98cdd4b068ad56c4c */
          id?: string;
          /** @example seo_url */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /category/3adbdb3ac060038aa0e6e6c138ef9873/seoUrls
           */
          related?: string;
        };
      };
      /** Tags for organizing and filtering categories */
      tags?: {
        data?: {
          /** @example d57ac45256849d9b13e2422d91580fb9 */
          id?: string;
          /** @example tag */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /category/3adbdb3ac060038aa0e6e6c138ef9873/tags
           */
          related?: string;
        };
      };
    };
    /** Runtime field, cannot be used as part of the criteria. */
    seoUrl?: string;
    translated: {
      afterCategoryId: string;
      afterCategoryVersionId: string;
      cmsPageId: string;
      cmsPageVersionId: string;
      customEntityTypeId: string;
      description: string;
      externalLink: string;
      internalLink: string;
      keywords: string;
      linkType: string;
      mediaId: string;
      metaDescription: string;
      metaTitle: string;
      name: string;
      parentId: string;
      parentVersionId: string;
      path: string;
      productAssignmentType: string;
      seoUrl: string;
      type: string;
      versionId: string;
    };
    /** Type of categories like `page`, `folder`, `link`. */
    type?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    versionId?: string;
    /** Displays categories on category page when true. */
    visible?: boolean;
    /**
     * Format: int64
     * Runtime field, cannot be used as part of the criteria.
     */
    visibleChildCount?: number;
  };
  CmsBlock: {
    /** @enum {string} */
    apiAlias: "cms_block";
    /** Defines the background color of an element. */
    backgroundColor?: string;
    backgroundMedia?: components["schemas"]["Media"];
    /** Unique identity of background media. */
    backgroundMediaId?: string;
    /** Background media mode accept values `cover`, `auto`, `contain`. */
    backgroundMediaMode?: string;
    cmsSectionVersionId?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    /** One or more CSS classes added and separated by spaces. */
    cssClass?: string;
    customFields?: GenericRecord;
    id: string;
    /** Defines for the margin area on the bottom of an element. */
    marginBottom?: string;
    /** Defines for the margin area on the left of an element. */
    marginLeft?: string;
    /** Defines the margin area on the right of an element. */
    marginRight?: string;
    /** Defines the margin area on the top of an element. */
    marginTop?: string;
    /** Unique name of the CMS Block. */
    name?: string;
    /**
     * Format: int64
     * Order of the block indicated by number like 0, 1, 2,...
     */
    position: number;
    /** Unique identity of section. */
    sectionId: string;
    /** Position of the section. It can either be `main` or `sidebar`. */
    sectionPosition?: string;
    slots: components["schemas"]["CmsSlot"][];
    /** Type of block can be 'image`, `text`, 'product-listing`, `image-two-column`, etc. */
    type: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    versionId?: string;
    visibility?: {
      desktop?: boolean;
      mobile?: boolean;
      tablet?: boolean;
    };
  };
  CmsPage: {
    /** @enum {string} */
    apiAlias: "cms_page";
    config?: {
      backgroundColor?: string;
    };
    /** Format: date-time */
    readonly createdAt?: string;
    /** One or more CSS classes added and separated by spaces. */
    cssClass?: string;
    customFields?: GenericRecord;
    /** This field will be implemented in the future. */
    entity?: string;
    id: string;
    /** Landing pages using this CMS layout */
    landingPages?: components["schemas"]["LandingPage"][];
    name?: string;
    /** Preview image for the CMS page in admin panel and page selection */
    previewMedia?: components["schemas"]["Media"];
    /** Unique identity of media to be previewed. */
    previewMediaId?: string;
    /** Content sections within the CMS page (layout blocks containing slots) */
    sections: components["schemas"]["CmsSection"][];
    translated: {
      cssClass: string;
      entity: string;
      name: string;
      previewMediaId: string;
      type: string;
      versionId: string;
    };
    /** CMS page types can be `landingpage`, `page`, `product_list`, `product_detail`. */
    type: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    versionId?: string;
  };
  CmsSection: {
    /** @enum {string} */
    apiAlias: "cms_section";
    /** Background color of CMS page. */
    backgroundColor?: string;
    backgroundMedia?: components["schemas"]["Media"];
    /** Unique identity of CMS section's background media. */
    backgroundMediaId?: string;
    /** Background media mode can be `cover`, `auto` or `contain`. */
    backgroundMediaMode?: string;
    blocks: components["schemas"]["CmsBlock"][];
    cmsPageVersionId?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    /** One or more CSS classes added and separated by spaces. */
    cssClass?: string;
    customFields?: GenericRecord;
    id: string;
    /** Hides the sidebar on mobile viewports. It can hold values such as 'mobile', 'wrap', any other string or be unset. */
    mobileBehavior?: string;
    /** Name of the CMS section defined. */
    name?: string;
    page?: components["schemas"]["CmsPage"];
    /** Unique identity of page where CMS section is defined. */
    pageId: string;
    /**
     * Format: int64
     * Position of occurrence of each section denoted by numerical values 0, 1, 2...
     */
    position: number;
    /** Sizing mode can be `boxed` or `full_width`. */
    sizingMode?: string;
    /**
     * Types of sections can be `sidebar` or `fullwidth`.
     * @enum {string}
     */
    type: "default" | "sidebar";
    /** Format: date-time */
    readonly updatedAt?: string;
    visibility?: {
      desktop?: boolean;
      mobile?: boolean;
      tablet?: boolean;
    };
  };
  CmsSlot: {
    /** @enum {string} */
    apiAlias: "cms_slot";
    block?: components["schemas"]["CmsBlock"];
    /** Unique identity of CMS block where slot is defined. */
    blockId: string;
    cmsBlockVersionId?: string;
    config?: GenericRecord;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    readonly data?: GenericRecord;
    fieldConfig?: GenericRecord;
    id: string;
    locked?: boolean;
    /** Key-value pair to configure which element to be shown in which slot. */
    slot: string;
    translated: {
      blockId: string;
      cmsBlockVersionId: string;
      slot: string;
      type: string;
      versionId: string;
    };
    /** It indicates the types of content that can be defined within the slot which includes `image`, `text`, `form`, `product-listing`, `category-navigation`, `product-box`, `buy-box`, `sidebar-filter`, etc. */
    type: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    versionId?: string;
  };
  ContextMeasurementSystemInfo: {
    /**
     * The measurement system used in the store. 'metric' for metric system, 'imperial' for imperial system.
     * @default metric
     * @enum {string}
     */
    system?: "metric" | "imperial";
    /** Units used in the measurement system. */
    units?: {
      /**
       * Unit of length.
       * @default mm
       * @enum {string}
       */
      length?: "mm" | "cm" | "m" | "in" | "ft";
      /**
       * Unit of weight.
       * @default kg
       * @enum {string}
       */
      weight?: "g" | "kg" | "oz" | "lb";
    };
  };
  CookieEntry: {
    /** @enum {string} */
    apiAlias: "cookie_entry";
    cookie: string;
    description?: string;
    expiration?: number;
    hidden: boolean;
    name?: string;
    value?: string;
  };
  CookieEntryCollection: components["schemas"]["CookieEntry"][];
  CookieGroup: {
    /** @enum {string} */
    apiAlias: "cookie_group";
    cookie?: string;
    description?: string;
    entries?: components["schemas"]["CookieEntryCollection"];
    expiration?: number;
    isRequired: boolean;
    name: string;
    value?: string;
  };
  CookieGroupCollection: components["schemas"]["CookieGroup"][];
  CookieRouteResponse: {
    /** @enum {string} */
    apiAlias: "cookie_groups_hash";
    /** Collection of cookie groups */
    elements: components["schemas"]["CookieGroup"][];
    /**
     * Hash of the current cookie configuration. Can be used to detect changes in cookie configuration.
     * @example f86b6a872cb83dbd22d838ceda1aa3d4
     */
    hash: string;
    /**
     * Format: uuid
     * The language ID for which the cookie configuration was generated. Used to store hashes per language.
     * @example 2fbb5fe2e29a4d70aa5854ce7ce3e20b
     */
    languageId: string;
  };
  Country: {
    /** When boolean value is `true`, the country is available for selection in the storefront. */
    active?: boolean;
    addressFormat: GenericRecord;
    /** Wildcard formatted zip codes to allow easy searching in the frontend based on initial constants, for example - 24****, 1856**. */
    advancedPostalCodePattern?: string;
    /** Verify for advanced postal code pattern. */
    checkAdvancedPostalCodePattern?: boolean;
    /** Verify for valid postal code pattern. */
    checkPostalCodePattern?: boolean;
    /** Verify if VAT ID is valid or not. */
    checkVatIdPattern?: boolean;
    companyTax?: {
      /** Format: float */
      amount: number;
      currencyId: string;
      enabled: boolean;
    };
    /** Format: date-time */
    readonly createdAt?: string;
    customerTax?: {
      /** Format: float */
      amount: number;
      currencyId: string;
      enabled: boolean;
    };
    customFields?: GenericRecord;
    /** Default pattern of postal or zip code. */
    defaultPostalCodePattern?: string;
    /** The country's state is displayed in the address when boolean value is `true`. */
    displayStateInRegistration?: boolean;
    /** State details in the address are force included when boolean value is `true`. */
    forceStateInRegistration?: boolean;
    id: string;
    isEu?: boolean;
    /** Internationally recognized two-letter country codes. For example, DE, IN, NO, etc. */
    iso?: string;
    /** Internationally recognized three-letter country codes. For example, DEU, IND, NOR, etc. */
    iso3?: string;
    name: string;
    /**
     * Format: int64
     * Numerical value that indicates the order in which the defined countries must be displayed in the frontend.
     */
    position?: number;
    /** The postal code is made mandatory specification in the address, when boolean value is `true`. */
    postalCodeRequired?: boolean;
    /** The shipping availability for a country is enabled when boolean value is `true`. */
    shippingAvailable?: boolean;
    /** States/provinces/regions within the country */
    states?: components["schemas"]["CountryState"][];
    translated: {
      advancedPostalCodePattern: string;
      defaultPostalCodePattern: string;
      iso: string;
      iso3: string;
      name: string;
      vatIdPattern: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
    /** Unique VAT ID with country code and numbers, for example - GB999 9999 */
    vatIdPattern?: string;
    /** Set to true, if VAT ID is to be made mandatory. */
    vatIdRequired?: boolean;
  };
  CountryJsonApi: components["schemas"]["resource"] & {
    /** When boolean value is `true`, the country is available for selection in the storefront. */
    active?: boolean;
    addressFormat: GenericRecord;
    /** Wildcard formatted zip codes to allow easy searching in the frontend based on initial constants, for example - 24****, 1856**. */
    advancedPostalCodePattern?: string;
    /** Verify for advanced postal code pattern. */
    checkAdvancedPostalCodePattern?: boolean;
    /** Verify for valid postal code pattern. */
    checkPostalCodePattern?: boolean;
    /** Verify if VAT ID is valid or not. */
    checkVatIdPattern?: boolean;
    companyTax?: {
      /** Format: float */
      amount: number;
      currencyId: string;
      enabled: boolean;
    };
    /** Format: date-time */
    readonly createdAt?: string;
    customerTax?: {
      /** Format: float */
      amount: number;
      currencyId: string;
      enabled: boolean;
    };
    customFields?: GenericRecord;
    /** Default pattern of postal or zip code. */
    defaultPostalCodePattern?: string;
    /** The country's state is displayed in the address when boolean value is `true`. */
    displayStateInRegistration?: boolean;
    /** State details in the address are force included when boolean value is `true`. */
    forceStateInRegistration?: boolean;
    id: string;
    isEu?: boolean;
    /** Internationally recognized two-letter country codes. For example, DE, IN, NO, etc. */
    iso?: string;
    /** Internationally recognized three-letter country codes. For example, DEU, IND, NOR, etc. */
    iso3?: string;
    name: string;
    /**
     * Format: int64
     * Numerical value that indicates the order in which the defined countries must be displayed in the frontend.
     */
    position?: number;
    /** The postal code is made mandatory specification in the address, when boolean value is `true`. */
    postalCodeRequired?: boolean;
    relationships?: {
      /** States/provinces/regions within the country */
      states?: {
        data?: {
          /** @example 34d955a0df5f7af9c9b4e4dccb3c3564 */
          id?: string;
          /** @example country_state */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /country/59716c97497eb9694541f7c3d37b1a4d/states
           */
          related?: string;
        };
      };
    };
    /** The shipping availability for a country is enabled when boolean value is `true`. */
    shippingAvailable?: boolean;
    translated: {
      advancedPostalCodePattern: string;
      defaultPostalCodePattern: string;
      iso: string;
      iso3: string;
      name: string;
      vatIdPattern: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
    /** Unique VAT ID with country code and numbers, for example - GB999 9999 */
    vatIdPattern?: string;
    /** Set to true, if VAT ID is to be made mandatory. */
    vatIdRequired?: boolean;
  };
  CountryState: {
    /** When boolean value is `true`, the country's state is available for selection in the storefront. */
    active?: boolean;
    /** Unique identity of the country. */
    countryId: string;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    name: string;
    /**
     * Format: int64
     * Numerical value that indicates the order in which the defined states must be displayed in the frontend.
     */
    position?: number;
    /** An abbreviation for the country's state. */
    shortCode: string;
    translated: {
      countryId: string;
      name: string;
      shortCode: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  CountryStateJsonApi: components["schemas"]["resource"] & {
    /** When boolean value is `true`, the country's state is available for selection in the storefront. */
    active?: boolean;
    /** Unique identity of the country. */
    countryId: string;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    name: string;
    /**
     * Format: int64
     * Numerical value that indicates the order in which the defined states must be displayed in the frontend.
     */
    position?: number;
    /** An abbreviation for the country's state. */
    shortCode: string;
    translated: {
      countryId: string;
      name: string;
      shortCode: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Criteria: {
    aggregations?: components["schemas"]["Aggregation"][];
    associations?: components["schemas"]["Associations"];
    excludes?: components["schemas"]["Excludes"];
    /** Fields which should be returned in the search result. */
    fields?: string[];
    /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
    filter?: (
      | components["schemas"]["SimpleFilter"]
      | components["schemas"]["EqualsFilter"]
      | components["schemas"]["MultiNotFilter"]
      | components["schemas"]["RangeFilter"]
    )[];
    /** Perform groupings over certain fields */
    grouping?: string[];
    /** List of ids to search for */
    ids?: string[];
    includes?: components["schemas"]["Includes"];
    /** Number of items per result page */
    limit?: number;
    /** Search result page */
    page?: number;
    /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
    "post-filter"?: (
      | components["schemas"]["SimpleFilter"]
      | components["schemas"]["EqualsFilter"]
      | components["schemas"]["MultiNotFilter"]
      | components["schemas"]["RangeFilter"]
    )[];
    /** The query string to search for */
    query?: string;
    /** Sorting in the search result. */
    sort?: components["schemas"]["Sort"][];
    /** Search term */
    term?: string;
    "total-count-mode"?: components["schemas"]["TotalCountMode"];
  };
  CrossSellingElement: {
    /** @enum {string} */
    apiAlias: "cross_selling_element";
    crossSelling: components["schemas"]["ProductCrossSelling"];
    products: components["schemas"]["Product"][];
    /** Format: uuid */
    streamId?: string;
    /** Format: int32 */
    total: number;
  };
  CrossSellingElementCollection: components["schemas"]["CrossSellingElement"][];
  Currency: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /**
     * Format: float
     * Currency exchange rate.
     */
    factor: number;
    id: string;
    /** Standard international three digit code to represent currency. For example, USD. */
    isoCode: string;
    /** Runtime field, cannot be used as part of the criteria. */
    isSystemDefault?: boolean;
    itemRounding: {
      /** Format: int64 */
      decimals: number;
      /** Format: float */
      interval: number;
      roundForNet: boolean;
    };
    name: string;
    /**
     * Format: int64
     * The order of the tabs for multiple currencies defined.
     */
    position?: number;
    shortName: string;
    /** A currency symbol is a graphical representation used as shorthand for a currency's name, for example US Dollar - $ */
    symbol: string;
    /**
     * Format: float
     * The value from which the tax must be exempted.
     */
    taxFreeFrom?: number;
    totalRounding: {
      /** Format: int64 */
      decimals: number;
      /** Format: float */
      interval: number;
      roundForNet: boolean;
    };
    translated: {
      isoCode: string;
      name: string;
      shortName: string;
      symbol: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  CurrencyCountryRounding: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  CurrencyJsonApi: components["schemas"]["resource"] & {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /**
     * Format: float
     * Currency exchange rate.
     */
    factor: number;
    id: string;
    /** Standard international three digit code to represent currency. For example, USD. */
    isoCode: string;
    /** Runtime field, cannot be used as part of the criteria. */
    isSystemDefault?: boolean;
    itemRounding: {
      /** Format: int64 */
      decimals: number;
      /** Format: float */
      interval: number;
      roundForNet: boolean;
    };
    name: string;
    /**
     * Format: int64
     * The order of the tabs for multiple currencies defined.
     */
    position?: number;
    shortName: string;
    /** A currency symbol is a graphical representation used as shorthand for a currency's name, for example US Dollar - $ */
    symbol: string;
    /**
     * Format: float
     * The value from which the tax must be exempted.
     */
    taxFreeFrom?: number;
    totalRounding: {
      /** Format: int64 */
      decimals: number;
      /** Format: float */
      interval: number;
      roundForNet: boolean;
    };
    translated: {
      isoCode: string;
      name: string;
      shortName: string;
      symbol: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  CustomEntity: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  CustomField: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  CustomFieldSet: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  CustomFieldSetRelation: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Customer: {
    /** To keep the status of the customer active, the boolean value is set to `true`. */
    active?: boolean;
    /** Currently active billing address in the session */
    activeBillingAddress: components["schemas"]["CustomerAddress"];
    /** Currently active shipping address in the session */
    activeShippingAddress: components["schemas"]["CustomerAddress"];
    /** All addresses saved for the customer */
    addresses?: components["schemas"]["CustomerAddress"][];
    /** An affiliate code is an identification option with which website operators can mark outgoing links. */
    affiliateCode?: string;
    /** @enum {string} */
    apiAlias: "customer";
    /** To capture customer's birthday details. */
    birthday?: string;
    /** A campaign code is the globally unique identifier for a campaign. */
    campaignCode?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    createdById?: string;
    /** Unique  number assigned to identity a customer. */
    customerNumber: string;
    customFields?: GenericRecord;
    /** Default billing address for the customer */
    defaultBillingAddress?: components["schemas"]["CustomerAddress"];
    /** Unique identity of default billing address. */
    defaultBillingAddressId: string;
    /** Default shipping address for the customer */
    defaultShippingAddress?: components["schemas"]["CustomerAddress"];
    /** Unique identity of default shipping address. */
    defaultShippingAddressId: string;
    /**
     * Format: date-time
     * Date and time when the double opt-in email was confirmed.
     */
    doubleOptInConfirmDate?: string;
    /**
     * Format: date-time
     * Date and time when the double opt-in email was sent.
     */
    doubleOptInEmailSentDate?: string;
    /** Set to `true` to allow user subscriptions to an email marketing list. */
    doubleOptInRegistration?: boolean;
    /** Email ID of the customer. */
    email: string;
    /**
     * Format: date-time
     * To capture date and time of customer's first login.
     */
    firstLogin?: string;
    /** First name of the customer. */
    firstName: string;
    /** Customer group determining pricing and permissions */
    group?: components["schemas"]["CustomerGroup"];
    /** Unique identity of customer group. */
    groupId: string;
    /** Boolean value is `true` if it is to be a guest account. */
    guest?: boolean;
    /** Password hash for customer recovery. */
    hash?: string;
    id: string;
    /** Preferred language for customer communication */
    language?: components["schemas"]["Language"];
    /** Unique identity of language. */
    languageId: string;
    /**
     * Format: date-time
     * To capture date and time of customer's last login.
     */
    lastLogin?: string;
    /** Last name of the customer. */
    lastName: string;
    /**
     * Format: date-time
     * Captures last order date.
     */
    readonly lastOrderDate?: string;
    /** Last used payment method by the customer */
    lastPaymentMethod?: components["schemas"]["PaymentMethod"];
    /** Unique identity of previous payment method. */
    lastPaymentMethodId?: string;
    /**
     * Format: int64
     * Captures the number of orders placed.
     */
    readonly orderCount?: number;
    /**
     * Format: float
     * Sum of total amount to be paid.
     */
    readonly orderTotalAmount?: number;
    /**
     * Format: int64
     * Number of reviews the customer has given.
     */
    readonly reviewCount?: number;
    /** Unique identity of sales channel. */
    salesChannelId: string;
    /** Customer salutation (e.g., Mr., Mrs., Ms.) */
    salutation?: components["schemas"]["Salutation"];
    /** Unique identity of salutation. */
    salutationId?: string;
    readonly tagIds?: string[];
    /** Tags assigned to the customer for organization and segmentation */
    tags?: components["schemas"]["Tag"][];
    /** Titles or honorifics like Mr, Mrs, etc. */
    title?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    updatedById?: string;
  } & (
    | {
        /** @enum {string} */
        accountType: "private";
      }
    | {
        /** @enum {string} */
        accountType: "business";
        company: string;
        vatIds: [string, ...string[]];
      }
  );
  CustomerAddress: {
    /** Additional customer's address information. */
    additionalAddressLine1?: string;
    /** Additional customer's address information. */
    additionalAddressLine2?: string;
    /** Name of customer's city. */
    city: string;
    /** Name of customer's company. */
    company?: string;
    country?: components["schemas"]["Country"];
    /** Unique identity of country. */
    countryId: string;
    countryState?: components["schemas"]["CountryState"];
    /** Unique identity of country's state. */
    countryStateId?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    /** Unique identity of customer. */
    customerId: string;
    customFields?: GenericRecord;
    /** Name of customer's department. */
    department?: string;
    /** First name of the customer. */
    firstName: string;
    /** Runtime field, cannot be used as part of the criteria. */
    hash?: string;
    id: string;
    /** Added since version: 6.7.7.0. Runtime field, cannot be used as part of the criteria. */
    isDefaultBillingAddress?: boolean;
    /** Added since version: 6.7.7.0. Runtime field, cannot be used as part of the criteria. */
    isDefaultShippingAddress?: boolean;
    /** Last name of the customer. */
    lastName: string;
    /** Customer's phone number. */
    phoneNumber?: string;
    salutation?: components["schemas"]["Salutation"];
    /** Unique identity of salutation. */
    salutationId?: string;
    /** Name of customer's street. */
    street: string;
    /** Titles given to customer like Dr. , Prof., etc */
    title?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    /** Postal or zip code of customer's address. */
    zipcode?: string;
  };
  CustomerAddressBody: {
    additionalAddressLine1?: string;
    additionalAddressLine2?: string;
    city: string;
    company?: string;
    country?: components["schemas"]["Country"];
    countryId: string;
    countryState?: components["schemas"]["CountryState"];
    countryStateId?: string;
    customFields?: GenericRecord;
    department?: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    salutation?: components["schemas"]["Salutation"];
    salutationId?: string;
    street: string;
    title?: string;
    zipcode?: string;
  };
  CustomerAddressJsonApi: components["schemas"]["resource"] & {
    /** Additional customer's address information. */
    additionalAddressLine1?: string;
    /** Additional customer's address information. */
    additionalAddressLine2?: string;
    /** Name of customer's city. */
    city: string;
    /** Name of customer's company. */
    company?: string;
    /** Unique identity of country. */
    countryId: string;
    /** Unique identity of country's state. */
    countryStateId?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    /** Unique identity of customer. */
    customerId: string;
    customFields?: GenericRecord;
    /** Name of customer's department. */
    department?: string;
    /** First name of the customer. */
    firstName: string;
    /** Runtime field, cannot be used as part of the criteria. */
    hash?: string;
    id: string;
    /** Added since version: 6.7.7.0. Runtime field, cannot be used as part of the criteria. */
    isDefaultBillingAddress?: boolean;
    /** Added since version: 6.7.7.0. Runtime field, cannot be used as part of the criteria. */
    isDefaultShippingAddress?: boolean;
    /** Last name of the customer. */
    lastName: string;
    /** Customer's phone number. */
    phoneNumber?: string;
    relationships?: {
      country?: {
        data?: {
          /** @example e909c2d7067ea37437cf97fe11d91bd0 */
          id?: string;
          /** @example country */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /customer-address/1b4b031005f93d02d887e7d66efb653b/country
           */
          related?: string;
        };
      };
      countryState?: {
        data?: {
          /** @example cb6a9764567191fb74fe28d8d6a4819d */
          id?: string;
          /** @example country_state */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /customer-address/1b4b031005f93d02d887e7d66efb653b/countryState
           */
          related?: string;
        };
      };
      salutation?: {
        data?: {
          /** @example 7a6efb02514153b5aa9a8f40c6f8bcc3 */
          id?: string;
          /** @example salutation */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /customer-address/1b4b031005f93d02d887e7d66efb653b/salutation
           */
          related?: string;
        };
      };
    };
    /** Unique identity of salutation. */
    salutationId?: string;
    /** Name of customer's street. */
    street: string;
    /** Titles given to customer like Dr. , Prof., etc */
    title?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    /** Postal or zip code of customer's address. */
    zipcode?: string;
  };
  CustomerAddressRead: {
    country: components["schemas"]["Country"];
    countryState?: components["schemas"]["CountryState"] | null;
    /** Format: date-time */
    createdAt: string;
    readonly customerId: string;
    readonly id?: string;
    salutation: components["schemas"]["Salutation"];
    updatedAt: string | null;
  };
  CustomerGroup: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /** If boolean value is `true` gross value is displayed else, net value will be displayed to the customer. */
    displayGross?: boolean;
    id: string;
    name: string;
    /** To enable the registration of partner customer group. */
    registrationActive?: boolean;
    registrationIntroduction?: string;
    registrationOnlyCompanyRegistration?: boolean;
    registrationSeoMetaDescription?: string;
    registrationTitle?: string;
    translated: {
      name: string;
      registrationIntroduction: string;
      registrationSeoMetaDescription: string;
      registrationTitle: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  CustomerRecovery: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  CustomerTag: {
    customerId: string;
    id?: string;
    tag?: components["schemas"]["Tag"];
    tagId: string;
  };
  CustomerWishlist: {
    /** Format: date-time */
    readonly createdAt?: string;
    /** Unique identity of the customer. */
    customerId: string;
    customFields?: GenericRecord;
    id: string;
    products?: components["schemas"]["CustomerWishlistProduct"][];
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  CustomerWishlistProduct: {
    /** Format: date-time */
    readonly createdAt?: string;
    id: string;
    /** Unique identity of the product. */
    productId: string;
    productVersionId?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  DeliveryTime: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    /**
     * Format: int64
     * Maximum delivery time taken.
     */
    max: number;
    /**
     * Format: int64
     * Minimum delivery time taken.
     */
    min: number;
    name: string;
    translated: {
      name: string;
      unit: string;
    };
    /** Unit in which the delivery time is defined. For example, days or hours. */
    unit: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Document: {
    config: {
      name: string;
      title: string;
    };
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    deepLinkCode: string;
    dependentDocuments?: components["schemas"]["Document"][];
    documentA11yMediaFile?: components["schemas"]["Media"];
    documentA11yMediaFileId?: string;
    documentMediaFile?: components["schemas"]["Media"];
    documentMediaFileId?: string;
    documentNumber?: string;
    documentType?: components["schemas"]["DocumentType"];
    documentTypeId: string;
    fileType?: string;
    id: string;
    order?: components["schemas"]["Order"];
    orderId: string;
    orderVersionId?: string;
    referencedDocument?: components["schemas"]["Document"];
    referencedDocumentId?: string;
    sent?: boolean;
    static?: boolean;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  DocumentBaseConfig: {
    config?: GenericRecord;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /** Unique number associated with every document. */
    documentNumber?: string;
    /** Unique identity of the document type. */
    documentTypeId: string;
    /** A prefix name added to the file name separated by an underscore. */
    filenamePrefix?: string;
    /** A suffix name added to the file name separated by an underscore. */
    filenameSuffix?: string;
    /** When set to `true`, the document can be used across all sales channels. */
    global?: boolean;
    id: string;
    /** Logo in the document at the top-right corner. */
    logo?: components["schemas"]["Media"];
    /** Unique identity of the company logo. */
    logoId?: string;
    /** Name of the document. */
    name: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  DocumentBaseConfigSalesChannel: {
    /** Format: date-time */
    readonly createdAt?: string;
    /** Unique identity of document's base config. */
    documentBaseConfigId: string;
    /** Unique identity of document type. */
    documentTypeId?: string;
    id: string;
    /** Unique identity of sales channel. */
    salesChannelId?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  DocumentType: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    name: string;
    /** Technical name of document type. */
    technicalName: string;
    translated: {
      name: string;
      technicalName: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Domain: {
    apiAlias?: string;
    /** Format: date-time */
    createdAt?: string;
    /** Format: uuid */
    currencyId?: string;
    /** Format: uuid */
    id?: string;
    /** Format: uuid */
    languageId?: string;
    /** Format: uuid */
    snippetSetId?: string | null;
    translated: [];
    /** Format: date-time */
    updatedAt?: string | null;
    url?: string;
  };
  EntitySearchResult: {
    /** Contains aggregated data. A simple example is the determination of the average price from a product search query. */
    aggregations?: GenericRecord[];
    entity?: string;
    /** The actual limit. This is used for pagination and goes together with the page. */
    limit?: number;
    /** The actual page. This can be used for pagination. */
    page?: number;
    /** The total number of found entities */
    total?: number;
  };
  EqualsFilter: {
    field: string;
    /** @enum {string} */
    type: "equals";
    value: string | number | boolean | null;
  };
  Excludes: {
    [key: string]: string[];
  };
  Filters: (
    | components["schemas"]["SimpleFilter"]
    | components["schemas"]["EqualsFilter"]
    | components["schemas"]["MultiNotFilter"]
    | components["schemas"]["RangeFilter"]
  )[];
  FindProductVariantRouteResponse: {
    foundCombination?: {
      options?: string[];
      variantId?: string;
    };
  };
  Flow: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  FlowSequence: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  FlowTemplate: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Holiday: {
    apiAlias?: string;
    /** Format: date-time */
    createdAt?: string;
    /** Format: date-time */
    end?: string;
    /** Format: uuid */
    id?: string;
    /** Format: uuid */
    salesChannelId?: string;
    /** Format: date-time */
    start?: string;
    translated: [];
    /** Format: date-time */
    updatedAt?: string | null;
  };
  HolidayStruct: {
    holidays?: components["schemas"]["Holiday"][];
  };
  ImportExportFile: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ImportExportLog: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ImportExportProfile: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Includes: {
    [key: string]: string[];
  };
  Integration: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  LandingPage: {
    active?: boolean;
    /** @enum {string} */
    apiAlias: "landing_page";
    /** CMS page layout for the landing page */
    cmsPage?: components["schemas"]["CmsPage"];
    cmsPageId?: string;
    cmsPageVersionId?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    keywords?: string;
    metaDescription?: string;
    metaTitle?: string;
    name: string;
    /** SEO-friendly URLs for the landing page across different sales channels */
    seoUrls?: components["schemas"]["SeoUrl"][];
    slotConfig?: GenericRecord;
    translated: {
      cmsPageId: string;
      cmsPageVersionId: string;
      keywords: string;
      metaDescription: string;
      metaTitle: string;
      name: string;
      url: string;
      versionId: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
    url: string;
    versionId?: string;
  };
  LandingPageJsonApi: components["schemas"]["resource"] & {
    active?: boolean;
    cmsPageId?: string;
    cmsPageVersionId?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    keywords?: string;
    metaDescription?: string;
    metaTitle?: string;
    name: string;
    relationships?: {
      /** CMS page layout for the landing page */
      cmsPage?: {
        data?: {
          /** @example 7b1460918b1abb93311108f3dc021c9b */
          id?: string;
          /** @example cms_page */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /landing-page/815c27537bec3b60c50a2ae4d2ce875d/cmsPage
           */
          related?: string;
        };
      };
      /** SEO-friendly URLs for the landing page across different sales channels */
      seoUrls?: {
        data?: {
          /** @example 5321b5a71127b8b98cdd4b068ad56c4c */
          id?: string;
          /** @example seo_url */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /landing-page/815c27537bec3b60c50a2ae4d2ce875d/seoUrls
           */
          related?: string;
        };
      };
    };
    slotConfig?: GenericRecord;
    translated: {
      cmsPageId: string;
      cmsPageVersionId: string;
      keywords: string;
      metaDescription: string;
      metaTitle: string;
      name: string;
      url: string;
      versionId: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
    url: string;
    versionId?: string;
  };
  Language: {
    active?: boolean;
    /** Child languages inheriting from this parent language */
    children?: components["schemas"]["Language"][];
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    /** Locale defining regional settings (date, time, number formats) */
    locale?: components["schemas"]["Locale"];
    /** Unique identity of locale. */
    localeId: string;
    /** Name of the language. */
    name: string;
    /** Unique identity of language. */
    parent?: components["schemas"]["Language"];
    parentId?: string;
    /** Locale used for translating content */
    translationCode?: components["schemas"]["Locale"];
    /** Unique identity of translation code. */
    translationCodeId?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  LanguageJsonApi: components["schemas"]["resource"] & {
    active?: boolean;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    /** Unique identity of locale. */
    localeId: string;
    /** Name of the language. */
    name: string;
    parentId?: string;
    relationships?: {
      /** Child languages inheriting from this parent language */
      children?: {
        data?: {
          /** @example 268184c12df027f536154d099d497b31 */
          id?: string;
          /** @example language */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /language/4994a8ffeba4ac3140beb89e8d41f174/children
           */
          related?: string;
        };
      };
      /** Locale defining regional settings (date, time, number formats) */
      locale?: {
        data?: {
          /** @example fb216d9e8791e63c8d12bdc420956839 */
          id?: string;
          /** @example locale */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /language/4994a8ffeba4ac3140beb89e8d41f174/locale
           */
          related?: string;
        };
      };
      /** Unique identity of language. */
      parent?: {
        data?: {
          /** @example d0e45878043844ffc41aac437e86b602 */
          id?: string;
          /** @example language */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /language/4994a8ffeba4ac3140beb89e8d41f174/parent
           */
          related?: string;
        };
      };
      /** Locale used for translating content */
      translationCode?: {
        data?: {
          /** @example 6ef2035242b8fcb7b61c3a41850e60b3 */
          id?: string;
          /** @example locale */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /language/4994a8ffeba4ac3140beb89e8d41f174/translationCode
           */
          related?: string;
        };
      };
    };
    /** Unique identity of translation code. */
    translationCodeId?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  LineItem: {
    children?: components["schemas"]["LineItem"][];
    cover: components["schemas"]["Media"] | null;
    dataContextHash?: string;
    dataTimestamp?: string;
    deliveryInformation: components["schemas"]["CartDeliveryInformation"];
    description?: string;
    good?: boolean;
    id: string;
    label?: string;
    modified?: boolean;
    modifiedByApp?: boolean;
    payload: components["schemas"]["ProductJsonApi"];
    price?: {
      /** @enum {string} */
      apiAlias: "calculated_price";
      calculatedTaxes?: {
        /** @enum {string} */
        apiAlias: "cart_tax_calculated";
        price: number;
        tax: number;
        taxRate: number;
      }[];
      listPrice?: components["schemas"]["CartListPrice"] | null;
      quantity: number;
      referencePrice?: components["schemas"]["CartPriceReference"] | null;
      regulationPrice?: {
        /** @enum {string} */
        apiAlias?: "cart_regulation_price";
        price?: number;
      } | null;
      /** Currently active tax rules and/or rates */
      taxRules?: {
        name?: string;
        /** Format: float */
        taxRate?: number;
      }[];
      totalPrice: number;
      unitPrice: number;
    };
    priceDefinition?: components["schemas"]["CartPriceQuantity"];
    quantity: number;
    quantityInformation?: {
      maxPurchase?: number;
      minPurchase?: number;
      purchaseSteps?: number;
    };
    referencedId?: string;
    removable?: boolean;
    stackable?: boolean;
    /** @deprecated */
    states: ("is-physical" | "is-download")[];
    type: components["schemas"]["LineItemType"];
    uniqueIdentifier?: string;
  };
  LineItemType:
    | "product"
    | "credit"
    | "custom"
    | "promotion"
    | "discount"
    | "container"
    | "quantity";
  ListPrice: {
    /** @enum {string} */
    apiAlias: "cart_list_price";
    discount?: number;
    percentage?: number;
    price?: number;
  };
  Locale: {
    /** Code given to the locale. For example: en-CA. */
    code: string;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    name: string;
    territory: string;
    translated: {
      code: string;
      name: string;
      territory: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  LogEntry: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  MailHeaderFooter: {
    /** Format: date-time */
    readonly createdAt?: string;
    description?: string;
    footerHtml?: string;
    footerPlain?: string;
    headerHtml?: string;
    headerPlain?: string;
    id?: string;
    name: string;
    systemDefault?: boolean;
    translated: {
      description: string;
      footerHtml: string;
      footerPlain: string;
      headerHtml: string;
      headerPlain: string;
      name: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  MailTemplate: {
    contentHtml: string;
    contentPlain: string;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id?: string;
    mailTemplateType?: components["schemas"]["MailTemplateType"];
    media?: components["schemas"]["MailTemplateMedia"][];
    senderName?: string;
    systemDefault?: boolean;
    translated: {
      contentHtml: string;
      contentPlain: string;
      senderName: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  MailTemplateMedia: {
    id: string;
    languageId: string;
    mailTemplateId: string;
    media?: components["schemas"]["Media"];
    mediaId: string;
    /** Format: int64 */
    position?: number;
  };
  MailTemplateType: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    name: string;
    /** Technical name of mail template. */
    technicalName: string;
    translated: {
      name: string;
      technicalName: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  MainCategory: {
    /** Unique identity of the category. */
    categoryId: string;
    categoryVersionId?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    id: string;
    /** Unique identity of the product. */
    productId: string;
    productVersionId?: string;
    /** Unique identity of the sales channel. */
    salesChannelId: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  MainCategoryJsonApi: components["schemas"]["resource"] & {
    /** Unique identity of the category. */
    categoryId: string;
    categoryVersionId?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    id: string;
    /** Unique identity of the product. */
    productId: string;
    productVersionId?: string;
    /** Unique identity of the sales channel. */
    salesChannelId: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  MeasurementDisplayUnit: {
    /** Format: date-time */
    readonly createdAt?: string;
    default: boolean;
    /** Format: float */
    factor: number;
    id: string;
    measurementSystem?: components["schemas"]["MeasurementSystem"];
    measurementSystemId: string;
    /** Format: int64 */
    precision: number;
    shortName: string;
    translated: {
      measurementSystemId: string;
      shortName: string;
      type: string;
    };
    type: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  MeasurementSystem: {
    /** Format: date-time */
    readonly createdAt?: string;
    id: string;
    technicalName: string;
    translated: {
      technicalName: string;
    };
    units?: components["schemas"]["MeasurementDisplayUnit"][];
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  MeasurementUnits: {
    /**
     * The measurement system used in the store. 'metric' for metric system, 'imperial' for imperial system.
     * @default metric
     * @enum {string}
     */
    system?: "metric" | "imperial";
    /** Units used in the measurement system. */
    units?: {
      /**
       * Unit of length.
       * @default mm
       * @enum {string}
       */
      length?: "mm" | "cm" | "m" | "in" | "ft";
      /**
       * Unit of weight.
       * @default kg
       * @enum {string}
       */
      weight?: "g" | "kg" | "oz" | "lb";
    };
  };
  Media: {
    alt?: string;
    /** @enum {string} */
    apiAlias: "media";
    config?: GenericRecord;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /** Type of file indication. For example: jpeg, png. */
    fileExtension: string;
    /** Name of the media file uploaded. */
    fileName: string;
    /**
     * Format: int64
     * Size of the file media file uploaded.
     */
    readonly fileSize?: number;
    /** Runtime field, cannot be used as part of the criteria. */
    hasFile: boolean;
    id: string;
    readonly metaData?: {
      /** Format: int64 */
      height?: number;
      /** Format: int64 */
      width?: number;
    };
    /** A string sent along with a file indicating the type of the file. For example: image/jpeg. */
    mimeType?: string;
    path: string;
    /** When `true`, the media display is kept private. */
    private: boolean;
    /** Generated thumbnail images in various sizes */
    thumbnails?: components["schemas"]["MediaThumbnail"][];
    title?: string;
    translated: {
      alt: string;
      fileExtension: string;
      fileName: string;
      mimeType: string;
      path: string;
      title: string;
      uploadedAt: string;
      url: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
    /**
     * Format: date-time
     * Date and time at which media was added.
     */
    readonly uploadedAt?: string;
    /** Runtime field, cannot be used as part of the criteria. */
    url: string;
  };
  MediaDefaultFolder: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  MediaFolder: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  MediaFolderConfiguration: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  MediaTag: {
    id?: string;
    media?: components["schemas"]["Media"];
    mediaId: string;
    tag?: components["schemas"]["Tag"];
    tagId: string;
  };
  MediaThumbnail: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /**
     * Format: int64
     * Height of the thumbnail.
     */
    readonly height: number;
    id: string;
    /** Unique identity of media. */
    mediaId: string;
    mediaThumbnailSizeId?: string;
    path?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    /** Public url of media thumbnail. Runtime field, cannot be used as part of the criteria. */
    url: string;
    /**
     * Format: int64
     * Width of the thumbnail.
     */
    readonly width: number;
  };
  MediaThumbnailSize: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /**
     * Format: int64
     * Height of the thumbnail.
     */
    height: number;
    id: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    /**
     * Format: int64
     * Width of the thumbnail.
     */
    width: number;
  };
  MultiChannelGroup: {
    apiAlias?: string;
    /** Format: date-time */
    createdAt?: string;
    /** Format: uuid */
    id?: string;
    name?: string;
    salesChannels?: components["schemas"]["SalesChannel"][];
    translated: [];
    /** Format: date-time */
    updatedAt?: string | null;
  };
  MultiChannelGroupStruct: {
    multiChannelGroup?: components["schemas"]["MultiChannelGroup"][];
  };
  MultiNotFilter: {
    /** @enum {string} */
    operator: "and" | "or" | "nor" | "nand";
    queries: components["schemas"]["Filters"];
    /** @enum {string} */
    type: "multi" | "not";
  };
  NavigationRouteResponse: components["schemas"]["Category"][];
  NavigationType:
    | "main-navigation"
    | "footer-navigation"
    | "service-navigation";
  NewsletterRecipient: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  NewsletterRecipientJsonApi: components["schemas"]["resource"] & {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  NoneFieldsCriteria: {
    aggregations?: components["schemas"]["Aggregation"][];
    associations?: components["schemas"]["Associations"];
    excludes?: components["schemas"]["Excludes"];
    /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
    filter?: (
      | components["schemas"]["SimpleFilter"]
      | components["schemas"]["EqualsFilter"]
      | components["schemas"]["MultiNotFilter"]
      | components["schemas"]["RangeFilter"]
    )[];
    /** Perform groupings over certain fields */
    grouping?: string[];
    /** List of ids to search for */
    ids?: string[];
    includes?: components["schemas"]["Includes"];
    /** Number of items per result page */
    limit?: number;
    /** Search result page */
    page?: number;
    /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
    "post-filter"?: (
      | components["schemas"]["SimpleFilter"]
      | components["schemas"]["EqualsFilter"]
      | components["schemas"]["MultiNotFilter"]
      | components["schemas"]["RangeFilter"]
    )[];
    /** The query string to search for */
    query?: string;
    /** Sorting in the search result. */
    sort?: components["schemas"]["Sort"][];
    /** Search term */
    term?: string;
    "total-count-mode"?: components["schemas"]["TotalCountMode"];
  };
  Notification: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  NumberRange: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  NumberRangeSalesChannel: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  NumberRangeState: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  NumberRangeType: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Order: {
    /** All addresses associated with the order (billing and shipping) */
    addresses?: components["schemas"]["OrderAddress"][];
    /** An affiliate code is an identification option with which website operators can mark outgoing links. */
    affiliateCode?: string;
    /**
     * Format: float
     * Net price of the order.
     */
    readonly amountNet?: number;
    /**
     * Format: float
     * Gross price of the order.
     */
    readonly amountTotal?: number;
    /** Billing address for the order */
    billingAddress?: components["schemas"]["OrderAddress"];
    /** Unique identity of the billing address. */
    billingAddressId: string;
    billingAddressVersionId?: string;
    /** A campaign code is the globally unique identifier for a campaign. */
    campaignCode?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    /** Unique identity of createdBy. */
    createdById?: string;
    /** Currency used for the order */
    currency?: components["schemas"]["Currency"];
    /**
     * Format: float
     * Rate at which currency is exchanged.
     */
    currencyFactor: number;
    /** Unique identity of the currency. */
    currencyId: string;
    /** Comments given by comments. */
    customerComment?: string;
    customFields?: GenericRecord;
    /** It is a generated special code linked to email. It is used to access orders placed by guest customers. */
    deepLinkCode?: string;
    /** Delivery information including shipping address and tracking */
    deliveries?: components["schemas"]["OrderDelivery"][];
    /** Generated documents (invoices, delivery notes, credit notes) */
    documents: components["schemas"]["Document"][];
    id: string;
    /** Language used when placing the order */
    language?: components["schemas"]["Language"];
    /** Unique identity of the language. */
    languageId: string;
    /** Order line items (products, discounts, fees) */
    lineItems?: components["schemas"]["OrderLineItem"][];
    /** Customer information associated with the order */
    orderCustomer?: components["schemas"]["OrderCustomer"];
    /** Date when the order was placed. */
    readonly orderDate: string;
    /**
     * Format: date-time
     * Timestamp when the order was placed.
     */
    orderDateTime: string;
    /** Unique number associated with every order. */
    orderNumber?: string;
    /**
     * Format: float
     * Price of each line item in the cart multiplied by its quantity excluding charges like shipping cost, rules, taxes etc.
     */
    readonly positionPrice?: number;
    price: components["schemas"]["CalculatedPrice"];
    /** Primary delivery information for the order */
    primaryOrderDelivery?: components["schemas"]["OrderDelivery"];
    primaryOrderDeliveryId?: string;
    primaryOrderDeliveryVersionId?: string;
    /** Primary payment transaction for the order */
    primaryOrderTransaction?: components["schemas"]["OrderTransaction"];
    primaryOrderTransactionId?: string;
    primaryOrderTransactionVersionId?: string;
    /** Unique identity of the sales channel. */
    salesChannelId: string;
    shippingCosts?: {
      calculatedTaxes?: GenericRecord;
      listPrice?: {
        /** Format: float */
        discount?: number;
        /** Format: float */
        percentage?: number;
        /** Format: float */
        price?: number;
      };
      /** Format: int64 */
      quantity: number;
      referencePrice?: GenericRecord;
      regulationPrice?: {
        /** Format: float */
        price?: number;
      };
      taxRules?: GenericRecord;
      /** Format: float */
      totalPrice: number;
      /** Format: float */
      unitPrice: number;
    };
    /**
     * Format: float
     * Total shipping cost of the ordered product.
     */
    readonly shippingTotal?: number;
    /** Source of orders either via normal order placement or subscriptions. */
    source?: string;
    /** Current order state (e.g., open, in_progress, completed, cancelled) */
    stateMachineState: components["schemas"]["StateMachineState"];
    /** Tags assigned to the order for organization and filtering */
    tags?: components["schemas"]["Tag"][];
    taxCalculationType?: string;
    /** TaxStatus takes `Free`, `Net` or `Gross` as values. */
    readonly taxStatus?: string;
    /** Payment transactions for the order */
    transactions?: components["schemas"]["OrderTransaction"][];
    /** Format: date-time */
    readonly updatedAt?: string;
    /** Unique identity of updatedBy. */
    updatedById?: string;
    versionId?: string;
  };
  OrderAddress: {
    /** Additional address input if necessary. */
    additionalAddressLine1?: string;
    /** Additional address input if necessary. */
    additionalAddressLine2?: string;
    /** Name of the city. */
    city: string;
    /** Name of the company. */
    company?: string;
    country?: components["schemas"]["Country"];
    /** Unique identity of country. */
    countryId: string;
    countryState?: components["schemas"]["CountryState"];
    /** Unique identity of state. */
    countryStateId?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /** Name of the department. */
    department?: string;
    /** First name of the customer. */
    firstName: string;
    /** Runtime field, cannot be used as part of the criteria. */
    hash?: string;
    id: string;
    /** Last name of the customer. */
    lastName: string;
    /** Phone number of the customer. */
    phoneNumber?: string;
    salutation?: components["schemas"]["Salutation"];
    /** Street address */
    street: string;
    /** Title name given to customer like DR. , Prof., etc. */
    title?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    /** Unique identity of VAT. */
    vatId?: string;
    versionId?: string;
    /** Zip code of the country. */
    zipcode?: string;
  };
  OrderCustomer: {
    /** Name of the company. */
    company?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    /** Unique number assigned to the customer. */
    customerNumber?: string;
    customFields?: GenericRecord;
    /** Email address of the customer. */
    email: string;
    /** First name of the customer. */
    firstName: string;
    id: string;
    /** Last name of the customer. */
    lastName: string;
    salutation?: components["schemas"]["Salutation"];
    /** Unique identity of salutation. */
    salutationId?: string;
    /** Title name given to the customer like Dr, prof. etc. */
    title?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    vatIds?: string[];
    versionId?: string;
  };
  OrderDelivery: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    /** Unique identity of order. */
    orderId: string;
    orderVersionId?: string;
    /** Line items included in this delivery */
    positions?: components["schemas"]["OrderDeliveryPosition"][];
    shippingCosts?: {
      calculatedTaxes?: GenericRecord;
      listPrice?: {
        /** Format: float */
        discount?: number;
        /** Format: float */
        percentage?: number;
        /** Format: float */
        price?: number;
      };
      /** Format: int64 */
      quantity: number;
      referencePrice?: GenericRecord;
      regulationPrice?: {
        /** Format: float */
        price?: number;
      };
      taxRules?: GenericRecord;
      /** Format: float */
      totalPrice: number;
      /** Format: float */
      unitPrice: number;
    };
    /**
     * Format: date-time
     * Date and time of earliest delivery of products.
     */
    shippingDateEarliest: string;
    /**
     * Format: date-time
     * Date and time of latest delivery of products.
     */
    shippingDateLatest: string;
    /** Shipping method used for this delivery */
    shippingMethod?: components["schemas"]["ShippingMethod"];
    /** Unique identity of shipping method. */
    shippingMethodId: string;
    /** Shipping address for this delivery */
    shippingOrderAddress?: components["schemas"]["OrderAddress"];
    /** Unique identity of order's shipping address. */
    shippingOrderAddressId: string;
    shippingOrderAddressVersionId?: string;
    /** Unique identity of state. */
    stateId: string;
    /** Current delivery state (e.g., open, shipped, delivered, cancelled) */
    stateMachineState?: components["schemas"]["StateMachineState"];
    trackingCodes?: string[];
    /** Format: date-time */
    readonly updatedAt?: string;
    versionId?: string;
  };
  OrderDeliveryPosition: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    /** Unique identity of order delivery. */
    orderDeliveryId: string;
    orderDeliveryVersionId?: string;
    /** Unique identity of line items in an order. */
    orderLineItemId: string;
    orderLineItemVersionId?: string;
    price?: {
      calculatedTaxes?: GenericRecord;
      listPrice?: {
        /** Format: float */
        discount?: number;
        /** Format: float */
        percentage?: number;
        /** Format: float */
        price?: number;
      };
      /** Format: int64 */
      quantity: number;
      referencePrice?: GenericRecord;
      regulationPrice?: {
        /** Format: float */
        price?: number;
      };
      taxRules?: GenericRecord;
      /** Format: float */
      totalPrice: number;
      /** Format: float */
      unitPrice: number;
    };
    /**
     * Format: int64
     * Number of items of each product.
     */
    quantity?: number;
    /**
     * Format: float
     * Cost of product based on quantity.
     */
    totalPrice?: number;
    /**
     * Format: float
     * Price of product per item (where, quantity=1).
     */
    unitPrice?: number;
    /** Format: date-time */
    readonly updatedAt?: string;
    versionId?: string;
  };
  OrderLineItem: {
    /** @enum {string} */
    apiAlias: "order_line_item";
    children: components["schemas"]["OrderLineItem"][];
    /** Line item image or thumbnail */
    cover?: components["schemas"]["Media"];
    /** Unique identity of cover image. */
    coverId?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /** Description of line items in an order. */
    description?: string;
    /** Digital downloads associated with this line item */
    downloads?: components["schemas"]["OrderLineItemDownload"][];
    extensions?: GenericRecord;
    /** When set to true, it indicates the line item is physical else it is virtual. */
    good?: boolean;
    id: string;
    /** It is a unique identity of an item in cart before its converted to an order. */
    identifier: string;
    /** It is a typical product name given to the line item. */
    label: string;
    /** Delivery positions for this line item */
    orderDeliveryPositions?: components["schemas"]["OrderDeliveryPosition"][];
    /** Unique identity of order. */
    orderId: string;
    orderVersionId?: string;
    parent?: components["schemas"]["OrderLineItem"];
    parentId?: string;
    parentVersionId?: string;
    payload?: {
      readonly categoryIds?: string[];
      /** Format: date-time */
      readonly createdAt?: string;
      customFields?: GenericRecord;
      features?: unknown[];
      isCloseout?: boolean;
      isNew?: boolean;
      manufacturerId?: string;
      markAsTopseller?: boolean;
      readonly optionIds?: string[];
      options?: components["schemas"]["PropertyGroupOption"][];
      parentId?: string;
      productNumber?: string;
      productType?: components["schemas"]["Product"]["type"];
      readonly propertyIds?: string[];
      purchasePrices?: string;
      /** Format: date-time */
      releaseDate?: string;
      /** Format: int64 */
      stock?: number;
      readonly streamIds?: string[];
      readonly tagIds?: string[];
      taxId?: string;
    };
    /**
     * Format: int64
     * Position of line items placed in an order.
     */
    position?: number;
    priceDefinition?: components["schemas"]["CartPriceQuantity"];
    /** Referenced product if this is a product line item */
    product?: components["schemas"]["Product"];
    /** Unique identity of product. */
    productId?: string;
    productVersionId?: string;
    /** Unique identity of product. */
    promotionId?: string;
    /**
     * Format: int64
     * Number of items of product.
     */
    quantity: number;
    /** Unique identity of type of entity. */
    referencedId?: string;
    /** Allows the line item to be removable from the cart when set to true. */
    removable?: boolean;
    /** Allows to change the quantity of the line item when set to true. */
    stackable?: boolean;
    /** @deprecated */
    states: string[];
    /**
     * Format: float
     * Cost of product based on quantity.
     */
    totalPrice?: number;
    translated: {
      coverId: string;
      description: string;
      identifier: string;
      label: string;
      orderId: string;
      orderVersionId: string;
      parentId: string;
      parentVersionId: string;
      productId: string;
      productVersionId: string;
      promotionId: string;
      referencedId: string;
      type: string;
      versionId: string;
    };
    /** Type refers to the entity type of an item whether it is product or promotion for instance. */
    type?: string;
    /**
     * Format: float
     * Price of product per item (where, quantity=1).
     */
    unitPrice?: number;
    /** Format: date-time */
    readonly updatedAt?: string;
    versionId?: string;
  };
  OrderLineItemDownload: {
    /** When boolean value is `true`, the digital product is allowed to download. */
    accessGranted: boolean;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    media: components["schemas"]["Media"];
    /** Unique identity of media. */
    mediaId: string;
    orderLineItem?: components["schemas"]["OrderLineItem"];
    /** Unique identity of Order line item. */
    orderLineItemId: string;
    orderLineItemVersionId?: string;
    /**
     * Format: int64
     * The order of downloaded digital products displayed in the storefront by mentioning numerical values like 1,2,3, etc.
     */
    position: number;
    /** Format: date-time */
    readonly updatedAt?: string;
    versionId?: string;
  };
  OrderRouteResponse: {
    orders: {
      elements: components["schemas"]["Order"][];
    } & components["schemas"]["EntitySearchResult"];
    /** The key-value pairs contain the uuid of the order as key and a boolean as value, indicating that the payment method can still be changed. */
    paymentChangeable?: {
      [key: string]: boolean;
    };
  };
  OrderTag: {
    id?: string;
    order?: components["schemas"]["Order"];
    orderId: string;
    orderVersionId?: string;
    tag?: components["schemas"]["Tag"];
    tagId: string;
  };
  OrderTransaction: {
    amount: {
      calculatedTaxes?: GenericRecord;
      listPrice?: {
        /** Format: float */
        discount?: number;
        /** Format: float */
        percentage?: number;
        /** Format: float */
        price?: number;
      };
      /** Format: int64 */
      quantity: number;
      referencePrice?: GenericRecord;
      regulationPrice?: {
        /** Format: float */
        price?: number;
      };
      taxRules?: GenericRecord;
      /** Format: float */
      totalPrice: number;
      /** Format: float */
      unitPrice: number;
    };
    /** Payment captures for this transaction */
    captures?: components["schemas"]["OrderTransactionCapture"][];
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    /** Unique identity of an order. */
    orderId: string;
    orderVersionId?: string;
    /** Payment method used for this transaction */
    paymentMethod?: components["schemas"]["PaymentMethod"];
    /** Unique identity of payment method. */
    paymentMethodId: string;
    /** Unique identity of state. */
    stateId: string;
    /** Current payment transaction state (e.g., open, paid, cancelled) */
    stateMachineState?: components["schemas"]["StateMachineState"];
    /** Format: date-time */
    readonly updatedAt?: string;
    validationData?: GenericRecord;
    versionId?: string;
  };
  OrderTransactionCapture: {
    amount: {
      calculatedTaxes?: GenericRecord;
      listPrice?: {
        /** Format: float */
        discount?: number;
        /** Format: float */
        percentage?: number;
        /** Format: float */
        price?: number;
      };
      /** Format: int64 */
      quantity: number;
      referencePrice?: GenericRecord;
      regulationPrice?: {
        /** Format: float */
        price?: number;
      };
      taxRules?: GenericRecord;
      /** Format: float */
      totalPrice: number;
      /** Format: float */
      unitPrice: number;
    };
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /** External payment provider token. */
    externalReference?: string;
    id: string;
    /** Unique identity of order transaction. */
    orderTransactionId: string;
    orderTransactionVersionId?: string;
    refunds?: components["schemas"]["OrderTransactionCaptureRefund"][];
    /** Unique identity of order state. */
    stateId: string;
    stateMachineState?: components["schemas"]["StateMachineState"];
    transaction?: components["schemas"]["OrderTransaction"];
    /** Format: date-time */
    readonly updatedAt?: string;
    versionId?: string;
  };
  OrderTransactionCaptureRefund: {
    amount: {
      calculatedTaxes?: GenericRecord;
      listPrice?: {
        /** Format: float */
        discount?: number;
        /** Format: float */
        percentage?: number;
        /** Format: float */
        price?: number;
      };
      /** Format: int64 */
      quantity: number;
      referencePrice?: GenericRecord;
      regulationPrice?: {
        /** Format: float */
        price?: number;
      };
      taxRules?: GenericRecord;
      /** Format: float */
      totalPrice: number;
      /** Format: float */
      unitPrice: number;
    };
    /** Unique identity of order transaction capture. */
    captureId: string;
    captureVersionId?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /** External payment provider token. */
    externalReference?: string;
    id: string;
    positions?: components["schemas"]["OrderTransactionCaptureRefundPosition"][];
    /** Reason for refunding the amount for an order. */
    reason?: string;
    /** Unique identity of order state. */
    stateId: string;
    stateMachineState?: components["schemas"]["StateMachineState"];
    transactionCapture?: components["schemas"]["OrderTransactionCapture"];
    /** Format: date-time */
    readonly updatedAt?: string;
    versionId?: string;
  };
  OrderTransactionCaptureRefundPosition: {
    amount: {
      calculatedTaxes?: GenericRecord;
      listPrice?: {
        /** Format: float */
        discount?: number;
        /** Format: float */
        percentage?: number;
        /** Format: float */
        price?: number;
      };
      /** Format: int64 */
      quantity: number;
      referencePrice?: GenericRecord;
      regulationPrice?: {
        /** Format: float */
        price?: number;
      };
      taxRules?: GenericRecord;
      /** Format: float */
      totalPrice: number;
      /** Format: float */
      unitPrice: number;
    };
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /** External payment provider token. */
    externalReference?: string;
    id: string;
    orderLineItem?: components["schemas"]["OrderLineItem"];
    /** Unique identity of order line item. */
    orderLineItemId: string;
    orderLineItemVersionId?: string;
    orderTransactionCaptureRefund?: components["schemas"]["OrderTransactionCaptureRefund"];
    /**
     * Format: int64
     * Quantity of line item to be refunded.
     */
    quantity?: number;
    /** Reason for refunding the amount for an order. */
    reason?: string;
    /** Unique identity of order transaction capture refund. */
    refundId: string;
    refundVersionId?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    versionId?: string;
  };
  PaymentMethod: {
    /** When boolean value is `true`, the payment methods are available for selection in the storefront. */
    active?: boolean;
    /** When set to true, customers are redirected to the payment options page to choose a new payment method on order failure. */
    afterOrderEnabled?: boolean;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    description?: string;
    readonly distinguishableName?: string;
    id: string;
    /** Payment method logo or icon image */
    media?: components["schemas"]["Media"];
    /** Unique identity of media. */
    mediaId?: string;
    name: string;
    /**
     * Format: int64
     * The order of the tabs of your defined payment methods in the storefront by entering numerical values like 1,2,3, etc.
     */
    position?: number;
    /** Runtime field, cannot be used as part of the criteria. */
    shortName?: string;
    technicalName: string;
    translated: {
      description: string;
      distinguishableName: string;
      mediaId: string;
      name: string;
      shortName: string;
      technicalName: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  PaymentMethodJsonApi: components["schemas"]["resource"] & {
    /** When boolean value is `true`, the payment methods are available for selection in the storefront. */
    active?: boolean;
    /** When set to true, customers are redirected to the payment options page to choose a new payment method on order failure. */
    afterOrderEnabled?: boolean;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    description?: string;
    readonly distinguishableName?: string;
    id: string;
    /** Unique identity of media. */
    mediaId?: string;
    name: string;
    /**
     * Format: int64
     * The order of the tabs of your defined payment methods in the storefront by entering numerical values like 1,2,3, etc.
     */
    position?: number;
    relationships?: {
      /** Payment method logo or icon image */
      media?: {
        data?: {
          /** @example 62933a2951ef01f4eafd9bdf4d3cd2f0 */
          id?: string;
          /** @example media */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /payment-method/da8da1569e6bef3249a7064261df833f/media
           */
          related?: string;
        };
      };
    };
    /** Runtime field, cannot be used as part of the criteria. */
    shortName?: string;
    technicalName: string;
    translated: {
      description: string;
      distinguishableName: string;
      mediaId: string;
      name: string;
      shortName: string;
      technicalName: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Plugin: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Price: {
    currencyId: string;
    gross: number;
    linked?: boolean;
    listPrice?: {
      currencyId?: string;
      gross: number;
      linked?: boolean;
      net: number;
    };
    net: number;
    regulationPrice?: {
      currencyId?: string;
      gross: number;
      linked?: boolean;
      net: number;
    };
  };
  Product: {
    /** When boolean value is `true`, the products are available for selection in the storefront for purchase. */
    active?: boolean;
    /** @enum {string} */
    apiAlias: "product";
    /** Indicates weather the product is available or not. */
    readonly available?: boolean;
    /**
     * Format: int64
     * Indicates the number of products still available. This value results from the stock minus the open orders.
     */
    readonly availableStock?: number;
    calculatedCheapestPrice?: {
      /** @enum {string} */
      apiAlias?: "calculated_cheapest_price";
      hasRange?: boolean;
      listPrice?: components["schemas"]["ListPrice"] | null;
      quantity?: number;
      referencePrice?: components["schemas"]["ReferencePrice"] | null;
      regulationPrice?: {
        price: number;
      } | null;
      totalPrice?: number;
      unitPrice?: number;
      variantId?: string | null;
    };
    /**
     * Format: int64
     * Runtime field, cannot be used as part of the criteria.
     */
    calculatedMaxPurchase?: number;
    calculatedPrice: components["schemas"]["CalculatedPrice"];
    calculatedPrices: components["schemas"]["CalculatedPrice"][];
    /** Canonical product reference for variant consolidation and SEO purposes */
    canonicalProduct?: components["schemas"]["Product"];
    /** Unique identity of canonical product. */
    canonicalProductId?: string;
    canonicalProductVersionId?: string;
    /** Categories this product is assigned to */
    categories?: components["schemas"]["Category"][];
    /** Read-only category tree including all parent categories for optimized queries */
    categoriesRo?: components["schemas"]["Category"][];
    readonly categoryIds?: string[];
    readonly categoryTree?: string[];
    /** Format: int64 */
    readonly childCount?: number;
    /** Product variants that inherit from this parent product */
    children?: components["schemas"]["Product"][];
    /** Custom CMS page layout for the product detail page */
    cmsPage?: components["schemas"]["CmsPage"];
    /** Unique identity of CMS page. */
    cmsPageId?: string;
    cmsPageVersionId?: string;
    /** Variant configurator settings defining available options for product variants */
    configuratorSettings?: components["schemas"]["ProductConfiguratorSetting"][];
    /** Main product image displayed in listings and detail pages */
    cover?: components["schemas"]["ProductMedia"];
    /** Unique identity of a ProductMedia item used as product cover. */
    coverId?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    /** Cross-selling configurations (related products, accessories, similar items) */
    crossSellings?: components["schemas"]["ProductCrossSelling"][];
    customFields?: GenericRecord;
    /** Estimated delivery time for the product */
    deliveryTime?: components["schemas"]["DeliveryTime"];
    /** Unique identity of delivery time. */
    deliveryTimeId?: string;
    description?: string;
    /** Runtime field, cannot be used as part of the criteria. */
    readonly displayGroup?: string;
    /** Downloadable files associated with the product (e.g., manuals, digital content) */
    downloads?: components["schemas"]["ProductDownload"][];
    /** Indicates EAN of the product. */
    ean?: string;
    /**
     * Format: float
     * The height of the product.
     */
    height?: number;
    id: string;
    /** When the value is set to true, the product is hidden when sold out. */
    isCloseout?: boolean;
    /** Runtime field, cannot be used as part of the criteria. */
    isNew?: boolean;
    keywords?: string;
    /**
     * Format: float
     * The length of the product.
     */
    length?: number;
    /** Primary category assignments per sales channel for SEO and navigation */
    mainCategories?: components["schemas"]["MainCategory"][];
    /** Product manufacturer or brand information */
    manufacturer?: components["schemas"]["ProductManufacturer"];
    /** Unique identity of the manufacturer. */
    manufacturerId?: string;
    /** Unique number that describes the manufacturer. */
    manufacturerNumber?: string;
    /** Indicates weather the product is top seller or not. */
    markAsTopseller?: boolean;
    /**
     * Format: int64
     * Maximum number of items that can be purchased.
     */
    maxPurchase?: number;
    measurements?: components["schemas"]["ProductMeasurements"];
    /** Product images and media gallery */
    media?: components["schemas"]["ProductMedia"][];
    metaDescription?: string;
    metaTitle?: string;
    /**
     * Format: int64
     * Minimum number of items that can be purchased.
     */
    minPurchase?: number;
    name: string;
    readonly optionIds?: string[];
    /** Product variant options (e.g., size, color) that define different variants */
    options?: components["schemas"]["PropertyGroupOption"][];
    packUnit?: string;
    packUnitPlural?: string;
    /** Unique identity of the product. */
    parent?: components["schemas"]["Product"];
    parentId?: string;
    parentVersionId?: string;
    productManufacturerVersionId?: string;
    productMediaVersionId?: string;
    /** Unique number assigned to individual products. Define rules for automatic assignment of every product creation as per your number range. */
    productNumber: string;
    /** Customer reviews and ratings for the product */
    productReviews?: components["schemas"]["ProductReview"][];
    /** Product properties and characteristics for filtering */
    properties?: components["schemas"]["PropertyGroupOption"][];
    readonly propertyIds?: string[];
    /**
     * Format: int64
     * Specifies the scales in which the item is to be offered. For example, a scale of 2 means that your customers can purchase 2, 4, 6 products, etc., but not 1, 3 or 5.
     */
    purchaseSteps?: number;
    /**
     * Format: float
     * Quantity of the item purchased. For example, 500ml, 2kg, etc.
     */
    purchaseUnit?: number;
    /**
     * Format: float
     * Average of all the ratings.
     */
    readonly ratingAverage?: number;
    /**
     * Format: float
     * Price of purchased item calculated as per the reference unit. Say, you bought 500ml of milk and the price is calculated in reference to 1000ml.
     */
    referenceUnit?: number;
    /**
     * Format: date-time
     * The release date of a product or product model. This can be used to distinguish the exact variant of a product.
     */
    releaseDate?: string;
    /**
     * Format: int64
     * The restock time in days indicates how long it will take until a sold out item is back in stock.
     */
    restockTime?: number;
    /**
     * Format: int64
     * Frequency of the product sales.
     */
    readonly sales?: number;
    /** Main category used for SEO URL generation in the current sales channel */
    seoCategory: components["schemas"]["Category"];
    /** SEO-friendly URLs for the product across different sales channels */
    seoUrls?: components["schemas"]["SeoUrl"][];
    /** Indicates weather the shipping price is free or not. */
    shippingFree?: boolean;
    sortedProperties?: GenericRecord;
    /** @deprecated */
    readonly states?: string[];
    /**
     * Format: int64
     * Indicates the number of products available.
     */
    stock: number;
    readonly streamIds?: string[];
    /** Dynamic product streams this product belongs to based on defined filters */
    streams?: components["schemas"]["ProductStream"][];
    readonly tagIds?: string[];
    /** Tags for organizing and filtering products */
    tags?: components["schemas"]["Tag"][];
    /** Tax configuration (rate and calculation rules) */
    tax?: components["schemas"]["Tax"];
    /** Unique identity of tax. */
    taxId: string;
    translated: {
      canonicalProductId: string;
      canonicalProductVersionId: string;
      cmsPageId: string;
      cmsPageVersionId: string;
      coverId: string;
      deliveryTimeId: string;
      description: string;
      displayGroup: string;
      ean: string;
      keywords: string;
      manufacturerId: string;
      manufacturerNumber: string;
      metaDescription: string;
      metaTitle: string;
      name: string;
      packUnit: string;
      packUnitPlural: string;
      parentId: string;
      parentVersionId: string;
      productManufacturerVersionId: string;
      productMediaVersionId: string;
      productNumber: string;
      releaseDate: string;
      taxId: string;
      type: string;
      unitId: string;
      versionId: string;
    };
    /**
     * The type of the product, e.g., physical or digital.
     * @enum {string}
     */
    type: "physical" | "digital";
    /** Product unit of measure (e.g., piece, liter, kg) */
    unit?: components["schemas"]["Unit"];
    /** Unique identity of the unit. */
    unitId?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    variantListingConfig?: {
      displayParent?: boolean;
    } | null;
    versionId?: string;
    /**
     * Format: float
     * The weight of the product.
     */
    weight?: number;
    /**
     * Format: float
     * The width of the product.
     */
    width?: number;
  };
  ProductConfiguratorSetting: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    media?: components["schemas"]["Media"];
    /** Unique identity of media. */
    mediaId?: string;
    option?: components["schemas"]["PropertyGroupOption"];
    /** Unique identity of option. */
    optionId: string;
    /**
     * Format: int64
     * The order of the tabs of your defined product configuration settings in the storefront by entering numerical values like 1,2,3, etc.
     */
    position?: number;
    /** Unique identity of product. */
    productId: string;
    productVersionId?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    versionId?: string;
  };
  ProductCrossSelling: {
    /** When set to active, the cross-selling feature is enabled. */
    active?: boolean;
    /** Format: date-time */
    readonly createdAt?: string;
    id: string;
    /**
     * Format: int64
     * The maximum number of products to be displayed in cross-selling on the item detail page of your item.
     */
    limit?: number;
    name: string;
    /**
     * Format: int64
     * The order of the tabs of your defined cross-selling actions in the storefront by entering numerical values like 1,2,3, etc.
     */
    position?: number;
    /** To sort the display of products by name, price or publication (descending, ascending) date. */
    sortBy?: string;
    /** To sort the display of products by ascending or descending order. */
    sortDirection?: string;
    translated: {
      name: string;
      sortBy: string;
      sortDirection: string;
      type: string;
    };
    /** Type of product assignment for cross-selling. It can either be Dynamic product group or Manual assignment. */
    type?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ProductCrossSellingAssignedProducts: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ProductDetailResponse: {
    /** List of property groups with their corresponding options and information on how to display them. */
    configurator?: components["schemas"]["PropertyGroup"][];
    product: components["schemas"]["Product"];
  };
  ProductDownload: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    media?: components["schemas"]["Media"];
    /** Unique identity of media. */
    mediaId: string;
    /**
     * Format: int64
     * The order in which the digital products are downloaded, like 1,2,3, etc.to adjust their order of display.
     */
    position?: number;
    product?: components["schemas"]["Product"];
    /** Unique identity of Product. */
    productId: string;
    productVersionId?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    versionId?: string;
  };
  ProductExport: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ProductFeatureSet: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ProductJsonApi: components["schemas"]["resource"] & {
    /** When boolean value is `true`, the products are available for selection in the storefront for purchase. */
    active?: boolean;
    /** Indicates weather the product is available or not. */
    readonly available?: boolean;
    /**
     * Format: int64
     * Indicates the number of products still available. This value results from the stock minus the open orders.
     */
    readonly availableStock?: number;
    calculatedCheapestPrice?: GenericRecord;
    /**
     * Format: int64
     * Runtime field, cannot be used as part of the criteria.
     */
    calculatedMaxPurchase?: number;
    calculatedPrice?: GenericRecord;
    calculatedPrices?: GenericRecord[];
    /** Unique identity of canonical product. */
    canonicalProductId?: string;
    canonicalProductVersionId?: string;
    readonly categoryIds?: string[];
    readonly categoryTree?: string[];
    /** Format: int64 */
    readonly childCount?: number;
    /** Unique identity of CMS page. */
    cmsPageId?: string;
    cmsPageVersionId?: string;
    /** Unique identity of a ProductMedia item used as product cover. */
    coverId?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /** Unique identity of delivery time. */
    deliveryTimeId?: string;
    description?: string;
    /** Runtime field, cannot be used as part of the criteria. */
    readonly displayGroup?: string;
    /** Indicates EAN of the product. */
    ean?: string;
    /**
     * Format: float
     * The height of the product.
     */
    height?: number;
    id: string;
    /** When the value is set to true, the product is hidden when sold out. */
    isCloseout?: boolean;
    /** Runtime field, cannot be used as part of the criteria. */
    isNew?: boolean;
    keywords?: string;
    /**
     * Format: float
     * The length of the product.
     */
    length?: number;
    /** Unique identity of the manufacturer. */
    manufacturerId?: string;
    /** Unique number that describes the manufacturer. */
    manufacturerNumber?: string;
    /** Indicates weather the product is top seller or not. */
    markAsTopseller?: boolean;
    /**
     * Format: int64
     * Maximum number of items that can be purchased.
     */
    maxPurchase?: number;
    measurements?: GenericRecord;
    metaDescription?: string;
    metaTitle?: string;
    /**
     * Format: int64
     * Minimum number of items that can be purchased.
     */
    minPurchase?: number;
    name: string;
    readonly optionIds?: string[];
    packUnit?: string;
    packUnitPlural?: string;
    parentId?: string;
    parentVersionId?: string;
    productManufacturerVersionId?: string;
    productMediaVersionId?: string;
    /** Unique number assigned to individual products. Define rules for automatic assignment of every product creation as per your number range. */
    productNumber: string;
    readonly propertyIds?: string[];
    /**
     * Format: int64
     * Specifies the scales in which the item is to be offered. For example, a scale of 2 means that your customers can purchase 2, 4, 6 products, etc., but not 1, 3 or 5.
     */
    purchaseSteps?: number;
    /**
     * Format: float
     * Quantity of the item purchased. For example, 500ml, 2kg, etc.
     */
    purchaseUnit?: number;
    /**
     * Format: float
     * Average of all the ratings.
     */
    readonly ratingAverage?: number;
    /**
     * Format: float
     * Price of purchased item calculated as per the reference unit. Say, you bought 500ml of milk and the price is calculated in reference to 1000ml.
     */
    referenceUnit?: number;
    relationships?: {
      /** Canonical product reference for variant consolidation and SEO purposes */
      canonicalProduct?: {
        data?: {
          /** @example 023995a50b56c0de077323e958b2bbcd */
          id?: string;
          /** @example product */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/canonicalProduct
           */
          related?: string;
        };
      };
      /** Categories this product is assigned to */
      categories?: {
        data?: {
          /** @example b0b5ccb4a195a07fd3eed14affb8695f */
          id?: string;
          /** @example category */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/categories
           */
          related?: string;
        };
      };
      /** Read-only category tree including all parent categories for optimized queries */
      categoriesRo?: {
        data?: {
          /** @example 7f0702d3a90d965b8c9158c451f43fdb */
          id?: string;
          /** @example category */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/categoriesRo
           */
          related?: string;
        };
      };
      /** Product variants that inherit from this parent product */
      children?: {
        data?: {
          /** @example 268184c12df027f536154d099d497b31 */
          id?: string;
          /** @example product */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/children
           */
          related?: string;
        };
      };
      /** Custom CMS page layout for the product detail page */
      cmsPage?: {
        data?: {
          /** @example 7b1460918b1abb93311108f3dc021c9b */
          id?: string;
          /** @example cms_page */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/cmsPage
           */
          related?: string;
        };
      };
      /** Variant configurator settings defining available options for product variants */
      configuratorSettings?: {
        data?: {
          /** @example c0827fee13725d41f1fd7e292243f5aa */
          id?: string;
          /** @example product_configurator_setting */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/configuratorSettings
           */
          related?: string;
        };
      };
      /** Main product image displayed in listings and detail pages */
      cover?: {
        data?: {
          /** @example 41d0e299ca1abeb2094852da042165c7 */
          id?: string;
          /** @example product_media */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/cover
           */
          related?: string;
        };
      };
      /** Cross-selling configurations (related products, accessories, similar items) */
      crossSellings?: {
        data?: {
          /** @example 89936e14544d1b403cecef938101b6b0 */
          id?: string;
          /** @example product_cross_selling */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/crossSellings
           */
          related?: string;
        };
      };
      /** Estimated delivery time for the product */
      deliveryTime?: {
        data?: {
          /** @example 8c888ae25a7bd42057370e31f7e01044 */
          id?: string;
          /** @example delivery_time */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/deliveryTime
           */
          related?: string;
        };
      };
      /** Downloadable files associated with the product (e.g., manuals, digital content) */
      downloads?: {
        data?: {
          /** @example d07d50a751bc6ddf12bf3af0efee9b45 */
          id?: string;
          /** @example product_download */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/downloads
           */
          related?: string;
        };
      };
      /** Primary category assignments per sales channel for SEO and navigation */
      mainCategories?: {
        data?: {
          /** @example 1fb731fc4139cbb575429e28846f0c39 */
          id?: string;
          /** @example main_category */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/mainCategories
           */
          related?: string;
        };
      };
      /** Product manufacturer or brand information */
      manufacturer?: {
        data?: {
          /** @example c2904bca62b22443d6cf5e9d89cab204 */
          id?: string;
          /** @example product_manufacturer */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/manufacturer
           */
          related?: string;
        };
      };
      /** Product images and media gallery */
      media?: {
        data?: {
          /** @example 62933a2951ef01f4eafd9bdf4d3cd2f0 */
          id?: string;
          /** @example product_media */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/media
           */
          related?: string;
        };
      };
      /** Product variant options (e.g., size, color) that define different variants */
      options?: {
        data?: {
          /** @example 93da65a9fd0004d9477aeac024e08e15 */
          id?: string;
          /** @example property_group_option */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/options
           */
          related?: string;
        };
      };
      /** Unique identity of the product. */
      parent?: {
        data?: {
          /** @example d0e45878043844ffc41aac437e86b602 */
          id?: string;
          /** @example product */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/parent
           */
          related?: string;
        };
      };
      /** Customer reviews and ratings for the product */
      productReviews?: {
        data?: {
          /** @example 01e78541ea343ed72424a5222796a4cd */
          id?: string;
          /** @example product_review */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/productReviews
           */
          related?: string;
        };
      };
      /** Product properties and characteristics for filtering */
      properties?: {
        data?: {
          /** @example 74693d2fc58b46bd06410f278e39aa71 */
          id?: string;
          /** @example property_group_option */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/properties
           */
          related?: string;
        };
      };
      /** Main category used for SEO URL generation in the current sales channel */
      seoCategory?: {
        data?: {
          /** @example 9354d004d12e03d35ad8292bf0bb234d */
          id?: string;
          /** @example category */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/seoCategory
           */
          related?: string;
        };
      };
      /** SEO-friendly URLs for the product across different sales channels */
      seoUrls?: {
        data?: {
          /** @example 5321b5a71127b8b98cdd4b068ad56c4c */
          id?: string;
          /** @example seo_url */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/seoUrls
           */
          related?: string;
        };
      };
      /** Dynamic product streams this product belongs to based on defined filters */
      streams?: {
        data?: {
          /** @example 2f6f4768f1c2d7c8f1f54823723f1a70 */
          id?: string;
          /** @example product_stream */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/streams
           */
          related?: string;
        };
      };
      /** Tags for organizing and filtering products */
      tags?: {
        data?: {
          /** @example d57ac45256849d9b13e2422d91580fb9 */
          id?: string;
          /** @example tag */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/tags
           */
          related?: string;
        };
      };
      /** Tax configuration (rate and calculation rules) */
      tax?: {
        data?: {
          /** @example 06565e5611f23fdf8cc43e5077b92b54 */
          id?: string;
          /** @example tax */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/tax
           */
          related?: string;
        };
      };
      /** Product unit of measure (e.g., piece, liter, kg) */
      unit?: {
        data?: {
          /** @example 3e34bdebd9bd5edda27e8728904a2552 */
          id?: string;
          /** @example unit */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /product/deb10517653c255364175796ace3553f/unit
           */
          related?: string;
        };
      };
    };
    /**
     * Format: date-time
     * The release date of a product or product model. This can be used to distinguish the exact variant of a product.
     */
    releaseDate?: string;
    /**
     * Format: int64
     * The restock time in days indicates how long it will take until a sold out item is back in stock.
     */
    restockTime?: number;
    /**
     * Format: int64
     * Frequency of the product sales.
     */
    readonly sales?: number;
    /** Indicates weather the shipping price is free or not. */
    shippingFree?: boolean;
    sortedProperties?: GenericRecord;
    /** @deprecated */
    readonly states?: string[];
    /**
     * Format: int64
     * Indicates the number of products available.
     */
    stock: number;
    readonly streamIds?: string[];
    readonly tagIds?: string[];
    /** Unique identity of tax. */
    taxId: string;
    translated: {
      canonicalProductId: string;
      canonicalProductVersionId: string;
      cmsPageId: string;
      cmsPageVersionId: string;
      coverId: string;
      deliveryTimeId: string;
      description: string;
      displayGroup: string;
      ean: string;
      keywords: string;
      manufacturerId: string;
      manufacturerNumber: string;
      metaDescription: string;
      metaTitle: string;
      name: string;
      packUnit: string;
      packUnitPlural: string;
      parentId: string;
      parentVersionId: string;
      productManufacturerVersionId: string;
      productMediaVersionId: string;
      productNumber: string;
      releaseDate: string;
      taxId: string;
      type: string;
      unitId: string;
      versionId: string;
    };
    /** The type of the product, e.g., physical or digital. */
    type?: string;
    /** Unique identity of the unit. */
    unitId?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    versionId?: string;
    /**
     * Format: float
     * The weight of the product.
     */
    weight?: number;
    /**
     * Format: float
     * The width of the product.
     */
    width?: number;
  } & {
    options: {
      group: string;
      option: string;
      translated: {
        group: string;
        option: string;
      };
    }[];
  };
  ProductKeywordDictionary: {
    id?: string;
    /** The keywords that help to search the product. */
    keyword: string;
    /** Unique identity of the language. */
    languageId: string;
  };
  ProductListingCriteria: components["schemas"]["Criteria"] & {
    /** Number of items per result page. If not set, the limit will be set according to the default products per page, defined in the system settings. */
    limit?: number;
    /** Filter by manufacturers. List of manufacturer identifiers separated by a `|`. */
    manufacturer?: string;
    /**
     * Enables/disabled filtering by manufacturer. If set to false, the `manufacturer` filter will be ignored. Also the `aggregations[manufacturer]` key will be removed from the response.
     * @default true
     */
    "manufacturer-filter"?: boolean;
    /**
     * Filters by a maximum product price. Has to be higher than the `min-price` filter.
     * @default 0
     */
    "max-price"?: number;
    /**
     * Filters by a minimum product price. Has to be lower than the `max-price` filter.
     * @default 0
     */
    "min-price"?: number;
    /** Specifies the sorting of the products by `availableSortings`. If not set, the default sorting will be set according to the shop settings. The available sorting options are sent within the response under the `availableSortings` key. In order to sort by a field, consider using the `sort` parameter from the listing criteria. Do not use both parameters together, as it might lead to unexpected results. */
    order?: string;
    /**
     * Search result page
     * @default 1
     */
    p?: number;
    /**
     * Enables/disabled filtering by price. If set to false, the `min-price` and `max-price` filter will be ignored. Also the `aggregations[price]` key will be removed from the response.
     * @default true
     */
    "price-filter"?: boolean;
    /** Filters products by their properties. List of property identifiers separated by a `|`. */
    properties?: string;
    /**
     * Enables/disabled filtering by properties products. If set to false, the `properties` filter will be ignored. Also the `aggregations[properties]` key will be removed from the response.
     * @default true
     */
    "property-filter"?: boolean;
    /** A whitelist of property identifiers which can be used for filtering. List of property identifiers separated by a `|`. The `property-filter` must be `true`, otherwise the whitelist has no effect. */
    "property-whitelist"?: string;
    /** Filter products with a minimum average rating. */
    rating?: number;
    /**
     * Enables/disabled filtering by rating. If set to false, the `rating` filter will be ignored. Also the `aggregations[rating]` key will be removed from the response.
     * @default true
     */
    "rating-filter"?: boolean;
    /** By sending the parameter `reduce-aggregations` , the post-filters that were applied by the customer, are also applied to the aggregations. This has the consequence that only values are returned in the aggregations that would lead to further filter results. This parameter is a flag, the value has no effect. */
    "reduce-aggregations"?: string | null;
    /**
     * Filters products that are marked as shipping-free.
     * @default false
     */
    "shipping-free"?: boolean;
    /**
     * Enables/disabled filtering by shipping-free products. If set to false, the `shipping-free` filter will be ignored. Also the `aggregations[shipping-free]` key will be removed from the response.
     * @default true
     */
    "shipping-free-filter"?: boolean;
  };
  ProductListingFlags: {
    /** Resets all aggregations in the criteria. This parameter is a flag, the value has no effect. */
    "no-aggregations"?: string | null;
    /** If this flag is set, no products are fetched. Sorting and associations are also ignored. This parameter is a flag, the value has no effect. */
    "only-aggregations"?: string | null;
  };
  ProductListingResult: components["schemas"]["EntitySearchResult"] & {
    /** @enum {string} */
    apiAlias: "product_listing";
    /** Contains the available sorting. These can be used to show a sorting select-box in the product listing. */
    availableSortings: {
      /** @enum {string} */
      apiAlias: "product_sorting";
      key: string;
      label: string;
      priority: number;
      translated: {
        key: string;
        label: string;
      };
    }[];
    /** Contains the state of the filters. These can be used to create listing filters. */
    currentFilters: {
      manufacturer: string[];
      navigationId: string;
      price: {
        /** @default 0 */
        max: number;
        /** @default 0 */
        min: number;
      };
      properties: string[];
      rating: number | null;
      search?: string;
      /** @default false */
      "shipping-free": boolean;
    };
    elements: components["schemas"]["Product"][];
    /** @enum {string} */
    entity?: "product";
    sorting?: string;
  };
  ProductManufacturer: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    description?: string;
    id: string;
    link?: string;
    media?: components["schemas"]["Media"];
    /** Unique identity of the media. */
    mediaId?: string;
    name: string;
    translated: {
      description: string;
      link: string;
      mediaId: string;
      name: string;
      versionId: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
    versionId?: string;
  };
  ProductMeasurements: {
    height?: {
      /**
       * @default mm
       * @enum {string}
       */
      unit?: "mm" | "cm" | "m" | "in" | "ft";
      value?: number;
    };
    length?: {
      /**
       * @default mm
       * @enum {string}
       */
      unit?: "mm" | "cm" | "m" | "in" | "ft";
      value?: number;
    };
    weight?: {
      /**
       * @default kg
       * @enum {string}
       */
      unit?: "g" | "kg" | "oz" | "lb";
      value?: number;
    };
    width?: {
      /**
       * @default mm
       * @enum {string}
       */
      unit?: "mm" | "cm" | "m" | "in" | "ft";
      value?: number;
    };
  };
  ProductMedia: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    media: components["schemas"]["Media"];
    /** Unique identity of the media. */
    mediaId: string;
    /**
     * Format: int64
     * The order of the images to be displayed for a product.
     */
    position?: number;
    /** Unique identity of the product. */
    productId: string;
    productVersionId?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    versionId?: string;
  };
  ProductPrice: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ProductReview: {
    /** Detailed review about the product. */
    comment?: string;
    /** Short description or subject of the project review. */
    content: string;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /** External user name. */
    externalUser?: string;
    id: string;
    /** Unique identity of the language. */
    languageId: string;
    /**
     * Format: float
     * A floating point number given to rate a product.
     */
    points?: number;
    /** Unique identity of the product. */
    productId: string;
    productVersionId?: string;
    /** Unique identity of the sales channel. */
    salesChannelId: string;
    /** When status is set, the rating is made visible. */
    status?: boolean;
    /** Title of product review. */
    title: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ProductSearchConfig: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ProductSearchConfigField: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ProductSearchKeyword: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ProductSorting: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    key: string;
    label: string;
    /** Format: int64 */
    priority: number;
    translated: {
      key: string;
      label: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ProductStream: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    description?: string;
    id: string;
    name: string;
    translated: {
      description: string;
      name: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ProductStreamFilter: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ProductVisibility: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Promotion: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  PromotionDiscount: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  PromotionDiscountPrices: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  PromotionIndividualCode: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  PromotionSalesChannel: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  PromotionSetgroup: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  PropertyGroup: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    description?: string;
    /** Property groups can be displayed in the form of text, image, dropdown or color. */
    displayType?: string;
    /** When set to true, the property will be displayed in the product filter of product lists. */
    filterable?: boolean;
    id: string;
    name: string;
    options?: components["schemas"]["PropertyGroupOption"][];
    /** Format: int64 */
    position?: number;
    /** Sorting the property group by name or position. */
    sortingType?: string;
    translated: {
      description: string;
      displayType: string;
      name: string;
      sortingType: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
    /** When set to true, the property groups are displayed on product detail page. */
    visibleOnProductDetailPage?: boolean;
  };
  PropertyGroupOption: {
    /** Property group options can be displayed in the form of color. For example: #98e3f5ff. */
    colorHexCode?: string;
    /** Runtime field, cannot be used as part of the criteria. */
    combinable?: boolean;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    group: components["schemas"]["PropertyGroup"];
    /** Unique identity of property group. */
    groupId: string;
    id: string;
    media?: components["schemas"]["Media"];
    /** Unique identity of media. */
    mediaId?: string;
    name: string;
    option: string;
    /** Format: int64 */
    position?: number;
    translated: {
      colorHexCode: string;
      groupId: string;
      mediaId: string;
      name: string;
      option: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Query: {
    query?:
      | components["schemas"]["SimpleFilter"]
      | components["schemas"]["EqualsFilter"]
      | components["schemas"]["MultiNotFilter"]
      | components["schemas"]["RangeFilter"];
    score?: number;
  } & {
    [key: string]: unknown;
  };
  RangeFilter: {
    field: string;
    parameters: {
      gt?: number;
      gte?: number;
      lt?: number;
      lte?: number;
    };
    /** @enum {string} */
    type: "range";
  };
  ReferencePrice: {
    /** @enum {string} */
    apiAlias?: "cart_price_reference";
    hasRange: boolean;
    listPrice: components["schemas"]["ListPrice"] | null;
    price?: number;
    purchaseUnit?: number;
    referenceUnit?: number;
    regulationPrice: {
      /** @enum {string} */
      apiAlias?: "cart_regulation_price";
      price?: number;
    } | null;
    unitName: string;
    variantId?: string | null;
  };
  Rule: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /** Description of the rule. */
    description?: string;
    id?: string;
    /** Name of the rule defined. */
    name: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  RuleCondition: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  SalesChannel: {
    /** When boolean value is `true`, the sales channel is enabled. */
    active?: boolean;
    apiAlias?: string;
    configuration?: GenericRecord;
    /** Default country for the sales channel */
    country?: components["schemas"]["Country"];
    /** Unique identity of country. */
    countryId: string;
    /** Format: date-time */
    readonly createdAt?: string;
    /** Default currency for the sales channel */
    currency?: components["schemas"]["Currency"];
    /** Unique identity of currency used. */
    currencyId: string;
    /** Unique identity of customer group. */
    customerGroupId: string;
    customFields?: GenericRecord;
    /** Domain URLs configured for the sales channel */
    domains?: components["schemas"]["Domain"][];
    /** Root category for footer navigation */
    footerCategory?: components["schemas"]["Category"];
    /** Unique identity of footer category. */
    footerCategoryId?: string;
    footerCategoryVersionId?: string;
    /** When set to true, the sales channel pages are available in different languages. */
    hreflangActive?: boolean;
    hreflangDefaultDomain?: components["schemas"]["SalesChannelDomain"];
    /** Unique identity of hreflangDefaultDomain. */
    hreflangDefaultDomainId?: string;
    /** Format: uuid */
    id: string;
    /** Default language for the sales channel */
    language?: components["schemas"]["Language"];
    /** Unique identity of language used. */
    languageId: string;
    /** Unique identity of mail header and footer. */
    mailHeaderFooterId?: string;
    /** When `true`, it indicates that the sales channel is undergoing maintenance, and shopping is temporarily unavailable during this period. */
    maintenance?: boolean;
    measurementUnits?: components["schemas"]["MeasurementUnits"];
    name: string;
    /** Root category for navigation menu */
    navigationCategory?: components["schemas"]["Category"];
    /**
     * Format: int64
     * It determines the number of levels of subcategories in the storefront category menu.
     */
    navigationCategoryDepth?: number;
    /** Unique identity of navigation category. */
    navigationCategoryId: string;
    navigationCategoryVersionId?: string;
    /** Default payment method for the sales channel */
    paymentMethod?: components["schemas"]["PaymentMethod"];
    /** Unique identity of payment method used. */
    paymentMethodId: string;
    /** Root category for service pages */
    serviceCategory?: components["schemas"]["Category"];
    /** Unique identity of service category. */
    serviceCategoryId?: string;
    serviceCategoryVersionId?: string;
    /** Default shipping method for the sales channel */
    shippingMethod?: components["schemas"]["ShippingMethod"];
    /** Unique identity of shipping method. */
    shippingMethodId: string;
    /** A short name for sales channel. */
    shortName?: string;
    /** Tax calculation types are `horizontal` and `vertical`. */
    taxCalculationType?: string;
    translated: [];
    /** Format: date-time */
    readonly updatedAt?: string | null;
  };
  SalesChannelAnalytics: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  SalesChannelContext: {
    /** @enum {string} */
    apiAlias: "sales_channel_context";
    /** Core context with general configuration values and state */
    context?: {
      currencyFactor?: number;
      currencyId?: string;
      /** Format: int32 */
      currencyPrecision?: number;
      languageIdChain?: string[];
      scope?: string;
      source?: {
        salesChannelId: string;
        /** @enum {string} */
        type: "sales-channel" | "shop-api";
      };
      taxState?: string;
      useCache?: boolean;
      versionId?: string;
    };
    currency?: components["schemas"]["Currency"];
    /** Customer group of the current user */
    currentCustomerGroup?: {
      displayGross?: boolean;
      name?: string;
    };
    customer?: null | components["schemas"]["Customer"];
    /** Fallback group if the default customer group is not applicable */
    fallbackCustomerGroup?: {
      displayGross?: boolean;
      name?: string;
    };
    itemRounding: {
      /** @enum {string} */
      apiAlias: "shopware_core_framework_data_abstraction_layer_pricing_cash_rounding_config";
      /** Format: int32 */
      decimals: number;
      /** Format: float */
      interval: number;
      roundForNet: boolean;
    };
    languageInfo: {
      localeCode: string;
      name: string;
    };
    measurementSystem?: components["schemas"]["ContextMeasurementSystemInfo"];
    paymentMethod?: components["schemas"]["PaymentMethod"];
    salesChannel: components["schemas"]["SalesChannel"];
    shippingLocation?: {
      address?: components["schemas"]["CustomerAddress"];
      /** @enum {string} */
      apiAlias?: "cart_delivery_shipping_location";
      country?: components["schemas"]["Country"];
    };
    shippingMethod?: components["schemas"]["ShippingMethod"];
    /** Currently active tax rules and/or rates */
    taxRules?: {
      name?: string;
      /** Format: float */
      taxRate?: number;
    }[];
    /** Context the user session */
    token?: string;
    totalRounding: {
      /** @enum {string} */
      apiAlias: "shopware_core_framework_data_abstraction_layer_pricing_cash_rounding_config";
      /** Format: int32 */
      decimals: number;
      /** Format: float */
      interval: number;
      roundForNet: boolean;
    };
  };
  SalesChannelDomain: {
    /** Format: date-time */
    readonly createdAt?: string;
    currency?: components["schemas"]["Currency"];
    /** Unique identity of currency. */
    currencyId: string;
    customFields?: GenericRecord;
    /** This is used to toggle the language configurations, say between DE and DE-DE for instance. */
    hreflangUseOnlyLocale?: boolean;
    id: string;
    language?: components["schemas"]["Language"];
    /** Unique identity of language used. */
    languageId: string;
    measurementUnits?: components["schemas"]["MeasurementUnits"];
    salesChannelDefaultHreflang?: components["schemas"]["SalesChannel"];
    /** Unique identity of sales channel. */
    salesChannelId: string;
    /** Unique identity of snippet set. */
    snippetSetId: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    /** URL of the sales channel domain. */
    url: string;
  };
  SalesChannelType: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Salutation: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    displayName: string;
    id: string;
    letterName: string;
    /** Technical name given to salutation. For example: mr */
    salutationKey: string;
    translated: {
      displayName: string;
      letterName: string;
      salutationKey: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  SalutationJsonApi: components["schemas"]["resource"] & {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    displayName: string;
    id: string;
    letterName: string;
    /** Technical name given to salutation. For example: mr */
    salutationKey: string;
    translated: {
      displayName: string;
      letterName: string;
      salutationKey: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ScheduledTask: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Script: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  SeoUrl: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /** Runtime field, cannot be used as part of the criteria. */
    error?: string;
    /** The key that references to product or category entity ID. */
    foreignKey: string;
    id: string;
    /** When set to true, search redirects to the main URL. */
    isCanonical?: boolean;
    /** When set to true, the URL is deleted and cannot be used any more but it is still available on table and can be restored later. */
    isDeleted?: boolean;
    /** When boolean value is `true`, the seo url is changed. */
    isModified?: boolean;
    /** Unique identity of language. */
    languageId: string;
    /** Path to product URL. For example: \\"/detail/bbf36734504741c79a3bbe3795b91564\\" */
    pathInfo: string;
    /**
     * A destination routeName that has been registered somewhere in the app's router. For example: \\"frontend.detail.page\\"
     * @enum {string}
     */
    routeName:
      | "frontend.navigation.page"
      | "frontend.landing.page"
      | "frontend.detail.page";
    /** Unique identity of sales channel. */
    salesChannelId?: string;
    /** Seo path to product. For example: \\"Pepper-white-ground-pearl/SW10098\\" */
    seoPathInfo: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    /** Runtime field, cannot be used as part of the criteria. */
    url?: string;
  };
  SeoUrlJsonApi: components["schemas"]["resource"] & {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /** Runtime field, cannot be used as part of the criteria. */
    error?: string;
    /** The key that references to product or category entity ID. */
    foreignKey: string;
    id: string;
    /** When set to true, search redirects to the main URL. */
    isCanonical?: boolean;
    /** When set to true, the URL is deleted and cannot be used any more but it is still available on table and can be restored later. */
    isDeleted?: boolean;
    /** When boolean value is `true`, the seo url is changed. */
    isModified?: boolean;
    /** Unique identity of language. */
    languageId: string;
    /** Path to product URL. For example: \\"/detail/bbf36734504741c79a3bbe3795b91564\\" */
    pathInfo: string;
    /** A destination routeName that has been registered somewhere in the app's router. For example: \\"frontend.detail.page\\" */
    routeName: string;
    /** Unique identity of sales channel. */
    salesChannelId?: string;
    /** Seo path to product. For example: \\"Pepper-white-ground-pearl/SW10098\\" */
    seoPathInfo: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    /** Runtime field, cannot be used as part of the criteria. */
    url?: string;
  };
  SeoUrlTemplate: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id?: string;
    /** Created SEO URL template can be made usable by setting `isValid` to true. */
    isValid?: boolean;
    /** Unique identity of sales channel. */
    salesChannelId?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ShippingMethod: {
    /** When boolean value is `true`, the shipping methods are available for selection in the storefront. */
    active?: boolean;
    /** Rule defining when this shipping method is available */
    availabilityRule?: components["schemas"]["Rule"];
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /** Estimated delivery time information */
    deliveryTime?: components["schemas"]["DeliveryTime"];
    /** Unique identity of deliveryTime. */
    deliveryTimeId: string;
    description?: string;
    id: string;
    /** Shipping method logo or carrier image */
    media?: components["schemas"]["Media"];
    /** Unique identity of media. */
    mediaId?: string;
    name: string;
    /**
     * Format: int64
     * The order of the tabs of your defined shipping methods in the storefront by entering numerical values like 1,2,3, etc.
     */
    position?: number;
    /** Shipping prices based on weight, volume, or cart value */
    prices?: components["schemas"]["ShippingMethodPrice"][];
    /** Tags for organizing shipping methods */
    tags?: components["schemas"]["Tag"][];
    /** Tax configuration for shipping costs */
    tax?: components["schemas"]["Tax"];
    /** Refers `Free`, `Net` or `Gross` type of taxes. */
    taxType?: string;
    technicalName: string;
    trackingUrl?: string;
    translated: {
      deliveryTimeId: string;
      description: string;
      mediaId: string;
      name: string;
      taxType: string;
      technicalName: string;
      trackingUrl: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ShippingMethodJsonApi: components["schemas"]["resource"] & {
    /** When boolean value is `true`, the shipping methods are available for selection in the storefront. */
    active?: boolean;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    /** Unique identity of deliveryTime. */
    deliveryTimeId: string;
    description?: string;
    id: string;
    /** Unique identity of media. */
    mediaId?: string;
    name: string;
    /**
     * Format: int64
     * The order of the tabs of your defined shipping methods in the storefront by entering numerical values like 1,2,3, etc.
     */
    position?: number;
    relationships?: {
      /** Rule defining when this shipping method is available */
      availabilityRule?: {
        data?: {
          /** @example 9fbb7961d1cb158094924c679e1b302c */
          id?: string;
          /** @example rule */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /shipping-method/d72e7a227a27328b28342b32fc66b6bf/availabilityRule
           */
          related?: string;
        };
      };
      /** Estimated delivery time information */
      deliveryTime?: {
        data?: {
          /** @example 8c888ae25a7bd42057370e31f7e01044 */
          id?: string;
          /** @example delivery_time */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /shipping-method/d72e7a227a27328b28342b32fc66b6bf/deliveryTime
           */
          related?: string;
        };
      };
      /** Shipping method logo or carrier image */
      media?: {
        data?: {
          /** @example 62933a2951ef01f4eafd9bdf4d3cd2f0 */
          id?: string;
          /** @example media */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /shipping-method/d72e7a227a27328b28342b32fc66b6bf/media
           */
          related?: string;
        };
      };
      /** Shipping prices based on weight, volume, or cart value */
      prices?: {
        data?: {
          /** @example afae32efe0f84fece3f96b377b768b33 */
          id?: string;
          /** @example shipping_method_price */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /shipping-method/d72e7a227a27328b28342b32fc66b6bf/prices
           */
          related?: string;
        };
      };
      /** Tags for organizing shipping methods */
      tags?: {
        data?: {
          /** @example d57ac45256849d9b13e2422d91580fb9 */
          id?: string;
          /** @example tag */
          type?: string;
        }[];
        links?: {
          /**
           * Format: uri-reference
           * @example /shipping-method/d72e7a227a27328b28342b32fc66b6bf/tags
           */
          related?: string;
        };
      };
      /** Tax configuration for shipping costs */
      tax?: {
        data?: {
          /** @example 06565e5611f23fdf8cc43e5077b92b54 */
          id?: string;
          /** @example tax */
          type?: string;
        };
        links?: {
          /**
           * Format: uri-reference
           * @example /shipping-method/d72e7a227a27328b28342b32fc66b6bf/tax
           */
          related?: string;
        };
      };
    };
    /** Refers `Free`, `Net` or `Gross` type of taxes. */
    taxType?: string;
    technicalName: string;
    trackingUrl?: string;
    translated: {
      deliveryTimeId: string;
      description: string;
      mediaId: string;
      name: string;
      taxType: string;
      technicalName: string;
      trackingUrl: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ShippingMethodPageRouteResponse: {
    active?: boolean;
    availabilityRule?: {
      description?: string;
      invalid?: boolean;
      name?: string;
      /** Format: int32 */
      priority?: number;
    };
    availabilityRuleId?: string;
    deliveryTime?: {
      /** Format: int32 */
      max?: number;
      /** Format: int32 */
      min?: number;
      name?: string;
      unit?: string;
    };
    deliveryTimeId?: string;
    description?: string;
    media?: {
      alt?: string;
      fileExtension?: string;
      fileName?: string;
      /** Format: int32 */
      fileSize?: number;
      mediaFolderId?: string;
      mediaTypeRaw?: string;
      metaDataRaw?: string;
      mimeType?: string;
      private?: boolean;
      thumbnailsRo?: string;
      title?: string;
      /** Format: date-time */
      uploadedAt?: string;
      url?: string;
      userId?: string;
    };
    mediaId?: string;
    name?: string;
    orderDeliveries?: {
      orderId?: string;
      /** Format: date-time */
      shippingDateEarliest?: string;
      /** Format: date-time */
      shippingDateLatest?: string;
      shippingMethodId?: string;
      shippingOrderAddressId?: string;
      stateId?: string;
    }[];
    prices?: {
      /** Format: int32 */
      calculation?: number;
      calculationRuleId?: string;
      currencyId?: string;
      /** Format: float */
      price?: number;
      /** Format: float */
      quantityEnd?: number;
      /** Format: float */
      quantityStart?: number;
      ruleId?: string;
      shippingMethodId?: string;
    }[];
    salesChannelDefaultAssignments?: {
      accessKey?: string;
      active?: boolean;
      countryId?: string;
      currencyId?: string;
      customerGroupId?: string;
      footerCategoryId?: string;
      hreflangActive?: boolean;
      hreflangDefaultDomainId?: string;
      languageId?: string;
      mailHeaderFooterId?: string;
      maintenance?: boolean;
      maintenanceIpWhitelist?: string;
      name?: string;
      /** Format: int32 */
      navigationCategoryDepth?: number;
      navigationCategoryId?: string;
      paymentMethodId?: string;
      serviceCategoryId?: string;
      shippingMethodId?: string;
      shortName?: string;
      typeId?: string;
    }[];
    salesChannels?: {
      accessKey?: string;
      active?: boolean;
      countryId?: string;
      currencyId?: string;
      customerGroupId?: string;
      footerCategoryId?: string;
      hreflangActive?: boolean;
      hreflangDefaultDomainId?: string;
      languageId?: string;
      mailHeaderFooterId?: string;
      maintenance?: boolean;
      maintenanceIpWhitelist?: string;
      name?: string;
      /** Format: int32 */
      navigationCategoryDepth?: number;
      navigationCategoryId?: string;
      paymentMethodId?: string;
      serviceCategoryId?: string;
      shippingMethodId?: string;
      shortName?: string;
      typeId?: string;
    }[];
    tags?: {
      name?: string;
    }[];
    translations?: {
      description?: string;
      name?: string;
      shippingMethodId?: string;
    }[];
  }[];
  ShippingMethodPrice: {
    /**
     * Format: int64
     * Shipping price calculated based on quantity, price, weight or volume of items.
     */
    calculation?: number;
    /** Unique identity of rule calculation. */
    calculationRuleId?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    currencyPrice?: components["schemas"]["Price"][];
    customFields?: GenericRecord;
    id: string;
    /**
     * Format: float
     * Ending range of quantity of an item.
     */
    quantityEnd?: number;
    /**
     * Format: float
     * Starting range of quantity of an item.
     */
    quantityStart?: number;
    /** Unique identity of rule. */
    ruleId?: string;
    /** Unique identity of shipping method. */
    shippingMethodId: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ShopBiteConfig: {
    /** Default delivery time in minutes */
    deliveryTime: number;
    /** Whether checkout is enabled for ShopBite */
    isCheckoutEnabled: boolean;
  };
  ShopbiteBusinessHour: {
    closingTime: string;
    /** Format: date-time */
    readonly createdAt?: string;
    /** Format: int64 */
    dayOfWeek: number;
    id: string;
    openingTime: string;
    salesChannelId: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ShopbiteHoliday: {
    /** Format: date-time */
    readonly createdAt?: string;
    /** Format: date-time */
    end: string;
    id: string;
    salesChannelId: string;
    /** Format: date-time */
    start: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  ShopbiteMultiChannelGroup: {
    /** Format: date-time */
    readonly createdAt?: string;
    id: string;
    name: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  SimpleFilter: {
    field: string;
    /** @enum {string} */
    type: "contains" | "equalsAny" | "prefix" | "suffix";
    value: string;
  };
  Sitemap: {
    /** Format: date-time */
    created: string;
    filename: string;
  };
  Snippet: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id?: string;
    /** Unique identity od snippet set. */
    setId: string;
    /** Reference to the snippet in the template. */
    translationKey: string;
    /** Format: date-time */
    readonly updatedAt?: string;
    /** Value of the key. */
    value: string;
  };
  SnippetSet: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id?: string;
    /** ISO nomenclature used to classify languages. */
    iso: string;
    /** Name of snippet set. */
    name: string;
    snippets?: components["schemas"]["Snippet"][];
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Sort: {
    field: string;
    naturalSorting?: boolean;
    /** @enum {string} */
    order: "ASC" | "DESC";
    type?: string;
  };
  StateMachine: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    states?: components["schemas"]["StateMachineState"][];
    transitions?: components["schemas"]["StateMachineTransition"][];
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  StateMachineHistory: {
    /** Format: date-time */
    readonly createdAt?: string;
    fromStateMachineState?: components["schemas"]["StateMachineState"];
    id?: string;
    toStateMachineState?: components["schemas"]["StateMachineState"];
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  StateMachineState: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id?: string;
    name: string;
    /** Technical name of StateMachineState. */
    technicalName: string;
    translated: {
      name: string;
      technicalName: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  StateMachineTransition: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  SubAggregations: {
    aggregation?:
      | components["schemas"]["AggregationMetrics"]
      | components["schemas"]["AggregationEntity"]
      | components["schemas"]["AggregationFilter"]
      | components["schemas"]["AggregationTerms"]
      | components["schemas"]["AggregationHistogram"]
      | components["schemas"]["AggregationRange"];
  };
  SuccessResponse: {
    success?: boolean;
  };
  SwagPaypalVaultToken: {
    id?: string;
    identifier?: string;
  };
  SystemConfig: {
    /** Config key for shop configurations. */
    configurationKey: string;
    configurationValue: {
      _value?: GenericRecord;
    };
    /** Format: date-time */
    readonly createdAt?: string;
    id: string;
    salesChannel?: components["schemas"]["SalesChannel"];
    /** Unique identity of sales channel. */
    salesChannelId?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Tag: {
    /** Format: date-time */
    readonly createdAt?: string;
    id: string;
    name: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Tax: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    /** Name defined for a Tax. */
    name: string;
    /**
     * Format: int64
     * The order of the tabs of your defined taxes in the storefront by entering numerical values like 1,2,3, etc. Added since version: 6.4.0.0.
     */
    position?: number;
    /**
     * Format: float
     * Rate of tax.
     */
    taxRate: number;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  TaxProvider: {
    /** When boolean value is `true`, the tax providers are available for selection in the storefront. */
    active?: boolean;
    /** Unique identity of app. */
    appId?: string;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    name: string;
    /**
     * Format: int64
     * A numerical value to prioritize one of the tax providers from the list.
     */
    priority: number;
    /** External URL makes request to get tax info. */
    processUrl?: string;
    translated: {
      appId: string;
      name: string;
      processUrl: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  TaxRule: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  TaxRuleType: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Theme: {
    active: boolean;
    author: string;
    baseConfig?: GenericRecord;
    configValues?: GenericRecord;
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    description?: string;
    helpTexts?: GenericRecord;
    id: string;
    labels?: GenericRecord;
    media?: components["schemas"]["Media"][];
    name: string;
    parentThemeId?: string;
    previewMediaId?: string;
    technicalName?: string;
    translated: {
      author: string;
      description: string;
      name: string;
      parentThemeId: string;
      previewMediaId: string;
      technicalName: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  TotalCountMode: "none" | "exact" | "next-pages";
  Unit: {
    /** Format: date-time */
    readonly createdAt?: string;
    customFields?: GenericRecord;
    id: string;
    name: string;
    shortCode: string;
    translated: {
      name: string;
      shortCode: string;
    };
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  User: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  UserAccessKey: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  UserConfig: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  UserRecovery: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  Webhook: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  WebhookEventLog: {
    /** Format: date-time */
    readonly createdAt?: string;
    id?: string;
    /** Format: date-time */
    readonly updatedAt?: string;
  };
  WishlistLoadRouteResponse: {
    products: components["schemas"]["ProductListingResult"];
    wishlist?: {
      customerId?: string;
      salesChannelId?: string;
    };
  };
  attributes: {
    [key: string]: unknown;
  };
  data: components["schemas"]["resource"] | components["schemas"]["resource"][];
  error: {
    /** An application-specific error code, expressed as a string value. */
    code?: string;
    /** A human-readable description of the problem. */
    description?: string;
    /** A human-readable explanation specific to this occurrence of the problem. */
    detail?: string;
    /** A unique identifier for this particular occurrence of the problem. */
    id?: string;
    links?: components["schemas"]["links"];
    meta?: components["schemas"]["meta"];
    source?: {
      /** A string indicating which query parameter caused the error. */
      parameter?: string;
      /** A JSON Pointer [RFC6901] to the associated entity in the request document [e.g. "/data" for a primary data object, or "/data/attributes/title" for a specific attribute]. */
      pointer?: string;
    };
    /** The HTTP status code applicable to this problem, expressed as a string value. */
    status?: string;
    /** A short, human-readable summary of the problem. It **SHOULD NOT** change from occurrence to occurrence of the problem, except for purposes of localization. */
    title?: string;
  };
  failure: {
    errors: components["schemas"]["error"][];
    links?: components["schemas"]["links"];
    meta?: components["schemas"]["meta"];
  };
  info: {
    jsonapi?: components["schemas"]["jsonapi"];
    links?: components["schemas"]["links"];
    meta: components["schemas"]["meta"];
  };
  jsonapi: {
    meta?: components["schemas"]["meta"];
    version?: string;
  };
  link:
    | string
    | {
        /**
         * Format: uri-reference
         * A string containing the link's URL.
         */
        href: string;
        meta?: components["schemas"]["meta"];
      };
  linkage: {
    id: string;
    meta?: components["schemas"]["meta"];
    type: string;
  };
  links: {
    [key: string]: components["schemas"]["link"];
  };
  meta: {
    [key: string]: unknown;
  };
  pagination: {
    /**
     * Format: uri-reference
     * The first page of data
     */
    first?: string;
    /**
     * Format: uri-reference
     * The last page of data
     */
    last?: string;
    /**
     * Format: uri-reference
     * The next page of data
     */
    next?: string;
    /**
     * Format: uri-reference
     * The previous page of data
     */
    prev?: string;
  };
  relationshipLinks: {
    related?: components["schemas"]["link"];
    self?: GenericRecord[] & components["schemas"]["link"];
  } & {
    [key: string]: unknown;
  };
  relationshipToMany: components["schemas"]["linkage"][];
  relationshipToOne: unknown & components["schemas"]["linkage"];
  relationships:
    | unknown
    | unknown
    | unknown
    | {
        /** Member, whose value represents "resource linkage". */
        data?:
          | components["schemas"]["relationshipToOne"]
          | components["schemas"]["relationshipToMany"];
        links?: components["schemas"]["relationshipLinks"];
      };
  resource: {
    attributes?: components["schemas"]["attributes"];
    id: string;
    links?: components["schemas"]["links"];
    meta?: components["schemas"]["meta"];
    relationships?: components["schemas"]["relationships"];
    type: string;
  };
  success: {
    data: components["schemas"]["data"];
    /** To reduce the number of HTTP requests, servers **MAY** allow responses that include related resources along with the requested primary resources. Such responses are called "compound documents". */
    included?: components["schemas"]["resource"][];
    /** Link members related to the primary data. */
    links?: components["schemas"]["links"] &
      components["schemas"]["pagination"];
    meta?: components["schemas"]["meta"];
  };
};
export type operations = {
  "api-info get /_info/openapi3.json": {
    contentType?: "application/json";
    accept?: "application/json";
    query?: {
      /** Type of the api */
      type?: "jsonapi" | "json";
    };
    response: {
      components?: {
        callbacks?: GenericRecord;
        examples?: GenericRecord;
        headers?: GenericRecord;
        links?: GenericRecord;
        parameters?: GenericRecord;
        pathItems?: GenericRecord;
        requestBodies?: GenericRecord;
        responses?: GenericRecord;
        schemas?: GenericRecord;
        securitySchemes?: GenericRecord;
      };
      externalDocs?: {
        description?: string;
        /** Format: uri */
        url: string;
      };
      info: {
        contact?: {
          /** Format: email */
          email?: string;
          name?: string;
          /** Format: uri */
          url?: string;
        };
        description?: string;
        license?: {
          identifier?: string;
          name: string;
          /** Format: uri */
          url?: string;
        };
        summary?: string;
        /** Format: uri */
        termsOfService?: string;
        title: string;
        version: string;
      };
      jsonSchemaDialect?: string;
      openapi: string;
      paths?: GenericRecord;
      security?: GenericRecord[];
      servers?: {
        url: string;
      }[];
      tags?: {
        description?: string;
        externalDocs?: {
          description?: string;
          /** Format: uri */
          url: string;
        };
        name: string;
      }[];
      webhooks?: GenericRecord;
    };
    responseCode: 200;
  };
  "getRoutes get /_info/routes": {
    contentType?: "application/json";
    accept?: "application/json";
    response: {
      endpoints: {
        methods: string[];
        path: string;
      }[];
    };
    responseCode: 200;
  };
  "createCustomerAddress post /account/address": {
    contentType?: "application/json";
    accept?: "application/json";
    body: components["schemas"]["CustomerAddressBody"];
    response: components["schemas"]["CustomerAddress"] &
      components["schemas"]["CustomerAddressRead"];
    responseCode: 200;
  };
  "deleteCustomerAddress delete /account/address/{addressId}": {
    contentType?: "application/json";
    accept?: "application/json";
    pathParams: {
      /** ID of the address to be deleted. */
      addressId: string;
    };
    response: never;
    responseCode: 204;
  };
  "updateCustomerAddress patch /account/address/{addressId}": {
    contentType?: "application/json";
    accept?: "application/json";
    pathParams: {
      /** Address ID */
      addressId: string;
    };
    body: components["schemas"]["CustomerAddressBody"];
    response: components["schemas"]["CustomerAddress"] &
      components["schemas"]["CustomerAddressRead"];
    responseCode: 200;
  };
  "defaultBillingAddress patch /account/address/default-billing/{addressId}": {
    contentType?: "application/json";
    accept?: "application/json";
    pathParams: {
      /** Address ID */
      addressId: string;
    };
    response: never;
    responseCode: 200;
  };
  "defaultShippingAddress patch /account/address/default-shipping/{addressId}": {
    contentType?: "application/json";
    accept?: "application/json";
    pathParams: {
      /** Address ID */
      addressId: string;
    };
    response: never;
    responseCode: 200;
  };
  "changeEmail post /account/change-email": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** New email address. Has to be unique amongst all customers */
      email: string;
      /** Confirmation of the new email address. */
      emailConfirmation: string;
      /** Customer's current password */
      password: string;
    };
    response: components["schemas"]["SuccessResponse"];
    responseCode: 200;
  };
  "changeLanguage post /account/change-language": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** New languageId */
      language?: string;
    };
    response: components["schemas"]["SuccessResponse"];
    responseCode: 200;
  };
  "changePassword post /account/change-password": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** New Password for the customer */
      newPassword: string;
      /** Confirmation of the new password */
      newPasswordConfirm: string;
      /** Current password of the customer */
      password: string;
    };
    response: components["schemas"]["SuccessResponse"];
    responseCode: 200;
  };
  "changeProfile post /account/change-profile": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** Birthday day */
      birthdayDay?: number;
      /** Birthday month */
      birthdayMonth?: number;
      /** Birthday year */
      birthdayYear?: number;
      /** Customer first name. Value will be reused for shipping and billing address if not provided explicitly. */
      firstName: string;
      /** Customer last name. Value will be reused for shipping and billing address if not provided explicitly. */
      lastName: string;
      /** Id of the salutation for the customer account. Fetch options using `salutation` endpoint. */
      salutationId?: string;
      /** (Academic) title of the customer */
      title?: string;
    } & (
      | {
          /**
           * Type of the customer account. Default value is 'private'.
           * @default private
           * @enum {string}
           */
          accountType?: "private";
          company?: null;
          vatIds?: null;
        }
      | {
          /**
           * Type of the customer account. Can be `private` or `business`.
           * @enum {string}
           */
          accountType: "business";
          /** Company of the customer. Only required when `accountType` is `business`. */
          company: string;
          /** VAT IDs of the customer's company. Only valid when `accountType` is `business`. */
          vatIds: [string, ...string[]];
        }
    );
    response: components["schemas"]["SuccessResponse"];
    responseCode: 200;
  };
  "convertGuest post /account/convert-guest": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** New Password for the customer */
      password: string;
    };
    response: components["schemas"]["SuccessResponse"];
    responseCode: 200;
  };
  "readCustomer post /account/customer": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
    };
    body?: components["schemas"]["NoneFieldsCriteria"];
    response: components["schemas"]["Customer"];
    responseCode: 200;
  };
  "deleteCustomer delete /account/customer": {
    contentType?: "application/json";
    accept?: "application/json";
    response: never;
    responseCode: 204;
  };
  "getCustomerRecoveryIsExpired post /account/customer-recovery-is-expired": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** Parameter from the link in the confirmation mail sent in Step 1 */
      hash: string;
    };
    response: {
      /** @enum {string} */
      apiAlias?: "array_struct";
      data?: {
        isExpired: boolean;
      }[];
    };
    responseCode: 200;
  };
  "listAddress post /account/list-address": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
    };
    body?: components["schemas"]["Criteria"];
    response: {
      elements: components["schemas"]["CustomerAddress"][];
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "loginCustomer post /account/login": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** Password */
      password: string;
      /** Email */
      username: string;
    };
    response: {
      /** Define the URL which browser will be redirected to */
      redirectUrl?: string;
    };
    responseCode: 200;
  };
  "imitateCustomerLogin post /account/login/imitate-customer": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** ID of the customer */
      customerId: string;
      /** Generated customer impersonation token */
      token: string;
      /** ID of the user who generated the token */
      userId: string;
    };
    response: {
      /** Define the URL which browser will be redirected to */
      redirectUrl?: string;
    };
    responseCode: 200;
  };
  "logoutCustomer post /account/logout": {
    contentType?: "application/json";
    accept?: "application/json";
    response: {
      /** Define the URL which browser will be redirected to */
      redirectUrl?: string;
    };
    responseCode: 200;
  };
  "readNewsletterRecipient post /account/newsletter-recipient": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
    };
    body?: components["schemas"]["Criteria"];
    response: components["schemas"]["AccountNewsletterRecipient"];
    responseCode: 200;
  };
  "sendRecoveryMail post /account/recovery-password": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** E-Mail address to identify the customer */
      email: string;
      /** URL of the storefront to use for the generated reset link. It has to be a domain that is configured in the sales channel domain settings. */
      storefrontUrl: string;
    };
    response: components["schemas"]["SuccessResponse"];
    responseCode: 200;
  };
  "recoveryPassword post /account/recovery-password-confirm": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** Parameter from the link in the confirmation mail sent in Step 1 */
      hash: string;
      /** New password for the customer */
      newPassword: string;
      /** Confirmation of the new password */
      newPasswordConfirm: string;
    };
    response: components["schemas"]["SuccessResponse"];
    responseCode: 200;
  };
  "register post /account/register": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** Flag indicating accepted data protection */
      acceptedDataProtection: boolean;
      /** Field can be used to store an affiliate tracking code */
      affiliateCode?: string;
      billingAddress: components["schemas"]["CustomerAddress"];
      /** Birthday day */
      birthdayDay?: number;
      /** Birthday month */
      birthdayMonth?: number;
      /** Birthday year */
      birthdayYear?: number;
      /** Field can be used to store a campaign tracking code */
      campaignCode?: string;
      /** Email of the customer. Has to be unique, unless `guest` is `true` */
      email: string;
      /** Customer first name. Value will be reused for shipping and billing address if not provided explicitly. */
      firstName: string;
      /**
       * If set, will create a guest customer. Guest customers can re-use an email address and don't need a password.
       * @default false
       */
      guest?: boolean;
      /** Customer last name. Value will be reused for shipping and billing address if not provided explicitly. */
      lastName: string;
      /** Password for the customer. Required, unless `guest` is `true` */
      password: string;
      /** Id of the salutation for the customer account. Fetch options using `salutation` endpoint. */
      salutationId?: string;
      shippingAddress?: components["schemas"]["CustomerAddress"];
      /** URL of the storefront for that registration. Used in confirmation emails. Has to be one of the configured domains of the sales channel. */
      storefrontUrl: string;
      /** (Academic) title of the customer */
      title?: string;
    } & (
      | {
          /**
           * Type of the customer account. Default value is 'private'.
           * @default private
           * @enum {string}
           */
          accountType?: "private";
          company?: null;
          vatIds?: null;
        }
      | {
          /**
           * Type of the customer account. Can be `private` or `business`.
           * @enum {string}
           */
          accountType: "business";
          /** Company of the customer. Only required when `accountType` is `business`. */
          company: string;
          /** VAT IDs of the customer's company. Only valid when `accountType` is `business`. */
          vatIds: [string, ...string[]];
        }
    );
    response: components["schemas"]["Customer"];
    responseCode: 200;
  };
  "registerConfirm post /account/register-confirm": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** Email hash from the email received */
      em: string;
      /** Hash from the email received */
      hash: string;
    };
    response: never;
    responseCode: 200;
  };
  "generateJWTAppSystemAppServer post /app-system/{name}/generate-token": {
    contentType?: "application/json";
    accept?: "application/json";
    pathParams: {
      /** Name of the app */
      name: string;
    };
    body?: GenericRecord;
    response: {
      /** Format: date-time */
      expires?: string;
      shopId?: string;
      token?: string;
    };
    responseCode: 200;
  };
  "readBreadcrumb get /breadcrumb/{id}": {
    contentType?: "application/json";
    accept?: "application/json";
    query?: {
      /** UUID for referrer category only used for product breadcrumb */
      referrerCategoryId?: string;
      /** Type: category or product (optional - default: product) */
      type?: "product" | "category";
    };
    pathParams: {
      /** UUID for product or category */
      id: string;
    };
    response: components["schemas"]["BreadcrumbCollection"];
    responseCode: 200;
  };
  "readCategoryListGet get /category": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** Compressed and encoded criteria object. Format: base64url(gzip(json_encode(criteria))). This parameter allows passing complex criteria as a single encoded string instead of multiple query parameters. The criteria object should be JSON-encoded, then gzipped, and finally base64url-encoded. The criteria object structure is defined in the Criteria schema (see #/components/schemas/Criteria). */
      _criteria?: components["parameters"]["CompressedCriteria"];
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** Fields which should be returned in the search result. */
      "fields[]"?: components["parameters"]["criteriaFields"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page */
      limit?: components["parameters"]["criteriaLimit"];
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    response: {
      elements?: components["schemas"]["Category"][];
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "readCategoryList post /category": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    body?: components["schemas"]["Criteria"];
    response: {
      elements?: components["schemas"]["Category"][];
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "readCategoryGet get /category/{navigationId}": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to try and resolve SEO URLs for the given navigation item */
      "sw-include-seo-urls"?: boolean;
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** Fields which should be returned in the search result. */
      "fields[]"?: components["parameters"]["criteriaFields"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page. If not set, the limit will be set according to the default products per page, defined in the system settings. */
      limit?: number;
      /** Filter by manufacturers. List of manufacturer identifiers separated by a `|`. */
      manufacturer?: string;
      /** Filters by a maximum product price. Has to be higher than the `min-price` filter. */
      "max-price"?: number;
      /** Filters by a minimum product price. Has to be lower than the `max-price` filter. */
      "min-price"?: number;
      /** Specifies the sorting of the products by `availableSortings`. If not set, the default sorting will be set according to the shop settings. The available sorting options are sent within the response under the `availableSortings` key. In order to sort by a field, consider using the `sort` parameter from the listing criteria. Do not use both parameters together, as it might lead to unexpected results. */
      order?: string;
      /** Search result page */
      p?: number;
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** Filters products by their properties. List of property identifiers separated by a `|`. */
      properties?: string;
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Filter products with a minimum average rating. */
      rating?: number;
      /** By sending the parameter `reduce-aggregations` , the post-filters that were applied by the customer, are also applied to the aggregations. This has the consequence that only values are returned in the aggregations that would lead to further filter results. This parameter is a flag, the value has no effect. */
      "reduce-aggregations"?: string | null;
      /** Filters products that are marked as shipping-free. */
      "shipping-free"?: boolean;
      /** Resolves only the given slot identifiers. The identifiers have to be seperated by a '|' character */
      slots?: string;
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    pathParams: {
      /** Identifier of the category to be fetched */
      navigationId: string;
    };
    response: components["schemas"]["Category"];
    responseCode: 200;
  };
  "readCategory post /category/{navigationId}": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to try and resolve SEO URLs for the given navigation item */
      "sw-include-seo-urls"?: boolean;
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** Resolves only the given slot identifiers. The identifiers have to be seperated by a '|' character */
      slots?: string;
    };
    pathParams: {
      /** Identifier of the category to be fetched */
      navigationId: string;
    };
    body: components["schemas"]["ProductListingCriteria"];
    response: components["schemas"]["Category"];
    responseCode: 200;
  };
  "readCart get /checkout/cart": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    response: components["schemas"]["Cart"];
    responseCode: 200;
  };
  "deleteCart delete /checkout/cart": {
    contentType?: "application/json";
    accept?: "application/json";
    response: components["schemas"]["SuccessResponse"];
    responseCode: 204;
  };
  "addLineItem post /checkout/cart/line-item": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    body: {
      items: (
        | {
            id: string;
            quantity: number;
            referencedId?: string;
            /** @enum {string} */
            type: "product" | "custom" | "credit" | "discount" | "container";
          }
        | {
            id?: string;
            quantity?: number;
            referencedId: string;
            /** @enum {string} */
            type: "promotion";
          }
      )[];
    };
    response: components["schemas"]["Cart"];
    responseCode: 200;
  };
  "removeLineItemDeprecated delete /checkout/cart/line-item": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query: {
      /** A list of product identifiers. */
      ids: string[];
    };
    response: components["schemas"]["Cart"];
    responseCode: 200;
  };
  "updateLineItem patch /checkout/cart/line-item": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    body: {
      items: [
        {
          id: string;
          quantity: number;
        },
        ...{
          id: string;
          quantity: number;
        }[],
      ];
    };
    response: components["schemas"]["Cart"];
    responseCode: 200;
  };
  "removeLineItem post /checkout/cart/line-item/delete": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    body: {
      /** A list of product identifiers. */
      ids: [string, ...string[]];
    };
    response: components["schemas"]["Cart"];
    responseCode: 200;
  };
  "checkoutGateway get /checkout/gateway": {
    contentType?: "application/json";
    accept?: "application/json";
    response: {
      errors?: {
        /** If the error is blocking */
        blocking?: boolean;
        /** Error code */
        code?: string;
        /** Error detail */
        detail?: string;
      }[];
      paymentMethods?: {
        /** aggregation result */
        aggregations?: GenericRecord;
        elements?: components["schemas"]["PaymentMethod"][];
        /** Total amount */
        total?: number;
      };
      shippingMethods?: {
        /** aggregation result */
        aggregations?: GenericRecord;
        elements?: components["schemas"]["ShippingMethod"][];
        /** Total amount */
        total?: number;
      };
    };
    responseCode: 200;
  };
  "createOrder post /checkout/order": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    body: {
      /** The affiliate code can be used to track which referrer the customer came through. An example could be `Price-comparison-company-XY`. */
      affiliateCode?: string;
      /** The campaign code is used to track which action the customer came from. An example could be `Summer-Deals` */
      campaignCode?: string;
      /** Adds a comment from the customer to the order. */
      customerComment?: string;
    };
    response: components["schemas"]["Order"];
    responseCode: 200;
  };
  "readCmsGet get /cms/{id}": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** Fields which should be returned in the search result. */
      "fields[]"?: components["parameters"]["criteriaFields"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page. If not set, the limit will be set according to the default products per page, defined in the system settings. */
      limit?: number;
      /** Filter by manufacturers. List of manufacturer identifiers separated by a `|`. */
      manufacturer?: string;
      /** Filters by a maximum product price. Has to be higher than the `min-price` filter. */
      "max-price"?: number;
      /** Filters by a minimum product price. Has to be lower than the `max-price` filter. */
      "min-price"?: number;
      /** Specifies the sorting of the products by `availableSortings`. If not set, the default sorting will be set according to the shop settings. The available sorting options are sent within the response under the `availableSortings` key. In order to sort by a field, consider using the `sort` parameter from the listing criteria. Do not use both parameters together, as it might lead to unexpected results. */
      order?: string;
      /** Search result page */
      p?: number;
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** Filters products by their properties. List of property identifiers separated by a `|`. */
      properties?: string;
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Filter products with a minimum average rating. */
      rating?: number;
      /** By sending the parameter `reduce-aggregations` , the post-filters that were applied by the customer, are also applied to the aggregations. This has the consequence that only values are returned in the aggregations that would lead to further filter results. This parameter is a flag, the value has no effect. */
      "reduce-aggregations"?: string | null;
      /** Filters products that are marked as shipping-free. */
      "shipping-free"?: boolean;
      /** Resolves only the given slot identifiers. The identifiers have to be seperated by a `|` character. */
      slots?: string;
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    pathParams: {
      /** Identifier of the CMS page to be resolved */
      id: string;
    };
    response: components["schemas"]["CmsPage"];
    responseCode: 200;
  };
  "readCms post /cms/{id}": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    pathParams: {
      /** Identifier of the CMS page to be resolved */
      id: string;
    };
    body: {
      /** Resolves only the given slot identifiers. The identifiers have to be seperated by a `|` character. */
      slots?: string;
    } & components["schemas"]["ProductListingCriteria"];
    response: components["schemas"]["CmsPage"];
    responseCode: 200;
  };
  "sendContactMail post /contact-form": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    body: {
      /** Type of the content management page */
      cmsPageType?: string;
      /** The message of the contact form */
      comment: string;
      /** Email address */
      email: string;
      /** Entity name for slot config */
      entityName?: string;
      /** Firstname. This field may be required depending on the system settings. */
      firstName?: string;
      /** Lastname. This field may be required depending on the system settings. */
      lastName?: string;
      /** Identifier of the navigation page. Can be used to override the configuration.
       *     Take a look at the settings of a category containing a concat form in the administration. */
      navigationId?: string;
      /** Phone. This field may be required depending on the system settings. */
      phone?: string;
      /** Identifier of the salutation. Use `/api/salutation` endpoint to fetch possible values. */
      salutationId?: string;
      /** Identifier of the cms element */
      slotId?: string;
      /** The subject of the contact form. */
      subject: string;
    };
    response: never;
    responseCode: 200;
  };
  "readContext get /context": {
    contentType?: "application/json";
    accept?: "application/json";
    response: components["schemas"]["SalesChannelContext"];
    responseCode: 200;
  };
  "updateContext patch /context": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** Billing Address */
      billingAddressId?: string;
      /** Country */
      countryId?: string;
      /** Country State */
      countryStateId?: string;
      /** Currency */
      currencyId?: string;
      /** Language */
      languageId?: string;
      /** Payment Method */
      paymentMethodId?: string;
      /** Shipping Address */
      shippingAddressId?: string;
      /** Shipping Method */
      shippingMethodId?: string;
    };
    response: {
      /** Define the URL which browser will be redirected to */
      redirectUrl?: string;
    };
    responseCode: 200;
  };
  "contextGatewayGet get /context/gateway": {
    contentType?: "application/json";
    accept?: "application/json";
    query: {
      appName: string;
      data?: GenericRecord;
    };
    response: {
      /** Define the URL which browser will be redirected to */
      redirectUrl?: string;
    };
    responseCode: 200;
  };
  "contextGateway post /context/gateway": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      appName: string;
      data?: GenericRecord;
    };
    response: {
      /** Define the URL which browser will be redirected to */
      redirectUrl?: string;
    };
    responseCode: 200;
  };
  "readCookieGroups get /cookie-groups": {
    contentType?: "application/json";
    accept?: "application/json";
    response: components["schemas"]["CookieRouteResponse"];
    responseCode: 200;
  };
  "readCountryGet get /country": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** Compressed and encoded criteria object. Format: base64url(gzip(json_encode(criteria))). This parameter allows passing complex criteria as a single encoded string instead of multiple query parameters. The criteria object should be JSON-encoded, then gzipped, and finally base64url-encoded. The criteria object structure is defined in the Criteria schema (see #/components/schemas/Criteria). */
      _criteria?: components["parameters"]["CompressedCriteria"];
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** Fields which should be returned in the search result. */
      "fields[]"?: components["parameters"]["criteriaFields"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page */
      limit?: components["parameters"]["criteriaLimit"];
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    response: {
      elements?: components["schemas"]["Country"][];
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "readCountry post /country": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    body?: components["schemas"]["Criteria"];
    response: {
      elements?: components["schemas"]["Country"][];
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "readCountryStateGet get /country-state/{countryId}": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** Compressed and encoded criteria object. Format: base64url(gzip(json_encode(criteria))). This parameter allows passing complex criteria as a single encoded string instead of multiple query parameters. The criteria object should be JSON-encoded, then gzipped, and finally base64url-encoded. The criteria object structure is defined in the Criteria schema (see #/components/schemas/Criteria). */
      _criteria?: components["parameters"]["CompressedCriteria"];
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** Fields which should be returned in the search result. */
      "fields[]"?: components["parameters"]["criteriaFields"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page */
      limit?: components["parameters"]["criteriaLimit"];
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    pathParams: {
      countryId: string;
    };
    response: {
      elements?: components["schemas"]["CountryState"][];
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "readCountryState post /country-state/{countryId}": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    pathParams: {
      countryId: string;
    };
    body?: components["schemas"]["Criteria"];
    response: {
      elements?: components["schemas"]["CountryState"][];
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "readCurrencyGet get /currency": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** Compressed and encoded criteria object. Format: base64url(gzip(json_encode(criteria))). This parameter allows passing complex criteria as a single encoded string instead of multiple query parameters. The criteria object should be JSON-encoded, then gzipped, and finally base64url-encoded. The criteria object structure is defined in the NoneFieldsCriteria schema (see #/components/schemas/NoneFieldsCriteria). */
      _criteria?: components["parameters"]["CompressedNoneFieldsCriteria"];
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page */
      limit?: components["parameters"]["criteriaLimit"];
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    response: components["schemas"]["Currency"][];
    responseCode: 200;
  };
  "readCurrency post /currency": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    body?: components["schemas"]["NoneFieldsCriteria"];
    response: components["schemas"]["Currency"][];
    responseCode: 200;
  };
  "getCustomerGroupRegistrationInfo get /customer-group-registration/config/{customerGroupId}": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    pathParams: {
      /** Customer group id */
      customerGroupId: string;
    };
    response: components["schemas"]["CustomerGroup"];
    responseCode: 200;
  };
  "readCustomerWishlist post /customer/wishlist": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    body?: components["schemas"]["Criteria"];
    response: components["schemas"]["WishlistLoadRouteResponse"];
    responseCode: 200;
  };
  "addProductOnWishlist post /customer/wishlist/add/{productId}": {
    contentType?: "application/json";
    accept?: "application/json";
    pathParams: {
      /** Identifier of the product to be added. */
      productId: string;
    };
    response: components["schemas"]["SuccessResponse"];
    responseCode: 200;
  };
  "deleteProductOnWishlist delete /customer/wishlist/delete/{productId}": {
    contentType?: "application/json";
    accept?: "application/json";
    pathParams: {
      /** The identifier of the product to be removed from the wishlist. */
      productId: string;
    };
    response: components["schemas"]["SuccessResponse"];
    responseCode: 200;
  };
  "mergeProductOnWishlist post /customer/wishlist/merge": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** List product id */
      productIds?: string[];
    };
    response: components["schemas"]["SuccessResponse"];
    responseCode: 200;
  };
  "downloadGet get /document/download/{documentId}/{deepLinkCode}":
    | {
        contentType?: "application/json";
        accept: "application/pdf";
        headers?: {
          /** If a document is rendered on the fly the provided language id is added to fallback languages while the order language has priority. It does not change already generated documents. */
          "sw-language-id"?: string;
        };
        query?: {
          /** Required for guest orders to verify the user; ignored for orders with logged-in user. */
          email?: string;
          /** Required for guest orders to verify the user; ignored for orders with logged-in user. */
          zipcode?: string;
        };
        pathParams: {
          deepLinkCode: string;
          documentId: string;
        };
        response: Blob;
        responseCode: 200;
      }
    | {
        contentType?: "application/json";
        accept: "application/xml";
        headers?: {
          /** If a document is rendered on the fly the provided language id is added to fallback languages while the order language has priority. It does not change already generated documents. */
          "sw-language-id"?: string;
        };
        query?: {
          /** Required for guest orders to verify the user; ignored for orders with logged-in user. */
          email?: string;
          /** Required for guest orders to verify the user; ignored for orders with logged-in user. */
          zipcode?: string;
        };
        pathParams: {
          deepLinkCode: string;
          documentId: string;
        };
        response: string;
        responseCode: 200;
      }
    | {
        contentType?: "application/json";
        accept: "text/html";
        headers?: {
          /** If a document is rendered on the fly the provided language id is added to fallback languages while the order language has priority. It does not change already generated documents. */
          "sw-language-id"?: string;
        };
        query?: {
          /** Required for guest orders to verify the user; ignored for orders with logged-in user. */
          email?: string;
          /** Required for guest orders to verify the user; ignored for orders with logged-in user. */
          zipcode?: string;
        };
        pathParams: {
          deepLinkCode: string;
          documentId: string;
        };
        response: string;
        responseCode: 200;
      }
    | {
        contentType?: "application/json";
        accept?: "application/json";
        headers?: {
          /** If a document is rendered on the fly the provided language id is added to fallback languages while the order language has priority. It does not change already generated documents. */
          "sw-language-id"?: string;
        };
        query?: {
          /** Required for guest orders to verify the user; ignored for orders with logged-in user. */
          email?: string;
          /** Required for guest orders to verify the user; ignored for orders with logged-in user. */
          zipcode?: string;
        };
        pathParams: {
          deepLinkCode: string;
          documentId: string;
        };
        response: never;
        responseCode: 204;
      };
  "download post /document/download/{documentId}/{deepLinkCode}":
    | {
        contentType?: "application/json";
        accept: "application/pdf";
        headers?: {
          /** If a document is rendered on the fly the provided language id is added to fallback languages while the order language has priority. It does not change already generated documents. */
          "sw-language-id"?: string;
        };
        pathParams: {
          deepLinkCode: string;
          documentId: string;
        };
        body?: {
          email?: string;
          zipcode?: string;
        };
        response: Blob;
        responseCode: 200;
      }
    | {
        contentType?: "application/json";
        accept: "application/xml";
        headers?: {
          /** If a document is rendered on the fly the provided language id is added to fallback languages while the order language has priority. It does not change already generated documents. */
          "sw-language-id"?: string;
        };
        pathParams: {
          deepLinkCode: string;
          documentId: string;
        };
        body?: {
          email?: string;
          zipcode?: string;
        };
        response: string;
        responseCode: 200;
      }
    | {
        contentType?: "application/json";
        accept: "text/html";
        headers?: {
          /** If a document is rendered on the fly the provided language id is added to fallback languages while the order language has priority. It does not change already generated documents. */
          "sw-language-id"?: string;
        };
        pathParams: {
          deepLinkCode: string;
          documentId: string;
        };
        body?: {
          email?: string;
          zipcode?: string;
        };
        response: string;
        responseCode: 200;
      }
    | {
        contentType?: "application/json";
        accept?: "application/json";
        headers?: {
          /** If a document is rendered on the fly the provided language id is added to fallback languages while the order language has priority. It does not change already generated documents. */
          "sw-language-id"?: string;
        };
        pathParams: {
          deepLinkCode: string;
          documentId: string;
        };
        body?: {
          email?: string;
          zipcode?: string;
        };
        response: never;
        responseCode: 204;
      };
  "handlePaymentMethodGet get /handle-payment": {
    contentType?: "application/json";
    accept?: "application/json";
    query: {
      /** URL to which the client should be redirected after erroneous payment */
      errorUrl?: string;
      /** URL to which the client should be redirected after successful payment */
      finishUrl?: string;
      /** Identifier of an order */
      orderId: string;
    };
    response: {
      redirectUrl: string;
    };
    responseCode: 200;
  };
  "handlePaymentMethod post /handle-payment": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** URL to which the client should be redirected after erroneous payment */
      errorUrl?: string;
      /** URL to which the client should be redirected after successful payment */
      finishUrl?: string;
      /** Identifier of an order */
      orderId: string;
    };
    response: {
      redirectUrl: string;
    };
    responseCode: 200;
  };
  "readLandingPageGet get /landing-page/{landingPageId}": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** Fields which should be returned in the search result. */
      "fields[]"?: components["parameters"]["criteriaFields"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page. If not set, the limit will be set according to the default products per page, defined in the system settings. */
      limit?: number;
      /** Filter by manufacturers. List of manufacturer identifiers separated by a `|`. */
      manufacturer?: string;
      /** Filters by a maximum product price. Has to be higher than the `min-price` filter. */
      "max-price"?: number;
      /** Filters by a minimum product price. Has to be lower than the `max-price` filter. */
      "min-price"?: number;
      /** Specifies the sorting of the products by `availableSortings`. If not set, the default sorting will be set according to the shop settings. The available sorting options are sent within the response under the `availableSortings` key. In order to sort by a field, consider using the `sort` parameter from the listing criteria. Do not use both parameters together, as it might lead to unexpected results. */
      order?: string;
      /** Search result page */
      p?: number;
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** Filters products by their properties. List of property identifiers separated by a `|`. */
      properties?: string;
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Filter products with a minimum average rating. */
      rating?: number;
      /** By sending the parameter `reduce-aggregations` , the post-filters that were applied by the customer, are also applied to the aggregations. This has the consequence that only values are returned in the aggregations that would lead to further filter results. This parameter is a flag, the value has no effect. */
      "reduce-aggregations"?: string | null;
      /** Filters products that are marked as shipping-free. */
      "shipping-free"?: boolean;
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    pathParams: {
      /** Identifier of the landing page. */
      landingPageId: string;
    };
    response: components["schemas"]["LandingPage"];
    responseCode: 200;
  };
  "readLandingPage post /landing-page/{landingPageId}": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    pathParams: {
      /** Identifier of the landing page. */
      landingPageId: string;
    };
    body: components["schemas"]["Criteria"] &
      ({
        /** Resolves only the given slot identifiers. The identifiers have to be seperated by a `|` character. */
        slots?: string;
      } & components["schemas"]["ProductListingCriteria"]);
    response: components["schemas"]["LandingPage"];
    responseCode: 200;
  };
  "readLanguagesGet get /language": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** Compressed and encoded criteria object. Format: base64url(gzip(json_encode(criteria))). This parameter allows passing complex criteria as a single encoded string instead of multiple query parameters. The criteria object should be JSON-encoded, then gzipped, and finally base64url-encoded. The criteria object structure is defined in the Criteria schema (see #/components/schemas/Criteria). */
      _criteria?: components["parameters"]["CompressedCriteria"];
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** Fields which should be returned in the search result. */
      "fields[]"?: components["parameters"]["criteriaFields"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page */
      limit?: components["parameters"]["criteriaLimit"];
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    response: {
      elements: components["schemas"]["Language"][];
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "readLanguages post /language": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    body?: components["schemas"]["Criteria"];
    response: {
      elements: components["schemas"]["Language"][];
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "readMediaGet get /media": {
    contentType?: "application/json";
    accept?: "application/json";
    query: {
      /** Identifier (UUID) of the media entity to be fetched. */
      "ids[]": string[];
    };
    response: components["schemas"]["Media"][];
    responseCode: 200;
  };
  "readMedia post /media": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** Identifier (UUID) of the media entity to be fetched. */
      ids: string[];
    };
    response: components["schemas"]["Media"][];
    responseCode: 200;
  };
  "readNavigationGet get /navigation/{activeId}/{rootId}": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to try and resolve SEO URLs for the given navigation item */
      "sw-include-seo-urls"?: boolean;
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** Compressed and encoded criteria object. Format: base64url(gzip(json_encode(criteria))). This parameter allows passing complex criteria as a single encoded string instead of multiple query parameters. The criteria object should be JSON-encoded, then gzipped, and finally base64url-encoded. The criteria object structure is defined in the NoneFieldsCriteria schema (see #/components/schemas/NoneFieldsCriteria). */
      _criteria?: components["parameters"]["CompressedNoneFieldsCriteria"];
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Return the categories as a tree or as a flat list. */
      buildTree?: GenericRecord[];
      /** Determines the depth of fetched navigation levels. */
      depth?: number;
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page */
      limit?: components["parameters"]["criteriaLimit"];
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    pathParams: {
      /** Identifier of the active category in the navigation tree (if not used, just set to the same as rootId). */
      activeId: string | components["schemas"]["NavigationType"];
      /** Identifier of the root category for your desired navigation tree. You can use it to fetch sub-trees of your navigation tree. */
      rootId: string | components["schemas"]["NavigationType"];
    };
    response: components["schemas"]["NavigationRouteResponse"];
    responseCode: 200;
  };
  "readNavigation post /navigation/{activeId}/{rootId}": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to try and resolve SEO URLs for the given navigation item */
      "sw-include-seo-urls"?: boolean;
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    pathParams: {
      /** Identifier of the active category in the navigation tree (if not used, just set to the same as rootId). */
      activeId: string | components["schemas"]["NavigationType"];
      /** Identifier of the root category for your desired navigation tree. You can use it to fetch sub-trees of your navigation tree. */
      rootId: string | components["schemas"]["NavigationType"];
    };
    body: components["schemas"]["NoneFieldsCriteria"] & {
      /** Return the categories as a tree or as a flat list. */
      buildTree?: GenericRecord[];
      /**
       * Format: int32
       * Determines the depth of fetched navigation levels.
       */
      depth?: number;
    };
    response: components["schemas"]["NavigationRouteResponse"];
    responseCode: 200;
  };
  "confirmNewsletter post /newsletter/confirm": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** Email hash parameter from the link in the confirmation mail */
      em: string;
      /** Hash parameter from link the in the confirmation mail */
      hash: string;
    };
    response: never;
    responseCode: 200;
  };
  "subscribeToNewsletter post /newsletter/subscribe": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** City */
      city?: string;
      /** Custom field data that should be added to the subscription. */
      customFields?: string;
      /** Email address that will receive the confirmation and the newsletter. */
      email: string;
      /** First name */
      firstName?: string;
      /** Identifier of the language. */
      languageId?: string;
      /** Last name */
      lastName?: string;
      /** Defines what should be done. */
      option: string;
      /** Identifier of the salutation. */
      salutationId?: string;
      /** Url of the storefront of the shop. This will be used for generating the link to the /newsletter/confirm inside the confirm email. */
      storefrontUrl: string;
      /** Street */
      street?: string;
      /** Zip code */
      tags?: string;
      /** Zip code */
      zipCode?: string;
    };
    response: never;
    responseCode: 200;
  };
  "unsubscribeToNewsletter post /newsletter/unsubscribe": {
    contentType?: "application/json";
    accept?: "application/json";
    body: {
      /** Email address that should be removed from the mailing lists. */
      email: string;
    };
    response: never;
    responseCode: 200;
  };
  "readOrder post /order": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    body: components["schemas"]["NoneFieldsCriteria"] & {
      /** Check if the payment method of the order is still changeable. */
      checkPromotion?: boolean;
      /**
       * Format: email
       * The email address of the customer. Pass this value to allow for guest user authentification. Not required, if a user (guest or not) is already logged in.
       */
      email?: string;
      /** Pass the deepLinkCode criteria filter to allow for guest user authentification. Not required, if a user (guest or not) is already logged in. */
      filter?: {
        /** @enum {string} */
        field: "deepLinkCode";
        /** @enum {string} */
        type: "equals";
        value: string;
      }[];
      /** If set and when handling a guest order, a context token will be returned in the response header with a logged-in session. */
      login?: boolean;
      /** The zip/postal code of the billing address of the customer. Pass this value to allow for guest user authentification. Not required, if a user (guest or not) is already logged in. */
      zipcode?: string;
    };
    response: components["schemas"]["OrderRouteResponse"];
    responseCode: 200;
  };
  "orderDownloadFile get /order/download/{orderId}/{downloadId}": {
    contentType?: "application/json";
    accept: "application/octet-stream";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    pathParams: {
      downloadId: string;
      orderId: string;
    };
    response: Blob;
    responseCode: 200;
  };
  "orderSetPayment post /order/payment": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    body: {
      /** The identifier of the order. */
      orderId: string;
      /** The identifier of the paymentMethod to be set */
      paymentMethodId: string;
    };
    response: components["schemas"]["SuccessResponse"];
    responseCode: 200;
  };
  "cancelOrder post /order/state/cancel": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    body: {
      /** The identifier of the order to be canceled. */
      orderId: string;
    };
    response: components["schemas"]["StateMachineState"];
    responseCode: 200;
  };
  "readPaymentMethodGet get /payment-method": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** Compressed and encoded criteria object. Format: base64url(gzip(json_encode(criteria))). This parameter allows passing complex criteria as a single encoded string instead of multiple query parameters. The criteria object should be JSON-encoded, then gzipped, and finally base64url-encoded. The criteria object structure is defined in the Criteria schema (see #/components/schemas/Criteria). */
      _criteria?: components["parameters"]["CompressedCriteria"];
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** Fields which should be returned in the search result. */
      "fields[]"?: components["parameters"]["criteriaFields"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page */
      limit?: components["parameters"]["criteriaLimit"];
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    response: {
      /** aggregation result */
      aggregations?: GenericRecord;
      elements?: components["schemas"]["PaymentMethod"][];
      /** Total amount */
      total?: number;
    };
    responseCode: 200;
  };
  "readPaymentMethod post /payment-method": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    body: components["schemas"]["Criteria"] & {
      /** List only available */
      onlyAvailable?: boolean;
    } & {
      /** List only available */
      onlyAvailable?: boolean;
    };
    response: {
      /** aggregation result */
      aggregations?: GenericRecord;
      elements?: components["schemas"]["PaymentMethod"][];
      /** Total amount */
      total?: number;
    };
    responseCode: 200;
  };
  "readProductGet get /product": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** Compressed and encoded criteria object. Format: base64url(gzip(json_encode(criteria))). This parameter allows passing complex criteria as a single encoded string instead of multiple query parameters. The criteria object should be JSON-encoded, then gzipped, and finally base64url-encoded. The criteria object structure is defined in the Criteria schema (see #/components/schemas/Criteria). */
      _criteria?: components["parameters"]["CompressedCriteria"];
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** Fields which should be returned in the search result. */
      "fields[]"?: components["parameters"]["criteriaFields"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page */
      limit?: components["parameters"]["criteriaLimit"];
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    response: {
      elements: components["schemas"]["Product"][];
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "readProduct post /product": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    body?: components["schemas"]["Criteria"];
    response: {
      elements: components["schemas"]["Product"][];
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "readProductExport get /product-export/{accessKey}/{fileName}": {
    contentType?: "application/json";
    accept?: "application/json";
    pathParams: {
      /** Access Key */
      accessKey: string;
      /** File Name */
      fileName: string;
    };
    response: never;
    responseCode: 200;
  };
  "readProductListingGet get /product-listing/{categoryId}": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Determines if the response must contain a SeoUrl entity for a product entity */
      "sw-include-seo-urls"?: boolean;
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** Fields which should be returned in the search result. */
      "fields[]"?: components["parameters"]["criteriaFields"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page. If not set, the limit will be set according to the default products per page, defined in the system settings. */
      limit?: number;
      /** Filter by manufacturers. List of manufacturer identifiers separated by a `|`. */
      manufacturer?: string;
      /** Filters by a maximum product price. Has to be higher than the `min-price` filter. */
      "max-price"?: number;
      /** Filters by a minimum product price. Has to be lower than the `max-price` filter. */
      "min-price"?: number;
      /** Resets all aggregations in the criteria. This parameter is a flag, the value has no effect. */
      "no-aggregations"?: components["parameters"]["noAggregations"];
      /** If this flag is set, no products are fetched. Sorting and associations are also ignored. This parameter is a flag, the value has no effect. */
      "only-aggregations"?: components["parameters"]["onlyAggregations"];
      /** Specifies the sorting of the products by `availableSortings`. If not set, the default sorting will be set according to the shop settings. The available sorting options are sent within the response under the `availableSortings` key. In order to sort by a field, consider using the `sort` parameter from the listing criteria. Do not use both parameters together, as it might lead to unexpected results. */
      order?: string;
      /** Search result page */
      p?: number;
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** Filters products by their properties. List of property identifiers separated by a `|`. */
      properties?: string;
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Filter products with a minimum average rating. */
      rating?: number;
      /** By sending the parameter `reduce-aggregations` , the post-filters that were applied by the customer, are also applied to the aggregations. This has the consequence that only values are returned in the aggregations that would lead to further filter results. This parameter is a flag, the value has no effect. */
      "reduce-aggregations"?: string | null;
      /** Filters products that are marked as shipping-free. */
      "shipping-free"?: boolean;
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    pathParams: {
      /** Identifier of a category. */
      categoryId: string;
    };
    response: components["schemas"]["ProductListingResult"];
    responseCode: 200;
  };
  "readProductListing post /product-listing/{categoryId}": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Determines if the response must contain a SeoUrl entity for a product entity */
      "sw-include-seo-urls"?: boolean;
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** The page number to fetch. */
      p?: number;
    };
    pathParams: {
      /** Identifier of a category. */
      categoryId: string;
    };
    body: components["schemas"]["ProductListingCriteria"] &
      components["schemas"]["ProductListingFlags"];
    response: components["schemas"]["ProductListingResult"];
    responseCode: 200;
  };
  "readProductDetailGet get /product/{productId}": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to try and resolve SEO URLs for the given navigation item */
      "sw-include-seo-urls"?: boolean;
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** Compressed and encoded criteria object. Format: base64url(gzip(json_encode(criteria))). This parameter allows passing complex criteria as a single encoded string instead of multiple query parameters. The criteria object should be JSON-encoded, then gzipped, and finally base64url-encoded. The criteria object structure is defined in the NoneFieldsCriteria schema (see #/components/schemas/NoneFieldsCriteria). */
      _criteria?: components["parameters"]["CompressedNoneFieldsCriteria"];
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page */
      limit?: components["parameters"]["criteriaLimit"];
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Instructs Shopware to skip loading the CMS page data */
      skipCmsPage?: boolean;
      /** Instructs Shopware to skip loading the configurator data */
      skipConfigurator?: boolean;
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    pathParams: {
      /** Product ID */
      productId: string;
    };
    response: components["schemas"]["ProductDetailResponse"];
    responseCode: 200;
  };
  "readProductDetail post /product/{productId}": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to try and resolve SEO URLs for the given navigation item */
      "sw-include-seo-urls"?: boolean;
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** Instructs Shopware to skip loading the CMS page data */
      skipCmsPage?: boolean;
      /** Instructs Shopware to skip loading the configurator data */
      skipConfigurator?: boolean;
    };
    pathParams: {
      /** Product ID */
      productId: string;
    };
    body?: components["schemas"]["NoneFieldsCriteria"];
    response: components["schemas"]["ProductDetailResponse"];
    responseCode: 200;
  };
  "readProductCrossSellingsGet get /product/{productId}/cross-selling": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to try and resolve SEO URLs for the given navigation item */
      "sw-include-seo-urls"?: boolean;
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    pathParams: {
      /** Product ID */
      productId: string;
    };
    response: components["schemas"]["CrossSellingElementCollection"];
    responseCode: 200;
  };
  "readProductCrossSellings post /product/{productId}/cross-selling": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to try and resolve SEO URLs for the given navigation item */
      "sw-include-seo-urls"?: boolean;
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    pathParams: {
      /** Product ID */
      productId: string;
    };
    response: components["schemas"]["CrossSellingElementCollection"];
    responseCode: 200;
  };
  "searchProductVariantIdsGet get /product/{productId}/find-variant": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query: {
      /** The options parameter for the variant to find. Array of option IDs. */
      "options[]": string[];
      /** The id of the option group that has been switched. */
      switchedGroup?: string;
    };
    pathParams: {
      /** Product ID */
      productId: string;
    };
    response: components["schemas"]["FindProductVariantRouteResponse"];
    responseCode: 200;
  };
  "searchProductVariantIds post /product/{productId}/find-variant": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    pathParams: {
      /** Product ID */
      productId: string;
    };
    body: {
      options:
        | string[]
        | {
            [key: string]: string;
          };
      /** The id of the option group that has been switched. */
      switchedGroup?: string;
    };
    response: components["schemas"]["FindProductVariantRouteResponse"];
    responseCode: 200;
  };
  "saveProductReview post /product/{productId}/review": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    pathParams: {
      /** Identifier of the product which is reviewed. */
      productId: string;
    };
    body: {
      /** The content of review. */
      content: string;
      /** The email address of the review author. If not set, the email of the customer is chosen. */
      email?: string;
      /** The name of the review author. If not set, the first name of the customer is chosen. */
      name?: string;
      /**
       * Format: double
       * The review rating for the product.
       */
      points: number;
      /** The title of the review. */
      title: string;
    };
    response: never;
    responseCode: 200;
  };
  "readProductReviewsGet get /product/{productId}/reviews": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** Compressed and encoded criteria object. Format: base64url(gzip(json_encode(criteria))). This parameter allows passing complex criteria as a single encoded string instead of multiple query parameters. The criteria object should be JSON-encoded, then gzipped, and finally base64url-encoded. The criteria object structure is defined in the Criteria schema (see #/components/schemas/Criteria). */
      _criteria?: components["parameters"]["CompressedCriteria"];
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** Fields which should be returned in the search result. */
      "fields[]"?: components["parameters"]["criteriaFields"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page */
      limit?: components["parameters"]["criteriaLimit"];
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    pathParams: {
      /** Identifier of the product. */
      productId: string;
    };
    response: {
      elements?: components["schemas"]["ProductReview"][];
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "readProductReviews post /product/{productId}/reviews": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    pathParams: {
      /** Identifier of the product. */
      productId: string;
    };
    body?: components["schemas"]["Criteria"];
    response: {
      elements?: components["schemas"]["ProductReview"][];
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "readSalutationGet get /salutation": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** Compressed and encoded criteria object. Format: base64url(gzip(json_encode(criteria))). This parameter allows passing complex criteria as a single encoded string instead of multiple query parameters. The criteria object should be JSON-encoded, then gzipped, and finally base64url-encoded. The criteria object structure is defined in the Criteria schema (see #/components/schemas/Criteria). */
      _criteria?: components["parameters"]["CompressedCriteria"];
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** Fields which should be returned in the search result. */
      "fields[]"?: components["parameters"]["criteriaFields"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page */
      limit?: components["parameters"]["criteriaLimit"];
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    response: {
      elements?: components["schemas"]["Salutation"][];
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "readSalutation post /salutation": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    body?: components["schemas"]["Criteria"];
    response: {
      elements?: components["schemas"]["Salutation"][];
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "getScriptStoreApiRoute get /script/{hook}":
    | {
        contentType?: "application/json";
        accept?: "application/json";
        pathParams: {
          /** Dynamic hook which used to build the hook name */
          hook: string;
        };
        response: {
          [key: string]: unknown;
        } | null;
        responseCode: 200;
      }
    | {
        contentType?: "application/json";
        accept: "application/vnd.api+json";
        pathParams: {
          /** Dynamic hook which used to build the hook name */
          hook: string;
        };
        response: {
          [key: string]: unknown;
        } | null;
        responseCode: 200;
      }
    | {
        contentType?: "application/json";
        accept?: "application/json";
        pathParams: {
          /** Dynamic hook which used to build the hook name */
          hook: string;
        };
        response: never;
        responseCode: 204;
      };
  "postScriptStoreApiRoute post /script/{hook}":
    | {
        contentType?: "application/json";
        accept?: "application/json";
        pathParams: {
          /** Dynamic hook which used to build the hook name */
          hook: string;
        };
        response: {
          [key: string]: unknown;
        } | null;
        responseCode: 200;
      }
    | {
        contentType?: "application/json";
        accept: "application/vnd.api+json";
        pathParams: {
          /** Dynamic hook which used to build the hook name */
          hook: string;
        };
        response: {
          [key: string]: unknown;
        } | null;
        responseCode: 200;
      }
    | {
        contentType?: "application/json";
        accept?: "application/json";
        pathParams: {
          /** Dynamic hook which used to build the hook name */
          hook: string;
        };
        response: never;
        responseCode: 204;
      };
  "searchPageGet get /search": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to try and resolve SEO URLs for the given navigation item */
      "sw-include-seo-urls"?: boolean;
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** Fields which should be returned in the search result. */
      "fields[]"?: components["parameters"]["criteriaFields"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page. If not set, the limit will be set according to the default products per page, defined in the system settings. */
      limit?: number;
      /** Filter by manufacturers. List of manufacturer identifiers separated by a `|`. */
      manufacturer?: string;
      /** Filters by a maximum product price. Has to be higher than the `min-price` filter. */
      "max-price"?: number;
      /** Filters by a minimum product price. Has to be lower than the `max-price` filter. */
      "min-price"?: number;
      /** Resets all aggregations in the criteria. This parameter is a flag, the value has no effect. */
      "no-aggregations"?: components["parameters"]["noAggregations"];
      /** If this flag is set, no products are fetched. Sorting and associations are also ignored. This parameter is a flag, the value has no effect. */
      "only-aggregations"?: components["parameters"]["onlyAggregations"];
      /** Specifies the sorting of the products by `availableSortings`. If not set, the default sorting will be set according to the shop settings. The available sorting options are sent within the response under the `availableSortings` key. In order to sort by a field, consider using the `sort` parameter from the listing criteria. Do not use both parameters together, as it might lead to unexpected results. */
      order?: string;
      /** Search result page */
      p?: number;
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** Filters products by their properties. List of property identifiers separated by a `|`. */
      properties?: string;
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Filter products with a minimum average rating. */
      rating?: number;
      /** By sending the parameter `reduce-aggregations` , the post-filters that were applied by the customer, are also applied to the aggregations. This has the consequence that only values are returned in the aggregations that would lead to further filter results. This parameter is a flag, the value has no effect. */
      "reduce-aggregations"?: string | null;
      /** Using the search parameter, the server performs a text search on all records based on their data model and weighting as defined in the entity definition using the SearchRanking flag. */
      search?: string;
      /** Filters products that are marked as shipping-free. */
      "shipping-free"?: boolean;
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    response: components["schemas"]["ProductListingResult"];
    responseCode: 200;
  };
  "searchPage post /search": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to try and resolve SEO URLs for the given navigation item */
      "sw-include-seo-urls"?: boolean;
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** The page number to fetch. */
      p?: number;
    };
    body: {
      /** Using the search parameter, the server performs a text search on all records based on their data model and weighting as defined in the entity definition using the SearchRanking flag. */
      search?: string;
    } & components["schemas"]["ProductListingCriteria"] &
      components["schemas"]["ProductListingFlags"];
    response: components["schemas"]["ProductListingResult"];
    responseCode: 200;
  };
  "searchSuggestGet get /search-suggest": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query: {
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** Fields which should be returned in the search result. */
      "fields[]"?: components["parameters"]["criteriaFields"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page. If not set, the limit will be set according to the default products per page, defined in the system settings. */
      limit?: number;
      /** Filter by manufacturers. List of manufacturer identifiers separated by a `|`. */
      manufacturer?: string;
      /** Filters by a maximum product price. Has to be higher than the `min-price` filter. */
      "max-price"?: number;
      /** Filters by a minimum product price. Has to be lower than the `max-price` filter. */
      "min-price"?: number;
      /** Resets all aggregations in the criteria. This parameter is a flag, the value has no effect. */
      "no-aggregations"?: components["parameters"]["noAggregations"];
      /** If this flag is set, no products are fetched. Sorting and associations are also ignored. This parameter is a flag, the value has no effect. */
      "only-aggregations"?: components["parameters"]["onlyAggregations"];
      /** Specifies the sorting of the products by `availableSortings`. If not set, the default sorting will be set according to the shop settings. The available sorting options are sent within the response under the `availableSortings` key. In order to sort by a field, consider using the `sort` parameter from the listing criteria. Do not use both parameters together, as it might lead to unexpected results. */
      order?: string;
      /** Search result page */
      p?: number;
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** Filters products by their properties. List of property identifiers separated by a `|`. */
      properties?: string;
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Filter products with a minimum average rating. */
      rating?: number;
      /** By sending the parameter `reduce-aggregations` , the post-filters that were applied by the customer, are also applied to the aggregations. This has the consequence that only values are returned in the aggregations that would lead to further filter results. This parameter is a flag, the value has no effect. */
      "reduce-aggregations"?: string | null;
      /** Using the search parameter, the server performs a text search on all records based on their data model and weighting as defined in the entity definition using the SearchRanking flag. */
      search: string;
      /** Filters products that are marked as shipping-free. */
      "shipping-free"?: boolean;
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    response: components["schemas"]["ProductListingResult"];
    responseCode: 200;
  };
  "searchSuggest post /search-suggest": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** The page number to fetch. */
      p?: number;
    };
    body: {
      /** Using the search parameter, the server performs a text search on all records based on their data model and weighting as defined in the entity definition using the SearchRanking flag. */
      search: string;
    } & components["schemas"]["ProductListingCriteria"] &
      components["schemas"]["ProductListingFlags"];
    response: components["schemas"]["ProductListingResult"];
    responseCode: 200;
  };
  "readSeoUrlGet get /seo-url": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** Compressed and encoded criteria object. Format: base64url(gzip(json_encode(criteria))). This parameter allows passing complex criteria as a single encoded string instead of multiple query parameters. The criteria object should be JSON-encoded, then gzipped, and finally base64url-encoded. The criteria object structure is defined in the Criteria schema (see #/components/schemas/Criteria). */
      _criteria?: components["parameters"]["CompressedCriteria"];
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** Fields which should be returned in the search result. */
      "fields[]"?: components["parameters"]["criteriaFields"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page */
      limit?: components["parameters"]["criteriaLimit"];
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    response: {
      elements: components["schemas"]["SeoUrl"][];
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "readSeoUrl post /seo-url": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    body?: components["schemas"]["Criteria"];
    response: {
      elements: components["schemas"]["SeoUrl"][];
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "readShippingMethodGet get /shipping-method": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** Compressed and encoded criteria object. Format: base64url(gzip(json_encode(criteria))). This parameter allows passing complex criteria as a single encoded string instead of multiple query parameters. The criteria object should be JSON-encoded, then gzipped, and finally base64url-encoded. The criteria object structure is defined in the Criteria schema (see #/components/schemas/Criteria). */
      _criteria?: components["parameters"]["CompressedCriteria"];
      "aggregations[]"?: components["parameters"]["criteriaAggregations"];
      associations?: components["parameters"]["criteriaAssociations"];
      /** Specify the fields that should be excluded from the response for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Note that the exclude fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      excludes?: components["parameters"]["criteriaExcludes"];
      /** Fields which should be returned in the search result. */
      "fields[]"?: components["parameters"]["criteriaFields"];
      /** List of filters to restrict the search result. For more information, see [Search Queries > Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#filter) */
      "filter[]"?: components["parameters"]["criteriaFilter"];
      /** Perform groupings over certain fields */
      "grouping[]"?: components["parameters"]["criteriaGrouping"];
      /** List of ids to search for */
      "ids[]"?: components["parameters"]["criteriaIds"];
      /** Specify the fields that should be returned for the given entities. Object key needs to be the entity name, and the list of fields needs to be the value. Fields will not be included, if they are also specified in the excludes. Note that the include fields will only be stripped on the API-Level, consider using the `fields` parameter for performance reasons. */
      includes?: components["parameters"]["criteriaIncludes"];
      /** Number of items per result page */
      limit?: components["parameters"]["criteriaLimit"];
      /** Search result page */
      page?: components["parameters"]["criteriaPage"];
      /** Filters that applied without affecting aggregations. For more information, see [Search Queries > Post Filter](https://shopware.stoplight.io/docs/store-api/docs/concepts/search-queries.md#post-filter) */
      "post-filter[]"?: components["parameters"]["criteriaPostFilter"];
      /** The query string to search for */
      query?: components["parameters"]["criteriaQuery"];
      /** Sorting in the search result. */
      "sort[]"?: components["parameters"]["criteriaSort"];
      /** Search term */
      term?: components["parameters"]["criteriaTerm"];
      "total-count-mode"?: components["parameters"]["criteriaTotalCountMode"];
    };
    response: {
      /** aggregation result */
      aggregations?: GenericRecord;
      elements: components["schemas"]["ShippingMethod"][];
      /** Total amount */
      total?: number;
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "readShippingMethod post /shipping-method": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Controls whether API search information is included in the response. Default is 1 (enabled), will be 0 (disabled) in the next major version. */
      "sw-include-search-info"?: "0" | "1";
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    query?: {
      /** List only available shipping methods. This filters shipping methods methods which can not be used in the actual context because of their availability rule. */
      onlyAvailable?: boolean;
    };
    body?: components["schemas"]["Criteria"];
    response: {
      /** aggregation result */
      aggregations?: GenericRecord;
      elements: components["schemas"]["ShippingMethod"][];
      /** Total amount */
      total?: number;
    } & components["schemas"]["EntitySearchResult"];
    responseCode: 200;
  };
  "shopbite.business-hour.get get /shopbite/business-hour": {
    contentType?: "application/json";
    accept?: "application/json";
    response: components["schemas"]["BusinessHourStruct"];
    responseCode: 200;
  };
  "shopbite.config.get get /shopbite/config": {
    contentType?: "application/json";
    accept?: "application/json";
    response: components["schemas"]["ShopBiteConfig"];
    responseCode: 200;
  };
  "shopbite.holiday.get get /shopbite/holiday": {
    contentType?: "application/json";
    accept?: "application/json";
    response: components["schemas"]["HolidayStruct"];
    responseCode: 200;
  };
  "shopbite.multi-channel-group.get get /shopbite/multi-channel-group": {
    contentType?: "application/json";
    accept?: "application/json";
    response: components["schemas"]["MultiChannelGroupStruct"];
    responseCode: 200;
  };
  "readSitemap get /sitemap": {
    contentType?: "application/json";
    accept?: "application/json";
    headers?: {
      /** Instructs Shopware to return the response in the given language. */
      "sw-language-id"?: string;
    };
    response: components["schemas"]["Sitemap"][];
    responseCode: 200;
  };
  "getSitemapFile get /sitemap/{filePath}":
    | {
        contentType?: "application/json";
        accept: "application/gzip";
        headers?: {
          /** Instructs Shopware to return the response in the given language. */
          "sw-language-id"?: string;
        };
        pathParams: {
          /** The path to the sitemap file */
          filePath: string;
        };
        response: Blob;
        responseCode: 200;
      }
    | {
        contentType?: "application/json";
        accept: "application/xml";
        headers?: {
          /** Instructs Shopware to return the response in the given language. */
          "sw-language-id"?: string;
        };
        pathParams: {
          /** The path to the sitemap file */
          filePath: string;
        };
        response: Blob;
        responseCode: 200;
      };
};
