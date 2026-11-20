import type {
  Dish,
  DishDetail,
  Id,
  ListingQuery,
  MenuListing,
  MenuSection,
  Variant,
} from "../../shared/domain";

/**
 * Menu: the sections and dishes the restaurant offers. Shop-wide, no
 * visitor session (prices are the guest prices of the shop), so the BFF
 * caches the answers across visitors.
 *
 * Shopware: categories, products, variants (child products), properties
 * (main ingredients, diets, allergens), `productList` cross-sellings
 * (extras). Sylius: taxons, products, product variants and options,
 * product associations.
 */
export interface CatalogPort {
  /**
   * The menu: the top sections with their sub-sections, in menu order.
   * The adapter knows its menu root (Shopware: the plugin's menu category).
   */
  getMenu(): Promise<readonly MenuSection[]>;
  /** A section by id, with its sub-sections. Throws `not_found`. */
  getSection(sectionId: Id): Promise<MenuSection>;
  /**
   * One page of the dishes of a section, including its sub-sections.
   * Throws `not_found` for an unknown section and `invalid_value` for a
   * sorting the listing does not offer.
   */
  listDishes(sectionId: Id, query?: ListingQuery): Promise<MenuListing>;
  /** Dishes matching a text ("Suche"); an empty text finds nothing. */
  searchDishes(text: string, query?: ListingQuery): Promise<MenuListing>;
  /**
   * Every dish on the menu, without variants, for `llms.txt`. In no
   * particular order.
   */
  listMenuDishes(): Promise<readonly Dish[]>;
  /**
   * A dish by id, with what the dish sheet needs. The id of a variant
   * answers its dish with that variant selected. Throws `not_found`.
   */
  getDish(dishId: Id): Promise<DishDetail>;
  /**
   * A dish (or a variant: its dish with the variant selected) by menu
   * number, for deep links. Null if none.
   */
  findDishByNumber(number: string): Promise<DishDetail | null>;
  /**
   * The variant of a dish that has all these options: with one option per
   * variant group exactly that variant, with fewer the first variant (in
   * the dish's order) that has them. Null if none or for an unknown dish.
   */
  findVariant(dishId: Id, optionIds: readonly Id[]): Promise<Variant | null>;
  /** Dishes the restaurant marks as top sellers, for the home page. */
  listTopSellers(limit: number): Promise<readonly Dish[]>;
  /**
   * Dishes suggested on the confirmation step ("Dazu passt"), never a
   * parent with variants (one click cannot choose); a mark on a parent
   * suggests its variants. By name.
   */
  listUpsellDishes(limit: number): Promise<readonly Dish[]>;
}
