export type AssociationItemProduct = {
  label: string;
  value: string;
  /** Identifies the extra in the quick view URL (#411). */
  productNumber?: string;
  price: string;
  unitPrice?: number;
  icon?: string;
};

export type AssociationItem = {
  label: string;
  products: AssociationItemProduct[];
};
