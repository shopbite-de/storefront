export interface PropertyGroupOption {
  id: string;
  name: string;
  translated: { name: string };
  group: {
    id: string;
    name: string;
    translated?: { name?: string };
  };
  media?: { url?: string };
}

export interface PropertyGroup {
  id: string;
  name: string;
  translated: { name: string; displayType?: string };
  displayType?: string;
  options?: PropertyGroupOption[];
}

export interface ProductConfiguratorSetting {
  option?: {
    id: string;
    name: string;
    translated?: { name?: string };
    group: {
      id: string;
      name: string;
      translated?: { name?: string };
    };
  };
}

export interface CrossSellingElement {
  crossSelling: { name: string };
  products: Product[];
}

export interface Product {
  id: string;
  name?: string;
  productNumber?: string;
  description?: string;
  type?: string;
  childCount?: number;
  parentId?: string | null;
  stock?: number;
  active?: boolean;
  available?: boolean;
  translated: {
    name?: string;
    description?: string;
  };
  calculatedPrice: {
    totalPrice: number;
    unitPrice: number;
  };
  cover?: {
    media?: {
      url?: string;
    };
  };
  sortedProperties?: PropertyGroup[];
  properties?: PropertyGroupOption[];
  options?: PropertyGroupOption[];
  seoCategory?: {
    name?: string;
  };
  children?: Product[];
}
