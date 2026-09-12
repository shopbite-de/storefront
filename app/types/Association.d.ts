export type AssociationItemProduct = {
  label: string;
  value: string;
  price: string;
  unitPrice?: number;
  icon?: string;
};

export type AssociationItem = {
  label: string;
  products: AssociationItemProduct[];
};
