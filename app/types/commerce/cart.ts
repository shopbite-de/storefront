export interface CartPrice {
  totalPrice: number;
  positionPrice: number;
  netPrice: number;
  taxStatus: string;
}

export interface LineItemPrice {
  totalPrice: number;
  unitPrice: number;
  quantity: number;
}

export interface LineItemOption {
  group: string;
  option: string;
}

export interface CartLineItem {
  id: string;
  type: string; // 'product' | 'container' | 'promotion' | 'discount'
  label: string;
  quantity: number;
  price: LineItemPrice | null;
  children?: CartLineItem[];
  payload?: {
    productNumber?: string;
    options?: LineItemOption[];
    code?: string;
    [key: string]: unknown;
  };
}

export interface CartPromotion {
  code: string;
  label: string;
}

export interface CartError {
  promotionCode?: string;
  translatedMessage?: string;
  [key: string]: unknown;
}

export interface Cart {
  lineItems: CartLineItem[];
  price: CartPrice;
  errors: Record<string, CartError>;
  promotionCodes: CartPromotion[];
  shippingTotal: number;
}

// Payload sent by the client when adding items — platform-agnostic shape
export interface AddCartItemPayload {
  id: string;
  type: string;
  quantity: number;
  referencedId?: string;
  label?: string;
  payload?: Record<string, unknown>;
  children?: AddCartItemPayload[];
}
