/**
 * Identities are opaque strings chosen by the backend (Shopware: 32-hex
 * ids, Sylius: codes, memory adapter: slugs). The storefront compares them
 * and passes them back, it never parses or builds one.
 */
export type Id = string;
