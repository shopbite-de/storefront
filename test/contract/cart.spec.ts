import { runContract } from "./harness";
import { cartContract } from "./cart.contract";
import { memoryCart, shopwareCart } from "./cartFixtures";

runContract(cartContract, [memoryCart, shopwareCart]);
