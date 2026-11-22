import { runCustomerContract } from "./customer.contract";
import { memoryCustomer, shopwareCustomer } from "./customerFixtures";

runCustomerContract([memoryCustomer, shopwareCustomer]);
