import { runContract } from "./harness";
import { checkoutContract } from "./checkout.contract";
import { memoryCheckout, shopwareCheckout } from "./fixtures";

runContract(checkoutContract, [memoryCheckout, shopwareCheckout]);
