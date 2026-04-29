export interface OrderLineItemPrice {
  totalPrice: number;
  unitPrice: number;
  quantity: number;
}

export interface OrderLineItem {
  id: string;
  type: string;
  label: string;
  quantity: number;
  totalPrice: number;
  parentId: string | null;
  price: OrderLineItemPrice | null;
  children?: OrderLineItem[];
  payload?: Record<string, unknown>;
}

export interface OrderTransactionState {
  name: string;
  technicalName: string;
  translated?: { name?: string };
}

export interface OrderTransaction {
  id: string;
  paymentMethodId: string;
  stateMachineState?: OrderTransactionState;
}

export interface OrderDelivery {
  shippingMethod?: { name?: string };
}

export interface CalculatedTax {
  taxRate: number;
  tax: number;
}

export interface OrderPrice {
  totalPrice: number;
  netPrice: number;
  positionPrice: number;
  calculatedTaxes?: CalculatedTax[];
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  amountTotal: number;
  amountNet?: number;
  shippingTotal: number;
  price: OrderPrice;
  lineItems: OrderLineItem[];
  deliveries?: OrderDelivery[];
  status: string;
  transactions?: OrderTransaction[];
  customerComment?: string;
}
