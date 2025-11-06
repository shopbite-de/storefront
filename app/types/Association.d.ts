export type AssociationItemProduct = {
  label: string;
  value: string;
  price: string;
  icon?: string;
};

export type AssociationItem = {
  label: string;
  products: AssociationItemProduct[];
};
