import type { Product } from "./product";

export interface ProductSorting {
  key: string;
  label: string;
  priority: number;
  translated: { key: string; label: string };
}

export interface ListingCurrentFilters {
  manufacturer: string[];
  navigationId: string;
  price: { max: number; min: number };
  properties: string[];
  rating: number | null;
  search?: string;
  "shipping-free": boolean;
}

export interface ProductListingResult {
  elements: Product[];
  availableSortings: ProductSorting[];
  currentFilters: ListingCurrentFilters;
  sorting?: string;
  aggregations?: unknown;
  total?: number;
  limit?: number;
  page?: number;
}

export interface ListingCriteria {
  order?: string;
  properties?: string;
  manufacturer?: string;
  query?: string;
  p?: number;
}
