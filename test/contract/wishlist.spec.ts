import { runWishlistContract } from "./wishlist.contract";
import { memoryWishlist, shopwareWishlist } from "./wishlistFixtures";

runWishlistContract([memoryWishlist, shopwareWishlist]);
