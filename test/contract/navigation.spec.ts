import { runContract } from "./harness";
import { navigationContract } from "./navigation.contract";
import { memoryNavigation, shopwareNavigation } from "./navigationFixtures";

runContract(navigationContract, [memoryNavigation, shopwareNavigation]);
