export interface Category {
  id?: string;
  name: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  active?: boolean;
  linkNewTab?: boolean;
  childCount?: number;
  translated?: {
    name?: string;
    description?: string;
    metaTitle?: string;
    metaDescription?: string;
    breadcrumb?: string[];
    seoUrl?: string;
  };
  seoUrl?: string;
  customFields?: Record<string, unknown> | null;
  media?: { url?: string };
  children?: Category[];
}

export interface Breadcrumb {
  name: string;
  path: string;
}

export interface SeoUrl {
  routeName?: string;
  foreignKey?: string;
}
