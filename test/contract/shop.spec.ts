import { runContract } from "./harness";
import { memoryShop, shopwareShop } from "./fixtures";
import { shopContract } from "./shop.contract";

runContract(shopContract, [memoryShop, shopwareShop]);
