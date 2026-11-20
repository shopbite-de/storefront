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
 * visitor session (prices are the guest prices of the shop).
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
  /** A section by id. Throws `not_found`. */
  getSection(sectionId: Id): Promise<MenuSection>;
  /** One page of the dishes of a section, including its sub-sections. */
  listDishes(sectionId: Id, query?: ListingQuery): Promise<MenuListing>;
  /** Dishes matching a text ("Suche"). */
  searchDishes(text: string, query?: ListingQuery): Promise<MenuListing>;
  /** A dish (or a variant) by id, with what the dish sheet needs. */
  getDish(dishId: Id): Promise<DishDetail>;
  /** A dish (or a variant) by menu number, for deep links. Null if none. */
  findDishByNumber(number: string): Promise<DishDetail | null>;
  /** The variant of a dish with exactly these options. Null if none. */
  findVariant(dishId: Id, optionIds: readonly Id[]): Promise<Variant | null>;
  /** Most ordered dishes, for the home page. */
  listTopSellers(limit: number): Promise<readonly Dish[]>;
  /** Dishes suggested on the confirmation step ("Dazu passt"), never parents. */
  listUpsellDishes(): Promise<readonly Dish[]>;
}
