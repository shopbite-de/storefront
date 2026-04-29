export interface PaymentMethod {
  id: string;
  name: string;
  distinguishableName?: string;
  description?: string | null;
  media?: { url?: string };
}

export interface ShippingMethod {
  id: string;
  name: string;
  description?: string | null;
  media?: { url?: string };
}

export interface MethodsResponse<T> {
  methods: T[];
  selectedId: string | null;
}
